import {DatabaseSync} from 'node:sqlite';
import {copyFileSync, existsSync} from 'node:fs';
import {initialState, validateState, blockersForSetup, createOccurrences, todayInZone, addDays} from './scheduling.mjs';

const clone = value => structuredClone(value);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;

function migrateLegacy(legacy) {
  const state=initialState();
  state.pods=clone(legacy.pods || state.pods);
  state.therapists=(legacy.therapists || state.therapists).map(t=>({id:t.id,pod:t.pod,name:t.name,capHours:Number(t.cap),active:true}));
  state.clients=(legacy.clients || state.clients).map(c=>({id:c.id,pod:c.pod,name:c.name,active:true,assigned:clone(c.assigned)}));
  state.rooms=clone(legacy.rooms || state.rooms);
  // The old template records were not a complete recurrence rule. Keep them as
  // source metadata while preserving each dated occurrence as a one-off.
  state.migration={legacyStanding:clone(legacy.standing || [])};
  state.sessions=(legacy.sessions || []).map((s,index)=>({id:`legacy-one-off-${index + 1}`,client:s.client,therapist:s.therapist,date:s.date,time:s.time,minutes:Number(s.minutes),location:s.location,room:s.location === 'home' ? null : s.room}));
  validateState(state); return state;
}

/** SQLite migration validates before write and retains a `.pre-s4.bak` rollback copy. */
export class ClinicStore {
  constructor(path=':memory:', seed=initialState()) {
    this.path=path; this.db=new DatabaseSync(path); this.db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS clinic (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)');
    const row=this.db.prepare('SELECT body FROM clinic WHERE id=1').get();
    if (!row) { const state=seed.schema === 2 ? clone(seed) : migrateLegacy(seed); validateState(state); this.db.prepare('INSERT INTO clinic(id,body) VALUES(1,?)').run(JSON.stringify(state)); }
    else this.migrateExisting(row.body);
    this.read();
  }
  migrateExisting(body) {
    if (JSON.parse(body).schema === 2) return;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // A second starter may have migrated after construction: read only after
      // acquiring the writer lock, then take a consistent rollback copy.
      const current=JSON.parse(this.db.prepare('SELECT body FROM clinic WHERE id=1').get().body);
      if (current.schema === 2) { this.db.exec('COMMIT'); return; }
      const migrated=migrateLegacy(current);
      if (this.path !== ':memory:' && existsSync(this.path)) { const backup=`${this.path}.pre-s4.bak`; if (!existsSync(backup)) copyFileSync(this.path, backup); }
      this.db.prepare('UPDATE clinic SET body=? WHERE id=1').run(JSON.stringify(migrated)); this.db.exec('COMMIT');
    } catch (error) { try {this.db.exec('ROLLBACK');} catch {} throw error; }
  }
  read() { return validateState(JSON.parse(this.db.prepare('SELECT body FROM clinic WHERE id=1').get().body)); }
  transaction(expectedRevision, mutate) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const state=this.read();
      if (!Number.isInteger(expectedRevision) || state.revision !== expectedRevision) throw new Error('This preview is stale. Refresh and preview the current schedule again.');
      const result=mutate(state); validateState(state); state.revision += 1;
      this.db.prepare('UPDATE clinic SET body=? WHERE id=1').run(JSON.stringify(state)); this.db.exec('COMMIT'); return {state:clone(state),result};
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  preview(request) { const state=this.read(); const candidate=clone(state); const before=new Map(state.sessions.map(s=>[s.id,JSON.stringify(s)])); this.applyRequest(candidate,request); validateState(candidate); const occurrences=candidate.sessions.filter(s=>before.get(s.id) !== JSON.stringify(s)); return {revision:state.revision, occurrences}; }
  commit(request, expectedRevision) { return this.transaction(expectedRevision, state => this.applyRequest(state,request)); }
  applyRequest(state, request) {
    const common={client:String(request.client||''),therapist:String(request.therapist||''),time:String(request.time||''),minutes:Number(request.minutes),location:String(request.location||'').toLowerCase(),room:request.location === 'home' ? null : String(request.room||'')};
    if (request.kind === 'one-off') { state.sessions.push({id:uid('oneoff'),...common,date:String(request.date||'')}); return; }
    if (request.kind === 'weekly') { const series={id:uid('series'),client:common.client,therapist:common.therapist,startDate:String(request.startDate||''),endDate:String(request.endDate||''),time:common.time,minutes:common.minutes,location:common.location,room:common.room}; state.series.push(series); state.sessions.push(...createOccurrences(state,{...request,...common},series.id)); return; }
    if (request.kind === 'edit-occurrence') return this.editOccurrence(state,request,common);
    if (request.kind === 'edit-future') return this.editFuture(state,request,common);
    if (request.kind === 'cancel-occurrence') return this.cancelOccurrence(state,request);
    if (request.kind === 'cancel-future') return this.cancelFuture(state,request);
    throw new Error('Unknown calendar action.');
  }
  editOccurrence(state, request, common) { const item=state.sessions.find(s=>s.id===request.occurrenceId); if (!item) throw new Error('Occurrence no longer exists.'); if (item.date < todayInZone(state.config.timezone) || String(request.date||item.date) < todayInZone(state.config.timezone)) throw new Error('Past occurrences remain unchanged.'); Object.assign(item,common,{date:String(request.date||item.date)}); }
  editFuture(state, request, common) {
    const selected=state.sessions.find(s=>s.id===request.occurrenceId); if (!selected) throw new Error('Occurrence no longer exists.'); if (selected.date < todayInZone(state.config.timezone)) throw new Error('Past occurrences remain unchanged.'); if (!selected.seriesId) return this.editOccurrence(state,request,common);
    const series=state.series.find(s=>s.id===selected.seriesId); if (!series) throw new Error('Series no longer exists.');
    const nextStart=String(request.date||selected.date), nextEnd=String(request.endDate||series.endDate); if(nextStart<todayInZone(state.config.timezone)||nextEnd<nextStart) throw new Error('Past occurrences remain unchanged and the end date must follow the new start.');
    const successor={id:uid('series'),client:common.client,therapist:common.therapist,startDate:nextStart,endDate:nextEnd,time:common.time,minutes:common.minutes,location:common.location,room:common.room};
    state.sessions=state.sessions.filter(s=>s.seriesId!==series.id || s.date<selected.date);
    series.endDate=addDays(selected.date,-7); state.series.push(successor); state.sessions.push(...createOccurrences(state,successor,successor.id));
  }
  cancelOccurrence(state, request) { const item=state.sessions.find(s=>s.id===request.occurrenceId); if(!item) throw new Error('Occurrence no longer exists.'); if(item.date<todayInZone(state.config.timezone)) throw new Error('Past occurrences remain unchanged.'); state.sessions=state.sessions.filter(s=>s.id!==item.id); }
  cancelFuture(state, request) { const item=state.sessions.find(s=>s.id===request.occurrenceId); if(!item) throw new Error('Occurrence no longer exists.'); if(!item.seriesId) return this.cancelOccurrence(state,request); if(item.date<todayInZone(state.config.timezone)) throw new Error('Past occurrences remain unchanged.'); state.sessions=state.sessions.filter(s=>s.seriesId!==item.seriesId || s.date<item.date); const series=state.series.find(s=>s.id===item.seriesId); if(series) series.endDate=addDays(item.date,-7); }
  updateSetup(next, expectedRevision) { return this.transaction(expectedRevision, state => { const after=clone(next); after.schema=2; after.revision=state.revision; if (JSON.stringify(after.sessions) !== JSON.stringify(state.sessions) || JSON.stringify(after.series) !== JSON.stringify(state.series)) throw new Error('Setup cannot alter committed bookings. Reschedule or cancel them through Calendar.'); const structural=clone(after); structural.sessions=[]; structural.series=[]; validateState(structural); const blockers=blockersForSetup(state,after); if (blockers.length) throw new Error(`Setup change is blocked by committed bookings: ${blockers.join('; ')}`); validateState(after); Object.assign(state,after); }); }
  close() { this.db.close(); }
}

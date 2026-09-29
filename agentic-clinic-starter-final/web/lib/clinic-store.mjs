import pg from 'pg';
import {
  initialState, validateState, blockersForSetup, createOccurrences,
  todayInZone, addDays, datesWeekly, localInstant, leaveInterval, blockingLeaveConflicts, draftCandidate, draftIssues, boundedResolutionProposal
} from './scheduling.mjs';

const clone = (value) => structuredClone(value);
const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const migration = `
CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS clinic_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  body jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);`;

/** PostgreSQL-only committed scheduling store. No caller can write a snapshot. */
export class PostgresClinicStore {
  constructor(connectionString = process.env.DATABASE_URL, actor = null) {
    if (!connectionString) throw new Error('DATABASE_URL is not configured.');
    this.pool = new pg.Pool({ connectionString, max: 8, connectionTimeoutMillis: 3000, statement_timeout: 8000 });
    this.actor = actor;
  }

  async migrate(seed = initialState()) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(918273645)");
      await client.query(migration);
      await client.query('INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING');
      const existing = await client.query('SELECT 1 FROM clinic_state WHERE id=true');
      if (!existing.rowCount) {
        validateState(seed);
        await client.query('INSERT INTO clinic_state(id, revision, body) VALUES(true, 0, $1::jsonb)', [JSON.stringify(seed)]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async read() {
    await this.migrate();
    const result = await this.pool.query('SELECT revision, body FROM clinic_state WHERE id=true');
    if (!result.rowCount) throw new Error('Clinic state was not initialized.');
    const state = result.rows[0].body;
    state.revision = Number(result.rows[0].revision);
    return validateState(state);
  }

  async transaction(expectedRevision, mutate) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      if (this.actor) {
        const access = await client.query('SELECT role, "podId" FROM "user" WHERE id=$1 FOR SHARE', [this.actor.id]);
        if (access.rows[0]?.role !== 'admin' || access.rows[0]?.podId !== this.actor.podId) throw new Error('Admin pod access changed. Refresh and sign in again if needed.');
      }
      const result = await client.query('SELECT revision, body FROM clinic_state WHERE id=true FOR UPDATE');
      if (!result.rowCount) throw new Error('Clinic state was not initialized.');
      const state = result.rows[0].body;
      state.revision = Number(result.rows[0].revision);
      if (!Number.isInteger(expectedRevision) || state.revision !== expectedRevision) throw new Error('This preview is stale. Refresh and preview the current schedule again.');
      validateState(state);
      const output = await mutate(state);
      validateState(state);
      state.revision += 1;
      await client.query('UPDATE clinic_state SET revision=$1, body=$2::jsonb, updated_at=now() WHERE id=true', [state.revision, JSON.stringify(state)]);
      await client.query('COMMIT');
      return { state: clone(state), result: output };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      if (error?.code === '40001') throw new Error('The schedule changed at the same time. Refresh and preview again.');
      throw error;
    } finally { client.release(); }
  }

  async preview(request) {
    const state = await this.read();
    this.requireNoDraftForRequest(state,request);
    this.requireNoOutstandingConflicts(state,request);
    const candidate = clone(state);
    const before = new Map(candidate.sessions.map((s) => [s.id, JSON.stringify(s)]));
    this.applyRequest(candidate, request);
    validateState(candidate);
    this.rejectNewLeaveConflicts(candidate, before);
    return { revision: state.revision, occurrences: candidate.sessions.filter((s) => before.get(s.id) !== JSON.stringify(s)), removed: state.sessions.filter((s) => !candidate.sessions.some((next) => next.id === s.id)) };
  }

  async commit(request, revision) { return this.transaction(revision, (state) => {
    this.requireNoDraftForRequest(state,request);
    this.requireNoOutstandingConflicts(state,request);
    const oldSessions=clone(state.sessions);
    const before = new Map(state.sessions.map((s) => [s.id, JSON.stringify(s)]));
    const result = this.applyRequest(state, request);
    this.rejectNewLeaveConflicts(state, before);
    this.createNotificationTasks(state,oldSessions,state.sessions);
    return result;
  }); }

  requestPod(state,request) {
    const session=state.sessions.find((item)=>item.id===request.occurrenceId);
    return state.clients.find((item)=>item.id===(session?.client||request.client))?.pod;
  }

  requireNoOutstandingConflicts(state,request) {
    const pod=this.requestPod(state,request);
    if (blockingLeaveConflicts(state).some((issue)=>state.clients.find((item)=>item.id===issue.session.client)?.pod===pod)) throw new Error('Outstanding schedule conflicts must be resolved together before committing schedule changes.');
  }

  requireNoDraftForRequest(state,request) {
    const pod=this.requestPod(state,request);
    if (pod&&state.drafts.some((draft)=>draft.pod===pod)) throw new Error('This pod has a shared schedule draft. Edit and commit or discard that draft in Calendar first.');
  }

  createNotificationTasks(state,beforeSessions,afterSessions) {
    const before=new Map(beforeSessions.map((session)=>[session.id,session]));
    const after=new Map(afterSessions.map((session)=>[session.id,session]));
    for (const id of new Set([...before.keys(),...after.keys()])) {
      const old=before.get(id), next=after.get(id);
      if (JSON.stringify(old)===JSON.stringify(next)) continue;
      const owner=state.clients.find((client)=>client.id===(next||old).client);
      if (!owner) continue;
      const recipients=new Map();
      recipients.set(`client:${owner.id}`,{recipientRole:'client',recipientId:owner.id});
      for (const session of [old,next]) if (session) recipients.set(`therapist:${session.therapist}`,{recipientRole:'therapist',recipientId:session.therapist});
      const changeType=!old?'added':!next?'cancelled':'changed';
      const details=(session)=>session?{date:session.date,time:session.time,minutes:session.minutes,location:session.location,room:session.room,roomName:session.location==='clinic'?state.rooms.find((room)=>room.id===session.room)?.name||session.room:null,client:session.client,therapist:session.therapist}:null;
      for (const recipient of recipients.values()) state.notifications.push({id:uid('notification'),pod:owner.pod,sessionId:id,changeType,...recipient,before:details(old),after:details(next),status:'pending',createdAt:new Date().toISOString()});
    }
  }

  rejectNewLeaveConflicts(state, before) {
    const affected = blockingLeaveConflicts(state).filter(({ session }) => before.get(session.id) !== JSON.stringify(session));
    if (affected.length) throw new Error('The proposed session overlaps recorded therapist leave. Resolve the leave conflict first.');
  }

  async recordLeave(request, revision) {
    return this.transaction(revision, (state) => {
      const therapist = state.therapists.find((item) => item.id === String(request.therapist || '') && item.active);
      if (!therapist) throw new Error('Choose an active therapist.');
      if (state.drafts.some((draft) => draft.pod === therapist.pod)) throw new Error('Commit or discard this pod’s shared schedule draft before recording more leave.');
      const leave = { id: uid('leave'), pod: therapist.pod, therapist: therapist.id,
        startDate: String(request.startDate || ''), startTime: String(request.startTime || ''),
        endDate: String(request.endDate || ''), endTime: String(request.endTime || '') };
      leaveInterval(leave, state.config);
      if (state.leaves.some((item) => item.therapist === leave.therapist && item.startDate === leave.startDate && item.startTime === leave.startTime && item.endDate === leave.endDate && item.endTime === leave.endTime)) throw new Error('This leave is already recorded.');
      state.leaves.push(leave);
      return leave;
    });
  }

  async amendLeave(pod, leaveId, request, revision) {
    return this.transaction(revision, (state) => {
      if (state.drafts.some((draft)=>draft.pod===pod)) throw new Error('Commit or discard this pod’s shared schedule draft before changing recorded leave.');
      const leave=state.leaves.find((item)=>item.id===leaveId&&item.pod===pod);
      if (!leave) throw new Error('Recorded leave was not found in this pod.');
      const updated={...leave,startDate:String(request.startDate||''),startTime:String(request.startTime||''),endDate:String(request.endDate||''),endTime:String(request.endTime||'')};
      leaveInterval(updated,state.config);
      if (state.leaves.some((item)=>item.id!==leave.id&&item.therapist===leave.therapist&&item.startDate===updated.startDate&&item.startTime===updated.startTime&&item.endDate===updated.endDate&&item.endTime===updated.endTime)) throw new Error('This leave is already recorded.');
      Object.assign(leave,updated);
      return clone(leave);
    });
  }

  async withdrawLeave(pod, leaveId, revision) {
    return this.transaction(revision, (state) => {
      if (state.drafts.some((draft)=>draft.pod===pod)) throw new Error('Commit or discard this pod’s shared schedule draft before changing recorded leave.');
      const index=state.leaves.findIndex((item)=>item.id===leaveId&&item.pod===pod);
      if (index<0) throw new Error('Recorded leave was not found in this pod.');
      const [removed]=state.leaves.splice(index,1);
      return {leaveId:removed.id};
    });
  }

  async beginDraft(pod, revision) {
    const current = await this.read();
    const existing = current.drafts.find((draft) => draft.pod === pod);
    if (existing) return { state: current, result: existing };
    return this.transaction(revision, (state) => {
      if (!state.pods.some((item) => item.id === pod)) throw new Error('Choose a valid pod.');
      if (state.drafts.some((draft) => draft.pod === pod)) throw new Error('This pod already has a shared schedule draft.');
      const draft = { id: uid('draft'), pod, changes: [], autoResolveRun: false };
      state.drafts.push(draft);
      return draft;
    });
  }

  async discardDraft(pod, revision) {
    return this.transaction(revision, (state) => {
      const index = state.drafts.findIndex((draft) => draft.pod === pod);
      if (index < 0) throw new Error('This pod has no schedule draft to discard.');
      const [discarded] = state.drafts.splice(index, 1);
      return { draftId: discarded.id };
    });
  }

  async handleNotification(pod, taskId, revision) {
    return this.transaction(revision, (state) => {
      const task=state.notifications.find((item)=>item.id===taskId&&item.pod===pod);
      if (!task) throw new Error('Notification task was not found in this pod.');
      if (task.status!=='pending') throw new Error('Notification task has already been handled.');
      task.status='handled';
      task.handledAt=new Date().toISOString();
      return {taskId:task.id,status:task.status};
    });
  }

  async previewAutoResolve(pod, revision) {
    return this.transaction(revision, (state) => {
      if (!state.pods.some((item) => item.id === pod)) throw new Error('Choose a valid pod.');
      let draft = state.drafts.find((item) => item.pod === pod);
      if (draft?.autoResolveRun) throw new Error('Auto resolve has already run for this draft. Commit or discard the draft before running it again.');
      if (!draft) { draft = { id: uid('draft'), pod, changes: [], autoResolveRun: false }; state.drafts.push(draft); }
      const plan = boundedResolutionProposal(state, pod);
      draft.autoResolveRun = true;
      draft.proposal = { ...plan, sourceRevision: state.revision + 1 };
      return clone(draft.proposal);
    });
  }

  async applyAutoResolve(pod, revision) {
    return this.transaction(revision, (state) => {
      const draft = state.drafts.find((item) => item.pod === pod);
      if (!draft?.proposal) throw new Error('There is no Auto resolve proposal to apply.');
      if (draft.proposal.sourceRevision !== state.revision) throw new Error('The proposal is stale. Discard the suggestions and continue editing this draft manually.');
      draft.changes = clone(draft.proposal.allDraftChanges);
      const applied = clone(draft.proposal.proposed);
      delete draft.proposal;
      return { draftId: draft.id, applied };
    });
  }

  async discardAutoResolve(pod, revision) {
    return this.transaction(revision, (state) => {
      const draft = state.drafts.find((item) => item.pod === pod);
      if (!draft?.proposal) throw new Error('There is no Auto resolve proposal to discard.');
      delete draft.proposal;
      return { draftId: draft.id, suggestionsDiscarded: true };
    });
  }

  async stageDraftAdd(pod, request, revision) {
    return this.transaction(revision, (state) => {
      const client = state.clients.find((item)=>item.id===String(request.client||'')&&item.pod===pod&&item.active);
      if (!client) throw new Error('Choose an active client in this pod.');
      const therapist = state.therapists.find((item)=>item.id===String(request.therapist||'')&&item.active&&client.assigned.includes(item.id));
      if (!therapist) throw new Error('Choose one of this client’s active ranked therapists.');
      if (!['one-off','weekly'].includes(request.kind)) throw new Error('Choose one session or a weekly series.');
      const date = String(request.date||request.startDate||''), time = String(request.time||'');
      localInstant(date,time,state.config.timezone);
      if (this.isPastOccurrence(date,time,state.config.timezone)) throw new Error('Past occurrences remain unchanged.');
      const minutes=Number(request.minutes);
      if (!Number.isInteger(minutes)||minutes<1||minutes>480) throw new Error('Duration must be between 1 and 480 minutes.');
      const location=String(request.location||'');
      if (!['clinic','home'].includes(location)) throw new Error('Choose Clinic or Home.');
      const room=location==='home'?null:String(request.room||'');
      if (location==='clinic'&&!state.rooms.some((item)=>item.id===room&&item.active)) throw new Error('Choose an active shared room.');
      let draft=state.drafts.find((item)=>item.pod===pod);
      if (draft?.proposal) throw new Error('Apply or discard the Auto resolve suggestions before manually editing this draft.');
      if (!draft) { draft={id:uid('draft'),pod,changes:[],autoResolveRun:false}; state.drafts.push(draft); }
      const common={client:client.id,therapist:therapist.id,time,minutes,location,room};
      let additions;
      if (request.kind==='weekly') {
        const endDate=String(request.endDate||'');
        this.assertReasonableSpan(date,endDate);
        const series={id:uid('series'),...common,startDate:date,endDate};
        additions=createOccurrences(state,series,series.id).map((session)=>({kind:'add',sessionId:session.id,session,series}));
      } else {
        const session={id:uid('oneoff'),...common,date};
        additions=[{kind:'add',sessionId:session.id,session}];
      }
      draft.changes.push(...additions);
      return {draftId:draft.id,added:additions.map((item)=>item.sessionId)};
    });
  }

  async stageDraftChange(pod, change, revision) {
    return this.transaction(revision, (state) => {
      if (!state.pods.some((item) => item.id === pod)) throw new Error('Choose a valid pod.');
      const added = state.drafts.find((item)=>item.pod===pod)?.changes.find((item)=>item.kind==='add'&&item.sessionId===String(change.sessionId||''));
      const session = state.sessions.find((item) => item.id === String(change.sessionId || '')) || added?.session;
      const client = state.clients.find((item) => item.id === session?.client);
      if (!session || client?.pod !== pod) throw new Error('Choose a committed session in this pod.');
      if (this.isPastOccurrence(session.date, session.time, state.config.timezone)) throw new Error('Past occurrences remain unchanged.');
      if (!['cancel', 'assign', 'reschedule'].includes(change.kind)) throw new Error('Choose cancellation, therapist reassignment, or rescheduling.');
      if (['assign','reschedule'].includes(change.kind) && !client.assigned.includes(String(change.therapist || ''))) throw new Error('Choose one of the client’s ranked therapists.');
      if (change.kind === 'reschedule') {
        localInstant(String(change.date || ''), String(change.time || ''), state.config.timezone);
        if (this.isPastOccurrence(change.date, change.time, state.config.timezone)) throw new Error('Past occurrences remain unchanged.');
        if (!Number.isInteger(change.minutes) || change.minutes < 1 || change.minutes > 480) throw new Error('Duration must be between 1 and 480 minutes.');
        if (!['clinic','home'].includes(change.location)) throw new Error('Choose Clinic or Home.');
        if (change.location === 'clinic' && !state.rooms.some((item) => item.id === change.room && item.active)) throw new Error('Choose an active shared room.');
      }
      if (added) {
        const draft=state.drafts.find((item)=>item.pod===pod);
        if (draft.proposal) throw new Error('Apply or discard the Auto resolve suggestions before manually editing this draft.');
        if (change.kind==='cancel') draft.changes=draft.changes.filter((item)=>item.sessionId!==session.id);
        else if (change.kind==='assign') added.session.therapist=String(change.therapist);
        else Object.assign(added.session,{therapist:String(change.therapist),date:String(change.date),time:String(change.time),minutes:change.minutes,location:change.location,room:change.location==='home'?null:String(change.room)});
        return {draftId:draft.id,changes:clone(draft.changes)};
      }
      let draft = state.drafts.find((item) => item.pod === pod);
      if (!draft) { draft = { id: uid('draft'), pod, changes: [], autoResolveRun: false }; state.drafts.push(draft); }
      if (draft.proposal) throw new Error('Apply or discard the Auto resolve suggestions before manually editing this draft.');
      const previous = draft.changes.find((item) => item.sessionId === session.id);
      draft.changes = draft.changes.filter((item) => item.sessionId !== session.id);
      if (change.kind === 'cancel') draft.changes.push({ kind: 'cancel', sessionId: session.id });
      if (change.kind === 'assign' && previous?.kind === 'reschedule') draft.changes.push({...previous,therapist:String(change.therapist)});
      else if (change.kind === 'assign' && change.therapist !== session.therapist) draft.changes.push({ kind: 'assign', sessionId: session.id, therapist: String(change.therapist) });
      if (change.kind === 'reschedule') {
        const next={kind:'reschedule',sessionId:session.id,therapist:String(change.therapist),date:String(change.date),time:String(change.time),minutes:change.minutes,location:change.location,room:change.location==='home'?null:String(change.room)};
        if (Object.keys(next).every((key)=>['kind','sessionId'].includes(key)||next[key]===session[key])) {
          // Returning to the committed values clears this session's draft decision.
        } else draft.changes.push(next);
      }
      return { draftId: draft.id, changes: clone(draft.changes) };
    });
  }

  /** Revert one staged change (even for a session that has since started). Other staged changes are kept; a pending proposal goes stale via the revision bump. */
  async removeDraftChange(pod, sessionId, revision) {
    return this.transaction(revision, (state) => {
      if (!state.pods.some((item) => item.id === pod)) throw new Error('Choose a valid pod.');
      const draft = state.drafts.find((item) => item.pod === pod);
      const index = draft ? draft.changes.findIndex((item) => item.sessionId === sessionId) : -1;
      if (index < 0) throw new Error('This staged change is no longer in the draft.');
      const [removed] = draft.changes.splice(index, 1);
      return { draftId: draft.id, removed: clone(removed), changes: clone(draft.changes) };
    });
  }

  async commitDraft(pod, revision) {
    return this.transaction(revision, (state) => {
      const draft = state.drafts.find((item) => item.pod === pod);
      if (!draft || !draft.changes.length) throw new Error('This pod has no schedule changes to commit.');
      if (draft.proposal) throw new Error('Apply or discard the Auto resolve suggestions before committing the draft.');
      for (const change of draft.changes) {
        const original=state.sessions.find((item)=>item.id===change.sessionId);
        const session=original||change.session;
        if (!session || this.isPastOccurrence(session.date,session.time,state.config.timezone) || (change.kind==='reschedule'&&this.isPastOccurrence(change.date,change.time,state.config.timezone))) throw new Error('A drafted session has already started. Remove that change and recheck the draft before committing.');
      }
      const issues = draftIssues(state, pod);
      if (issues.length) throw new Error(`${issues.length} outstanding schedule conflict${issues.length === 1 ? '' : 's'} must be resolved before commit.`);
      const { candidate, stale } = draftCandidate(state, pod);
      if (stale.length) throw new Error('The shared schedule draft contains a changed or removed session. Recheck it.');
      validateState(candidate);
      const oldSessions=clone(state.sessions);
      state.sessions = candidate.sessions;
      state.series = candidate.series;
      this.createNotificationTasks(state,oldSessions,state.sessions);
      state.drafts = state.drafts.filter((item) => item.id !== draft.id);
      return { committed: clone(draft.changes), draftId: draft.id };
    });
  }

  applyRequest(state, request) {
    const common = { client: String(request.client || ''), therapist: String(request.therapist || ''), time: String(request.time || ''), minutes: Number(request.minutes), location: String(request.location || '').toLowerCase(), room: String(request.location || '').toLowerCase() === 'home' ? null : String(request.room || '') };
    if (request.kind === 'one-off') {
      const date=String(request.date || '');
      localInstant(date,common.time,state.config.timezone);
      if (this.isPastOccurrence(date,common.time,state.config.timezone)) throw new Error('Past occurrences remain unchanged.');
      state.sessions.push({ id: uid('oneoff'), ...common, date }); return;
    }
    if (request.kind === 'weekly') {
      const startDate=String(request.startDate || ''),endDate=String(request.endDate || '');
      localInstant(startDate,common.time,state.config.timezone);
      if (this.isPastOccurrence(startDate,common.time,state.config.timezone)) throw new Error('Past occurrences remain unchanged.');
      this.assertReasonableSpan(startDate,endDate);
      const series = { id: uid('series'), ...common, startDate, endDate };
      state.series.push(series); state.sessions.push(...createOccurrences(state, series, series.id)); return;
    }
    const item = state.sessions.find((session) => session.id === request.occurrenceId);
    if (!item) throw new Error('Occurrence no longer exists.');
    if (['edit-occurrence','edit-future'].includes(request.kind)) {
      const originalPod=state.clients.find((client)=>client.id===item.client)?.pod;
      const requestedPod=state.clients.find((client)=>client.id===common.client)?.pod;
      if (!requestedPod || requestedPod!==originalPod) throw new Error('A session cannot move to another pod. Choose a client in the original pod.');
    }
    const today = todayInZone(state.config.timezone);
    if (this.isPastOccurrence(item.date, item.time, state.config.timezone, today)) throw new Error('Past occurrences remain unchanged.');
    if (request.kind === 'cancel-occurrence') { state.sessions = state.sessions.filter((session) => session.id !== item.id); return; }
    if (request.kind === 'cancel-future') { if (!item.seriesId) { state.sessions = state.sessions.filter((session) => session.id !== item.id); return; } state.sessions = state.sessions.filter((session) => session.seriesId !== item.seriesId || session.date < item.date); const series = state.series.find((value) => value.id === item.seriesId); if (series) series.endDate = addDays(item.date, -7); return; }
    if (request.kind === 'edit-occurrence') { const date = String(request.date || item.date), time = String(request.time || item.time); if (this.isPastOccurrence(date, time, state.config.timezone, today)) throw new Error('Past occurrences remain unchanged.'); Object.assign(item, common, { date }); return; }
    if (request.kind === 'edit-future') {
      if (!item.seriesId) { const date=String(request.date || item.date), time=String(request.time || item.time); if (this.isPastOccurrence(date,time,state.config.timezone,today)) throw new Error('Past occurrences remain unchanged.'); Object.assign(item, common, { date }); return; }
      const old = state.series.find((value) => value.id === item.seriesId);
      const startDate = String(request.date || item.date), endDate = String(request.endDate || old.endDate);
      if (this.isPastOccurrence(startDate, common.time, state.config.timezone, today) || endDate < startDate) throw new Error('Past occurrences remain unchanged and the end date must follow the new start.');
      this.assertReasonableSpan(startDate, endDate);
      state.sessions = state.sessions.filter((session) => session.seriesId !== old.id || session.date < item.date);
      old.endDate = addDays(item.date, -7);
      const successor = { id: uid('series'), ...common, startDate, endDate };
      state.series.push(successor); state.sessions.push(...createOccurrences(state, successor, successor.id)); return;
    }
    throw new Error('Unknown calendar action.');
  }

  assertReasonableSpan(startDate, endDate) {
    const start = Date.parse(`${startDate}T00:00:00Z`), end = Date.parse(`${endDate}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return datesWeekly(startDate, endDate);
    if (end - start > 103 * 7 * 86400000) throw new Error('Weekly series cannot exceed 104 occurrences.');
    return datesWeekly(startDate, endDate);
  }

  isPastOccurrence(date, time, zone, today = todayInZone(zone)) {
    return date < today || (date === today && localInstant(date, time, zone) < Date.now());
  }

  async updateSetup(next, revision) {
    return this.transaction(revision, (state) => {
      const after = clone(next); delete after.conflicts; delete after.draftIssues; after.schema = 2; after.revision = state.revision;
      if (JSON.stringify(after.leaves) !== JSON.stringify(state.leaves)) throw new Error('Setup cannot alter recorded leave.');
      if (JSON.stringify(after.drafts) !== JSON.stringify(state.drafts)) throw new Error('Setup cannot alter shared schedule drafts.');
      if (JSON.stringify(after.notifications) !== JSON.stringify(state.notifications)) throw new Error('Setup cannot alter notification tasks.');
      if (state.config.timezone !== after.config.timezone && state.drafts.length) throw new Error('Timezone cannot change while shared schedule drafts are open. Commit or discard them first.');
      if (state.config.timezone !== after.config.timezone && state.leaves.length) throw new Error('Timezone cannot change while recorded leave exists.');
      if (JSON.stringify(after.sessions) !== JSON.stringify(state.sessions) || JSON.stringify(after.series) !== JSON.stringify(state.series)) throw new Error('Setup cannot alter committed bookings. Use Calendar to reschedule or cancel them.');
      const structural = clone(after); structural.sessions = []; structural.series = []; validateState(structural);
      const blockers = blockersForSetup(state, after);
      if (blockers.length) throw new Error(`Setup change is blocked by committed bookings: ${blockers.join('; ')}`);
      validateState(after); Object.assign(state, after);
    });
  }

  async report(therapist, month) {
    const state = await this.read();
    const staff = state.therapists.find((item) => item.id === therapist);
    if (!staff) throw new Error('Unknown staff member.');
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Month must use YYYY-MM.');
    const sessions = state.sessions.filter((item) => item.therapist === therapist && item.date.startsWith(month)).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)).map((item) => ({
      ...item,
      clientName: state.clients.find((client) => client.id === item.client)?.name ?? 'Unknown client',
      locationName: item.location === 'home' ? 'Home' : state.rooms.find((room) => room.id === item.room)?.name ?? 'Unknown room',
    }));
    return { staff, month, sessions, totalMinutes: sessions.reduce((sum, item) => sum + item.minutes, 0), revision: state.revision };
  }
  async close() { await this.pool.end(); }
}

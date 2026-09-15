import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,seed,startBatch,unresolved,decide,reopen,commit,abandon,removeRoom,addStaff,removeStaff,setStaffHours,addClient,removeClient,therapists,suggestion,workableOptions,saveManual,addStanding,conflictsFor,editCalendarSession,refreshDraft,draftCalendar} from './prototype/model.mjs';
const leave={therapists:[therapists[0]],start:'2026-09-14',end:'2026-09-14'};
function resolve(state){for(const issue of state.batch.issues) if(!issue.decision) decide(state,issue.id,issue.kind==='unavailable'?'cancel':'accept');}
test('prototype decisions stay draft, unresolved commit blocked, abandon restores starting schedule',()=>{
 const s=initial();startBatch(s,'simple',leave);assert.equal(unresolved(s),3);
 decide(s,'s1','accept');assert.deepEqual(s.schedule,seed());assert.throws(()=>commit(s),/unresolved/);
 abandon(s);assert.deepEqual(s.schedule,seed());assert.equal(s.notifications.length,0);
});
test('simple commit changes only sample state, home keeps duration/no room, notifications track affected people',()=>{
 const s=initial();startBatch(s,'simple',leave);resolve(s);commit(s);
 assert.equal(s.batch,null);assert.ok(s.notifications.length>0);
 const home=s.schedule.find(i=>i.id==='s3');assert.equal(home.minutes,90);assert.equal(home.room,null);
 assert.equal(s.schedule[0].therapist,therapists[2]);assert.deepEqual(initial().schedule,seed());
});
for(const kind of ['cascade','cap'])test(`${kind}: bumped session separate, parent change reopens child and releases unnecessary displacement`,()=>{
 const s=initial();startBatch(s,kind,leave);decide(s,'s1','accept');
 assert.equal(s.batch.issues.length,4);assert.equal(s.batch.issues.find(i=>i.id==='s4').parent,'s1');
 decide(s,'s4','accept');reopen(s,'s1');assert.equal(s.batch.issues.find(i=>i.id==='s4').decision,null);
 decide(s,'s1','alternative');assert.equal(suggestion(s.batch.issues.find(i=>i.id==='s4'),s).therapist,therapists[1]);
 resolve(s);commit(s);assert.equal(s.schedule.find(i=>i.id==='s4').therapist,therapists[1]);
});
test('stale room commit is atomic and reopened issue can be resolved',()=>{
 const s=initial();startBatch(s,'stale',leave);resolve(s);assert.throws(()=>commit(s),/Another admin/);
 assert.deepEqual(s.schedule,seed());assert.equal(s.notifications.length,0);assert.equal(unresolved(s),1);
 resolve(s);commit(s);assert.equal(s.schedule[0].room,6);
});
test('multi-week, no-session and no-valid-therapist paths',()=>{
 const s=initial();startBatch(s,'multi',{...leave,therapists:therapists.slice(0,2),end:'2026-09-25'});assert.equal(s.batch.issues.length,6);resolve(s);commit(s);
 const empty=initial();startBatch(empty,'none',{...leave,start:'2026-09-28',end:'2026-09-28'});assert.equal(unresolved(empty),0);abandon(empty);
 const unavailable=initial();startBatch(unavailable,'unavailable',leave);assert.throws(()=>decide(unavailable,'s1','accept'),/No valid/);decide(unavailable,'s1','cancel');resolve(unavailable);commit(unavailable);assert.equal(unavailable.schedule[0].status,'Cancelled');
});
test('room removal and invalid override have no side effects',()=>{
 const s=initial();assert.throws(()=>removeRoom(s,2),/future bookings/);removeRoom(s,15);assert.equal(s.rooms.length,14);
 startBatch(s,'simple',leave);assert.throws(()=>decide(s,'s1','invalid'),/occupied/);assert.equal(unresolved(s),3);assert.deepEqual(s.schedule,seed());
});
test('all listed alternatives are conflict free; manual leave conflicts block commit until resolved',()=>{
 const s=initial();startBatch(s,'simple',leave);
 const options=workableOptions(s,'s1');assert.ok(options.length>1);
 for(const option of options)for(const room of option.rooms)assert.deepEqual(conflictsFor(s,{...option,room}),[]);
 const old=s.batch.issues[0].original;const conflicts=saveManual(s,'s1',old);assert.ok(conflicts.some(c=>c.includes('leave')));
 for(const i of s.batch.issues.slice(1))decide(s,i.id,'accept');assert.equal(unresolved(s),1);assert.throws(()=>commit(s),/unresolved/);
 saveManual(s,'s1',options[0]);assert.equal(unresolved(s),0);commit(s);
});
test('manual cap excess is surfaced and normal setup rejects overlaps',()=>{
 const s=initial();startBatch(s,'cap',leave);const original=s.batch.issues[0].original;
 assert.ok(saveManual(s,'s1',{...original,therapist:therapists[1]}).some(c=>c.includes('cap')));
 const normal=initial();assert.throws(()=>addStanding(normal,{...normal.schedule[0],id:'new'}),/overlapping/);
 addStanding(normal,{...normal.schedule[0],id:'new',date:'2026-09-15',location:'Home',room:null,minutes:90});
 assert.equal(normal.schedule.at(-1).standing,true);assert.equal(normal.schedule.at(-1).room,null);
});
test('calendar add/cancel dynamically creates and clears conflicts on other sessions',()=>{
 const s=initial();startBatch(s,'simple',leave);const before=structuredClone(s.schedule);
 const addition={...s.schedule[0],id:'calendar-new',client:'Cameron Sample',therapist:therapists[1],room:4};
 editCalendarSession(s,addition);
 assert.ok(refreshDraft(s).some(i=>i.id==='s4' && i.conflicts.some(c=>c.includes('overlapping'))));
 assert.ok(refreshDraft(s).some(i=>i.id==='calendar-new'));assert.deepEqual(s.schedule,before);
 editCalendarSession(s,{...addition,status:'Cancelled'});
 assert.ok(!refreshDraft(s).some(i=>i.id==='s4'));assert.equal(unresolved(s),3);
 abandon(s);assert.deepEqual(s.schedule,before);assert.equal(s.notifications.length,0);
});
test('calendar cancellation and valid replacement commit atomically with the new session',()=>{
 const s=initial();startBatch(s,'simple',leave);
 for(const original of s.schedule.filter(s=>s.therapist===therapists[0]&&s.date==='2026-09-14'))editCalendarSession(s,{...original,status:'Cancelled'});
 editCalendarSession(s,{...seed()[0],id:'replacement',therapist:therapists[2]});
 assert.equal(unresolved(s),0);assert.ok(draftCalendar(s).some(i=>i.id==='replacement'));
 assert.ok(!s.schedule.some(i=>i.id==='replacement'));commit(s);
 assert.ok(s.schedule.some(i=>i.id==='replacement'));assert.ok(s.notifications.some(t=>t.id.startsWith('replacement')));
});
test('conflicting calendar edit stays uncommittable until edited to a free time and therapist',()=>{
 const s=initial();startBatch(s,'simple',leave);const first=seed()[0];
 editCalendarSession(s,{...first,therapist:therapists[1],room:4});assert.throws(()=>commit(s),/unresolved/);
 editCalendarSession(s,{...first,therapist:therapists[2],time:'12:00',room:6});
 assert.ok(!refreshDraft(s).some(i=>i.id==='s1'||i.id==='s4'));
 assert.equal(unresolved(s),2);
});
test('prototype setup manages unreferenced people and guards referenced fixture people',()=>{
 const s=initial();addStaff(s,'Jordan Sample',18);setStaffHours(s,'Jordan Sample',22);assert.equal(s.staff.find(i=>i.name==='Jordan Sample').maxHours,22);removeStaff(s,'Jordan Sample');
 assert.throws(()=>removeStaff(s,therapists[0]),/future sample sessions/);
 addClient(s,'Avery Sample');removeClient(s,'Avery Sample');assert.throws(()=>removeClient(s,'Alex Demo'),/future sample sessions/);
});
test('calendar addition can retain a one-off choice while weekly remains the default mock',()=>{
 const s=initial();addStanding(s,{...s.schedule[0],id:'one-off',date:'2026-09-15',time:'12:00',room:6,standing:false});assert.equal(s.schedule.at(-1).standing,false);
});
test('draft calendar addition preserves weekly marker through an explicit commit',()=>{
 const s=initial();startBatch(s,'none',{therapists:[therapists[0]],start:'2026-09-28',end:'2026-09-28'});
 editCalendarSession(s,{id:'draft-weekly',client:'Alex Demo',therapist:therapists[2],date:'2026-09-15',time:'12:00',minutes:60,location:'Clinic',room:6,status:'Scheduled',standing:true});assert.equal(draftCalendar(s).find(i=>i.id==='draft-weekly').standing,true);commit(s);assert.equal(s.schedule.find(i=>i.id==='draft-weekly').standing,true);
});

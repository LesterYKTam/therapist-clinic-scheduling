import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { PostgresClinicStore } from '../lib/clinic-store.mjs';
import { initialState, leaveConflicts, withConflicts, draftIssues, workableAssignments, directResolutionProposal, boundedResolutionProposal } from '../lib/scheduling.mjs';
import { reportPdfResponse } from '../lib/report-response.mjs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const url = process.env.DATABASE_URL;
const oneOff = (more = {}) => ({kind:'one-off',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1',...more});
const weekly = (more = {}) => ({kind:'weekly',client:'a-c1',therapist:'a-t1',startDate:'2030-01-07',endDate:'2030-01-21',time:'09:00',minutes:60,location:'clinic',room:'room-1',...more});
async function clean() { const parsed=new URL(url); assert.equal(parsed.hostname,'localhost'); assert.equal(parsed.port,'5433'); assert.equal(parsed.pathname,'/clinic_test'); const pool=new pg.Pool({connectionString:url}); try { const database=await pool.query('SELECT current_database() AS name'); assert.equal(database.rows[0].name,'clinic_test'); await pool.query('DROP TABLE IF EXISTS clinic_state, schema_migrations'); } finally { await pool.end(); } }
async function open(seed) { const store=new PostgresClinicStore(url); await store.migrate(seed); return store; }

test('PostgreSQL preview is side-effect free, commit is atomic, and stale revisions fail', async () => {
  await clean(); const store=await open(); try { const first=await store.preview(oneOff()); const stale=await store.preview(oneOff({room:'room-2'})); assert.equal((await store.read()).sessions.length,0); await store.commit(oneOff(),first.revision); await assert.rejects(()=>store.commit(oneOff({room:'room-2'}),stale.revision),/stale/); assert.equal((await store.read()).sessions.length,1); } finally { await store.close(); }
});
test('direct one-off and weekly creation reject historical start times', async () => {
  await clean(); const store=await open();
  try {
    const before=await store.read();
    const pastOne=oneOff({date:'2020-01-06'});
    const pastSeries=weekly({startDate:'2020-01-06',endDate:'2020-01-20'});
    await assert.rejects(()=>store.preview(pastOne),/Past occurrences/);
    await assert.rejects(()=>store.commit(pastOne,before.revision),/Past occurrences/);
    await assert.rejects(()=>store.preview(pastSeries),/Past occurrences/);
    await assert.rejects(()=>store.commit(pastSeries,before.revision),/Past occurrences/);
    const after=await store.read();
    assert.equal(after.revision,before.revision);
    assert.equal(after.sessions.length,0);
  } finally { await store.close(); }
});
test('separate partial-day leaves persist and refresh one issue per committed session', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    await store.commit(oneOff({client:'b-c1',therapist:'b-t1',room:'room-2',time:'11:00'}),state.revision);
    const before=await store.read();
    const first={therapist:'a-t1',startDate:'2030-01-07',startTime:'09:30',endDate:'2030-01-07',endTime:'10:30'};
    await store.recordLeave(first,before.revision);
    state=await store.read();
    assert.equal(state.sessions.length,before.sessions.length);
    assert.equal(leaveConflicts(state).length,1);
    assert.equal(leaveConflicts(state)[0].leaveIds.length,1);
    await assert.rejects(()=>store.preview(oneOff({date:'2030-01-08'})),/Outstanding schedule conflicts/);
    await assert.rejects(()=>store.commit(oneOff({date:'2030-01-08'}),state.revision),/Outstanding schedule conflicts/);
    await assert.rejects(()=>store.recordLeave(first,state.revision),/already recorded/);
    state=await store.read();
    await store.recordLeave({...first,startTime:'09:00'},state.revision);
    state=await store.read();
    assert.equal(leaveConflicts(state).length,1);
    assert.equal(leaveConflicts(state)[0].leaveIds.length,2);
    await store.recordLeave({therapist:'b-t1',startDate:'2030-01-07',startTime:'10:00',endDate:'2030-01-07',endTime:'12:00'},state.revision);
    await store.close();
    const reopened=await open();
    try { state=await reopened.read(); assert.equal(state.leaves.length,3); assert.equal(state.sessions.length,2); assert.equal(leaveConflicts(state).length,2); }
    finally { await reopened.close(); }
  } catch(error) { await store.close(); throw error; }
});
test('new bookings cannot knowingly overlap recorded leave, while touching its boundary is valid', async () => {
  await clean(); const store=await open(); try {
    let state=await store.read();
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'},state.revision);
    state=await store.read();
    await assert.rejects(()=>store.preview(oneOff()),/overlaps recorded therapist leave/);
    assert.equal((await store.read()).sessions.length,0);
    await store.commit(oneOff({time:'10:00'}),state.revision);
    assert.equal((await store.read()).sessions.length,1);
  } finally { await store.close(); }
});
test('recorded leave can be amended or withdrawn only when its pod has no shared draft', async () => {
  await clean(); const store=await open(); try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    const saved=await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:30',endDate:'2030-01-07',endTime:'10:30'},state.revision);
    const leaveId=saved.result.id;
    state=await store.read();
    assert.equal(leaveConflicts(state).length,1);
    await store.beginDraft('a',state.revision);
    state=await store.read();
    await assert.rejects(()=>store.amendLeave('a',leaveId,{startDate:'2030-01-07',startTime:'10:00',endDate:'2030-01-07',endTime:'11:00'},state.revision),/shared schedule draft/);
    await assert.rejects(()=>store.withdrawLeave('a',leaveId,state.revision),/shared schedule draft/);
    await assert.rejects(()=>store.recordLeave({therapist:'a-t2',startDate:'2030-01-08',startTime:'09:00',endDate:'2030-01-08',endTime:'10:00'},state.revision),/shared schedule draft/);
    assert.equal((await store.read()).leaves.length,1);
    await store.discardDraft('a',state.revision);
    state=await store.read();
    await assert.rejects(()=>store.amendLeave('b',leaveId,{startDate:'2030-01-07',startTime:'10:00',endDate:'2030-01-07',endTime:'11:00'},state.revision),/not found/);
    await store.amendLeave('a',leaveId,{startDate:'2030-01-07',startTime:'10:00',endDate:'2030-01-07',endTime:'11:00'},state.revision);
    state=await store.read();
    assert.equal(leaveConflicts(state).length,0);
    assert.equal(state.sessions[0].therapist,'a-t1');
    await store.withdrawLeave('a',leaveId,state.revision);
    state=await store.read();
    assert.equal(state.leaves.length,0);
    assert.equal(state.sessions.length,1);
  } finally { await store.close(); }
});
test('one pod’s leave conflicts and draft do not block another pod’s normal scheduling', async () => {
  await clean(); const store=await open(); try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'},state.revision);
    state=await store.read();
    await store.beginDraft('a',state.revision);
    state=await store.read();
    const other=oneOff({client:'b-c1',therapist:'b-t1',room:'room-2',time:'11:00'});
    await store.preview(other);
    await store.commit(other,state.revision);
    state=await store.read();
    assert.equal(state.sessions.length,2);
    assert.equal(state.drafts[0].pod,'a');
    assert.equal(leaveConflicts(state).length,1);
    await assert.rejects(()=>store.preview(oneOff({date:'2030-01-08'})),/shared schedule draft/);
  } finally { await store.close(); }
});
test('a direct edit cannot move a session into another pod and bypass its shared draft', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    const original=structuredClone(state.sessions[0]);
    await store.beginDraft('b',state.revision);
    state=await store.read();
    const request={kind:'edit-occurrence',occurrenceId:original.id,client:'b-c1',therapist:'b-t1',date:original.date,time:original.time,minutes:original.minutes,location:'clinic',room:'room-2'};
    await assert.rejects(()=>store.preview(request),/cannot move to another pod/);
    await assert.rejects(()=>store.commit(request,state.revision),/cannot move to another pod/);
    const after=await store.read();
    assert.equal(after.revision,state.revision);
    assert.deepEqual(after.sessions[0],original);
    assert.equal(after.drafts[0].pod,'b');
  } finally { await store.close(); }
});
test('one shared draft per pod is durable; discarding it keeps committed sessions and leave issues', async () => {
  await clean(); const first=await open(), second=await open();
  try {
    let state=await first.read();
    await first.commit(oneOff(),state.revision);
    state=await first.read();
    await first.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:30',endDate:'2030-01-07',endTime:'10:30'},state.revision);
    state=await first.read();
    const attempts=await Promise.allSettled([first.beginDraft('a',state.revision),second.beginDraft('a',state.revision)]);
    assert.equal(attempts.filter((result)=>result.status==='fulfilled').length,1);
    state=await second.read();
    assert.equal(state.drafts.length,1);
    assert.equal(leaveConflicts(state).length,1);
    await assert.rejects(()=>first.commit({kind:'cancel-occurrence',occurrenceId:state.sessions[0].id},state.revision),/shared schedule draft/);
    await assert.rejects(()=>first.preview(oneOff({date:'2030-01-08'})),/shared schedule draft/);
    const same=await first.beginDraft('a',state.revision);
    assert.equal(same.result.id,state.drafts[0].id);
    assert.equal(same.state.revision,state.revision);
    await first.beginDraft('b',state.revision);
    state=await second.read();
    assert.equal(state.drafts.length,2);
    await second.discardDraft('a',state.revision);
    state=await first.read();
    assert.equal(state.drafts.length,1);
    assert.equal(state.drafts[0].pod,'b');
    assert.equal(state.leaves.length,1);
    assert.equal(state.sessions.length,1);
    assert.equal(leaveConflicts(state).length,1);
  } finally { await first.close(); await second.close(); }
});

test('clinic timezone cannot change while any pod has an unfinished draft', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read();
    await store.beginDraft('b',state.revision);
    state=await store.read();
    const setup=structuredClone(state);
    setup.config.timezone='UTC';
    await assert.rejects(()=>store.updateSetup(setup,state.revision),/Timezone cannot change while shared schedule drafts are open/);
    const after=await store.read();
    assert.equal(after.revision,state.revision);
    assert.equal(after.config.timezone,state.config.timezone);
    assert.equal(after.drafts[0].pod,'b');
  } finally { await store.close(); }
});

test('shared draft stages a leave resolution without touching committed schedule until atomic commit', async () => {
  await clean(); const first=await open(), second=await open();
  try {
    let state=await first.read();
    await first.commit(oneOff(),state.revision);
    state=await first.read();
    const original=state.sessions[0];
    await first.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:30',endDate:'2030-01-07',endTime:'10:30'},state.revision);
    state=await second.read();
    assert.equal(leaveConflicts(state).length,1);
    await first.stageDraftChange('a',{kind:'assign',sessionId:original.id,therapist:'a-t2'},state.revision);
    state=await second.read();
    assert.equal(state.sessions[0].therapist,'a-t1');
    assert.equal(state.drafts[0].changes[0].therapist,'a-t2');
    assert.equal(draftIssues(state,'a').length,0);
    await assert.rejects(()=>first.commitDraft('a',state.revision-1),/stale/);
    await second.commitDraft('a',state.revision);
    state=await first.read();
    assert.equal(state.sessions[0].therapist,'a-t2');
    assert.equal(state.drafts.length,0);
    assert.equal(leaveConflicts(state).length,0);
    assert.equal(state.leaves.length,1);
  } finally { await first.close(); await second.close(); }
});

test('Auto resolve preview is durable, one-run, stale-safe, and only commits after explicit apply', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:30',endDate:'2030-01-07',endTime:'10:30'},state.revision);
    state=await store.read();
    const preview=await store.previewAutoResolve('a',state.revision);
    assert.equal(preview.result.proposed.length,1);
    state=await store.read();
    assert.equal(state.sessions[0].therapist,'a-t1');
    assert.equal(state.drafts[0].changes.length,0);
    assert.equal(state.drafts[0].proposal.sourceRevision,state.revision);
    await assert.rejects(()=>store.previewAutoResolve('a',state.revision),/already run/);
    await store.recordLeave({therapist:'b-t1',startDate:'2030-01-07',startTime:'11:00',endDate:'2030-01-07',endTime:'12:00'},state.revision);
    state=await store.read();
    await assert.rejects(()=>store.applyAutoResolve('a',state.revision),/stale/);
    await store.discardAutoResolve('a',state.revision);
    state=await store.read();
    assert.equal(state.drafts[0].autoResolveRun,true);
    await assert.rejects(()=>store.previewAutoResolve('a',state.revision),/already run/);
    await store.stageDraftChange('a',{kind:'assign',sessionId:state.sessions[0].id,therapist:'a-t2'},state.revision);
    state=await store.read();
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.sessions[0].therapist,'a-t2');
    assert.equal(state.drafts.length,0);
  } finally { await store.close(); }

  await clean(); const second=await open();
  try {
    let state=await second.read(); await second.commit(oneOff(),state.revision);
    state=await second.read(); await second.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:30',endDate:'2030-01-07',endTime:'10:30'},state.revision);
    state=await second.read(); await second.previewAutoResolve('a',state.revision);
    state=await second.read();
    await assert.rejects(()=>second.stageDraftChange('a',{kind:'cancel',sessionId:state.sessions[0].id},state.revision),/Apply or discard/);
    await second.applyAutoResolve('a',state.revision);
    state=await second.read();
    assert.equal(state.sessions[0].therapist,'a-t1');
    assert.equal(state.drafts[0].changes[0].therapist,'a-t2');
    assert.equal(draftIssues(state,'a').length,0);
    await second.commitDraft('a',state.revision);
    state=await second.read(); assert.equal(state.sessions[0].therapist,'a-t2');
  } finally { await second.close(); }
});
test('two staff leaves produce one batch proposal and one atomic schedule commit', async () => {
  await clean();
  const seed=initialState();
  seed.clients.push({id:'a-c2',pod:'a',name:'Riley Two Leaves',active:true,assigned:['a-t2','a-t3','a-t1']});
  seed.sessions.push(
    {id:'leave-visit-1',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1'},
    {id:'leave-visit-2',client:'a-c2',therapist:'a-t2',date:'2030-01-07',time:'11:00',minutes:60,location:'clinic',room:'room-2'},
  );
  const store=await open(seed);
  try {
    let state=await store.read();
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'},state.revision);
    state=await store.read();
    await store.recordLeave({therapist:'a-t2',startDate:'2030-01-07',startTime:'11:00',endDate:'2030-01-07',endTime:'12:00'},state.revision);
    state=await store.read();
    assert.equal(leaveConflicts(state).length,2);
    const proposal=await store.previewAutoResolve('a',state.revision);
    assert.equal(proposal.result.proposed.length,2);
    assert.equal(proposal.result.unresolved.length,0);
    state=await store.read();
    assert.equal(state.sessions.find((item)=>item.id==='leave-visit-1').therapist,'a-t1');
    assert.equal(state.notifications.length,0);
    await store.applyAutoResolve('a',state.revision);
    state=await store.read();
    assert.equal(draftIssues(state,'a').length,0);
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(leaveConflicts(state).length,0);
    assert.equal(state.sessions.find((item)=>item.id==='leave-visit-1').therapist,'a-t2');
    assert.equal(state.sessions.find((item)=>item.id==='leave-visit-2').therapist,'a-t3');
    assert.equal(state.leaves.length,2);
    assert.equal(state.notifications.length,6);
  } finally { await store.close(); }
});
test('an admin can revise applied Auto resolve changes before one final commit', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    const sessionId=state.sessions[0].id;
    const earlierTaskCount=state.notifications.length;
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'},state.revision);
    state=await store.read();
    await store.previewAutoResolve('a',state.revision);
    state=await store.read();
    await store.applyAutoResolve('a',state.revision);
    state=await store.read();
    assert.equal(state.drafts[0].changes[0].therapist,'a-t2');
    await store.stageDraftChange('a',{kind:'reschedule',sessionId,therapist:'a-t3',date:'2030-01-07',time:'10:00',minutes:90,location:'home',room:null},state.revision);
    state=await store.read();
    assert.equal(state.sessions[0].therapist,'a-t1');
    assert.equal(state.notifications.length,earlierTaskCount);
    assert.equal(draftIssues(state,'a').length,0);
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.drafts.length,0);
    assert.equal(state.sessions[0].therapist,'a-t3');
    assert.equal(state.sessions[0].time,'10:00');
    assert.equal(state.sessions[0].minutes,90);
    assert.equal(state.sessions[0].location,'home');
    assert.equal(state.sessions[0].room,null);
    assert.equal(state.leaves.length,1);
    assert.equal(state.notifications.length,earlierTaskCount+3);
  } finally { await store.close(); }
});
test('discarding Auto resolve suggestions retains earlier manual draft edits', async () => {
  await clean(); const store=await open(); try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    const rootId=state.sessions[0].id;
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'},state.revision);
    state=await store.read();
    await store.stageDraftAdd('a',oneOff({date:'2030-01-08',therapist:'a-t2',room:'room-2'}),state.revision);
    state=await store.read();
    const addedId=state.drafts[0].changes[0].sessionId;
    const plan=await store.previewAutoResolve('a',state.revision);
    assert.equal(plan.result.proposed.length,1);
    state=await store.read();
    await store.discardAutoResolve('a',state.revision);
    state=await store.read();
    assert.equal(state.drafts[0].changes.length,1);
    assert.equal(state.drafts[0].changes[0].sessionId,addedId);
    assert.equal(state.sessions.length,1);
    await store.stageDraftChange('a',{kind:'assign',sessionId:rootId,therapist:'a-t2'},state.revision);
    state=await store.read();
    assert.equal(draftIssues(state,'a').length,0);
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.sessions.length,2);
    assert.equal(state.drafts.length,0);
  } finally { await store.close(); }
});

test('draft Add session supports one-off and weekly bookings without publishing early', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read();
    const once=await store.stageDraftAdd('a',oneOff(),state.revision);
    state=await store.read();
    assert.equal(state.sessions.length,0);
    assert.equal(state.notifications.length,0);
    assert.equal(state.drafts[0].changes[0].kind,'add');
    assert.equal(draftIssues(state,'a').length,0);
    const newId=once.result.added[0];
    await store.stageDraftChange('a',{kind:'reschedule',sessionId:newId,therapist:'a-t2',date:'2030-01-07',time:'11:00',minutes:90,location:'home',room:null},state.revision);
    state=await store.read();
    assert.equal(state.drafts[0].changes[0].session.minutes,90);
    const repeated=await store.stageDraftAdd('a',weekly({therapist:'a-t1',time:'13:00',room:'room-2'}),state.revision);
    state=await store.read();
    assert.equal(repeated.result.added.length,3);
    assert.equal(state.sessions.length,0);
    assert.equal(state.series.length,0);
    assert.equal(state.notifications.length,0);
    assert.equal(draftIssues(state,'a').length,0);
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.sessions.length,4);
    assert.equal(state.series.length,1);
    assert.equal(state.notifications.length,8);
    assert.equal(state.notifications.filter((item)=>item.recipientRole==='client').length,4);
    assert.ok(state.notifications.every((item)=>item.status==='pending'));
    const task=state.notifications.find((item)=>item.sessionId===newId&&item.recipientRole==='client');
    assert.equal(task.before,null);
    assert.equal(task.after.time,'11:00');
    assert.equal(task.after.minutes,90);
    await assert.rejects(()=>store.handleNotification('b',task.id,state.revision),/not found/);
    await store.handleNotification('a',task.id,state.revision);
    state=await store.read();
    assert.equal(state.notifications.find((item)=>item.id===task.id).status,'handled');
    assert.ok(state.notifications.find((item)=>item.id===task.id).handledAt);
    await assert.rejects(()=>store.handleNotification('a',task.id,state.revision),/already been handled/);
    const clinicTask=state.notifications.find((item)=>item.after?.room==='room-2');
    assert.equal(clinicTask.after.roomName,'Room 2');
    const renamed=structuredClone(state);
    renamed.rooms.find((item)=>item.id==='room-2').name='Room 2A';
    await store.updateSetup(renamed,state.revision);
    state=await store.read();
    assert.equal(state.notifications.find((item)=>item.id===clinicTask.id).after.roomName,'Room 2');
    assert.equal(state.sessions.find((item)=>item.id===newId).minutes,90);
    assert.equal(state.drafts.length,0);
  } finally { await store.close(); }
});

test('clinic-wide room collision in a draft blocks the entire batch', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read();
    await store.commit(oneOff({client:'b-c1',therapist:'b-t1'}),state.revision);
    state=await store.read();
    await store.stageDraftAdd('a',oneOff(),state.revision);
    state=await store.read();
    assert.match(draftIssues(state,'a')[0].reasons.join(' '),/Room overlaps/);
    await assert.rejects(()=>store.commitDraft('a',state.revision),/outstanding schedule conflict/);
    state=await store.read();
    assert.equal(state.sessions.length,1);
    assert.equal(state.drafts[0].changes.length,1);
  } finally { await store.close(); }
});
test('Home draft sessions reserve no room and their full duration counts toward the weekly cap', async () => {
  await clean(); const seed=initialState(); seed.therapists.find((item)=>item.id==='a-t1').capHours=2;
  const store=await open(seed);
  try {
    let state=await store.read();
    const first=await store.stageDraftAdd('a',oneOff({location:'home',room:null,minutes:90}),state.revision);
    state=await store.read();
    await store.stageDraftAdd('a',oneOff({location:'home',room:null,date:'2030-01-08',minutes:45}),state.revision);
    state=await store.read();
    assert.match(draftIssues(state,'a').flatMap((item)=>item.reasons).join(' '),/Weekly cap exceeded/);
    await assert.rejects(()=>store.commitDraft('a',state.revision),/outstanding schedule conflict/);
    await store.stageDraftChange('a',{kind:'reschedule',sessionId:first.result.added[0],therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'home',room:null},state.revision);
    state=await store.read();
    assert.equal(draftIssues(state,'a').length,0);
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.sessions.length,2);
    assert.ok(state.sessions.every((item)=>item.location==='home'&&item.room===null));
  } finally { await store.close(); }
});
test('staff reports use committed bookings and exclude unfinished shared-draft changes', async () => {
  await clean(); const store=await open(); try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read();
    const sessionId=state.sessions[0].id;
    await store.stageDraftChange('a',{kind:'assign',sessionId,therapist:'a-t2'},state.revision);
    state=await store.read();
    assert.equal((await store.report('a-t1','2030-01')).totalMinutes,60);
    assert.equal((await store.report('a-t2','2030-01')).totalMinutes,0);
    await store.commitDraft('a',state.revision);
    assert.equal((await store.report('a-t1','2030-01')).totalMinutes,0);
    assert.equal((await store.report('a-t2','2030-01')).totalMinutes,60);
  } finally { await store.close(); }
});

test('draft conflicts block commit, while cancellation or discard leave committed data safe', async () => {
  await clean(); const seed=initialState(); seed.clients.push({id:'a-c2',pod:'a',name:'Jamie Synthetic',active:true,assigned:['a-t1','a-t2','a-t3']}); const store=await open(seed);
  try {
    let state=await store.read();
    await store.commit(oneOff(),state.revision);
    state=await store.read(); const original=state.sessions[0];
    await store.commit(oneOff({client:'a-c2',therapist:'a-t2',time:'09:30',room:'room-2'}),state.revision);
    state=await store.read();
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:30',endDate:'2030-01-07',endTime:'10:30'},state.revision);
    state=await store.read();
    await store.stageDraftChange('a',{kind:'assign',sessionId:original.id,therapist:'a-t2'},state.revision);
    state=await store.read();
    assert.match(draftIssues(state,'a')[0].reasons.join(' '),/Therapist overlaps/);
    await assert.rejects(()=>store.commitDraft('a',state.revision),/outstanding schedule conflict/);
    assert.equal((await store.read()).sessions[0].therapist,'a-t1');
    await store.stageDraftChange('a',{kind:'cancel',sessionId:original.id},state.revision);
    state=await store.read(); assert.equal(draftIssues(state,'a').length,0);
    await store.discardDraft('a',state.revision);
    state=await store.read(); assert.equal(state.sessions.length,2); assert.equal(leaveConflicts(state).length,1);
    await store.stageDraftChange('a',{kind:'cancel',sessionId:original.id},state.revision);
    state=await store.read(); await store.commitDraft('a',state.revision);
    state=await store.read(); assert.equal(state.sessions.length,1); assert.equal(leaveConflicts(state).length,0); assert.equal(state.leaves.length,1);
    const cancelled=state.notifications.filter((item)=>item.sessionId===original.id&&item.changeType==='cancelled');
    assert.equal(cancelled.length,2);
    assert.ok(cancelled.every((item)=>item.before?.date==='2030-01-07'&&item.after===null));
  } finally { await store.close(); }
});

test('workable therapist choices exclude new clashes and highlight the first safe rank', async () => {
  await clean(); const seed=initialState(); seed.clients.push({id:'a-c2',pod:'a',name:'Riley Synthetic',active:true,assigned:['a-t1','a-t2','a-t3']}); const store=await open(seed);
  try {
    let state=await store.read(); await store.commit(oneOff(),state.revision);
    state=await store.read(); const affected=state.sessions[0];
    await store.commit(oneOff({client:'a-c2',therapist:'a-t2',room:'room-2'}),state.revision);
    state=await store.read(); await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'},state.revision);
    state=await store.read();
    assert.deepEqual(workableAssignments(state,'a',affected.id),[{therapist:'a-t3',rank:3,suggested:true}]);
    await store.stageDraftChange('a',{kind:'cancel',sessionId:state.sessions[1].id},state.revision);
    state=await store.read();
    assert.deepEqual(workableAssignments(state,'a',affected.id),[{therapist:'a-t2',rank:2,suggested:true},{therapist:'a-t3',rank:3,suggested:false}]);
  } finally { await store.close(); }
});

test('draft reschedule can change duration and Home interval without changing committed data before approval', async () => {
  await clean(); const store=await open();
  try {
    let state=await store.read(); await store.commit(oneOff(),state.revision);
    state=await store.read(); const original=state.sessions[0];
    await store.recordLeave({therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'},state.revision);
    state=await store.read();
    await store.stageDraftChange('a',{kind:'reschedule',sessionId:original.id,therapist:'a-t1',date:'2030-01-07',time:'10:30',minutes:90,location:'home',room:null},state.revision);
    state=await store.read();
    assert.equal(state.sessions[0].time,'09:00'); assert.equal(state.sessions[0].minutes,60);
    assert.equal(draftIssues(state,'a').length,0);
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.sessions[0].time,'10:30'); assert.equal(state.sessions[0].minutes,90);
    assert.equal(state.sessions[0].location,'home'); assert.equal(state.sessions[0].room,null);
    assert.equal(leaveConflicts(state).length,0);
  } finally { await store.close(); }
});

test('direct batch proposal is side-effect free, pod scoped and lists unresolved conflicts', () => {
  const state=initialState();
  state.sessions.push({id:'a-visit',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  state.sessions.push({id:'b-visit',client:'b-c1',therapist:'b-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-2'});
  state.leaves.push({id:'a-leave',pod:'a',therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'});
  state.leaves.push({id:'b-leave',pod:'b',therapist:'b-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'});
  const before=structuredClone(state);
  const plan=directResolutionProposal(state,'a');
  assert.equal(plan.mode,'direct-only');
  assert.equal(plan.proposed.length,1);
  assert.equal(plan.proposed[0].change.sessionId,'a-visit');
  assert.equal(plan.proposed[0].change.therapist,'a-t2');
  assert.equal(plan.unresolved.length,0);
  assert.deepEqual(state,before);
  assert.equal(leaveConflicts(state).length,2);
  state.therapists.find((item)=>item.id==='a-t2').active=false;
  state.therapists.find((item)=>item.id==='a-t3').active=false;
  const stuck=directResolutionProposal(state,'a');
  assert.equal(stuck.proposed.length,0);
  assert.equal(stuck.unresolved.length,1);
});

test('bounded proposal counts displaced sessions and never silently changes the schedule', () => {
  const state=initialState();
  state.therapists.push({id:'a-t4',pod:'a',name:'Jordan Synthetic',capHours:24,active:true});
  state.clients.push({id:'a-c2',pod:'a',name:'Riley Synthetic',active:true,assigned:['a-t2','a-t3','a-t1']});
  state.clients.push({id:'a-c3',pod:'a',name:'Quinn Synthetic',active:true,assigned:['a-t3','a-t4','a-t1']});
  const visit=(id,client,therapist,room)=>({id,client,therapist,date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room});
  state.sessions.push(visit('root','a-c1','a-t1','room-1'),visit('bump-1','a-c2','a-t2','room-2'),visit('bump-2','a-c3','a-t3','room-3'));
  state.leaves.push({id:'leave',pod:'a',therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'});
  const before=structuredClone(state);
  for (const depth of [0,1]) { state.config.cascadeDepth=depth; const plan=boundedResolutionProposal(state,'a'); assert.equal(plan.proposed.length,0); assert.equal(plan.unresolved.length,1); assert.match(plan.stops[0].reason,/cascade depth/); }
  state.config.cascadeDepth=2;
  const plan=boundedResolutionProposal(state,'a');
  assert.equal(plan.proposed.length,3);
  assert.equal(plan.unresolved.length,0);
  assert.deepEqual(new Map(plan.proposed.map((item)=>[item.change.sessionId,item.change.therapist])),new Map([['root','a-t2'],['bump-1','a-t3'],['bump-2','a-t4']]));
  assert.equal(plan.proposed.find((item)=>item.change.sessionId==='bump-1').displacedBy,'root');
  assert.equal(plan.proposed.find((item)=>item.change.sessionId==='bump-2').displacedBy,'bump-1');
  assert.ok(plan.proposed.every((item)=>item.rank===2));
  assert.deepEqual(state.sessions,before.sessions);
  assert.equal(leaveConflicts(state).length,1);
});
test('automatic third-ranked fallback does not displace another session', () => {
  const state=initialState();
  state.clients.push({id:'a-c2',pod:'a',name:'Third Fallback Client',active:true,assigned:['a-t2','a-t1','a-t3']});
  state.sessions.push(
    {id:'root-third',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1'},
    {id:'busy-second',client:'a-c2',therapist:'a-t2',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-2'},
  );
  state.leaves.push({id:'root-leave',pod:'a',therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'});
  state.config.cascadeDepth=0;
  const plan=boundedResolutionProposal(state,'a');
  assert.equal(plan.proposed.length,1);
  assert.equal(plan.proposed[0].change.sessionId,'root-third');
  assert.equal(plan.proposed[0].change.therapist,'a-t3');
  assert.equal(plan.proposed[0].rank,3);
  assert.equal(plan.proposed[0].displacedBy,null);
  assert.equal(plan.unresolved.length,0);
  assert.equal(state.sessions.find((item)=>item.id==='root-third').therapist,'a-t1');
});
test('automatic and direct alternatives never rewrite a session that has already started', () => {
  const state=initialState();
  state.sessions.push({id:'old-visit',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  state.leaves.push({id:'old-leave',pod:'a',therapist:'a-t1',startDate:'2020-01-06',startTime:'09:00',endDate:'2020-01-06',endTime:'10:00'});
  assert.deepEqual(workableAssignments(state,'a','old-visit'),[]);
  const proposal=boundedResolutionProposal(state,'a');
  assert.equal(proposal.proposed.length,0);
  // D-B012: the started session's leave overlap is a historical alert, not an unresolved blocking issue.
  assert.equal(proposal.unresolved.length,0);
  assert.equal(proposal.stops.length,0);
  assert.equal(draftIssues(state,'a').length,0);
});
test('weekly-cap cascade never moves a session that started earlier in the week', () => {
  const state=initialState();
  state.config.cascadeDepth=2;
  state.therapists.find((item)=>item.id==='a-t2').capHours=1;
  state.clients.push({id:'a-c2',pod:'a',name:'Historical Cascade Client',active:true,assigned:['a-t3','a-t1','a-t2']});
  state.sessions.push(
    {id:'already-started',client:'a-c1',therapist:'a-t2',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1'},
    {id:'future-root',client:'a-c1',therapist:'a-t1',date:'2030-01-10',time:'09:00',minutes:60,location:'clinic',room:'room-1'},
    {id:'third-busy',client:'a-c2',therapist:'a-t3',date:'2030-01-10',time:'09:00',minutes:60,location:'clinic',room:'room-2'},
  );
  state.leaves.push({id:'future-leave',pod:'a',therapist:'a-t1',startDate:'2030-01-10',startTime:'09:00',endDate:'2030-01-10',endTime:'10:00'});
  const actualNow=Date.now;
  Date.now=()=>Date.parse('2030-01-09T15:00:00Z');
  try {
    const proposal=boundedResolutionProposal(state,'a');
    assert.equal(proposal.proposed.length,0);
    assert.equal(proposal.unresolved.length,1);
    assert.equal(proposal.allDraftChanges.length,0);
    assert.equal(state.sessions.find((item)=>item.id==='already-started').therapist,'a-t2');
  } finally { Date.now=actualNow; }
});
test('a shared draft cannot commit after its target session has started', async () => {
  await clean();
  const seed=initialState();
  seed.sessions.push({id:'started-target',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  seed.drafts.push({id:'staged-before-start',pod:'a',changes:[{kind:'assign',sessionId:'started-target',therapist:'a-t2'}],autoResolveRun:false});
  const store=await open(seed);
  try {
    const before=await store.read();
    await assert.rejects(()=>store.commitDraft('a',before.revision),/already started/);
    const after=await store.read();
    assert.equal(after.revision,before.revision);
    assert.equal(after.sessions[0].therapist,'a-t1');
    assert.equal(after.drafts.length,1);
  } finally { await store.close(); }
});
const historicalSeed=()=>{
  const seed=initialState();
  seed.sessions.push({id:'old-visit',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  seed.leaves.push({id:'old-leave',pod:'a',therapist:'a-t1',startDate:'2020-01-06',startTime:'09:00',endDate:'2020-01-06',endTime:'10:00'});
  return seed;
};
test('CHANGE-001: historical leave alerts stay visible but do not block direct or draft commits', async () => {
  await clean(); const seed=historicalSeed();
  seed.sessions.push({id:'future-visit',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  const store=await open(seed);
  try {
    let state=await store.read();
    const oldBooking=JSON.stringify(state.sessions.find((item)=>item.id==='old-visit'));
    const leaves=JSON.stringify(state.leaves);
    const view=withConflicts(state);
    assert.equal(view.conflicts.length,0);
    assert.equal(view.historicalAlerts.length,1);
    assert.equal(view.historicalAlerts[0].sessionId,'old-visit');
    assert.equal(draftIssues(state,'a').length,0);
    await store.preview(oneOff({date:'2030-01-08'}));
    await store.commit(oneOff({date:'2030-01-08'}),state.revision);
    state=await store.read();
    assert.equal(state.sessions.length,3);
    await store.stageDraftChange('a',{kind:'cancel',sessionId:'future-visit'},state.revision);
    state=await store.read();
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.sessions.length,2);
    assert.equal(JSON.stringify(state.sessions.find((item)=>item.id==='old-visit')),oldBooking);
    assert.equal(JSON.stringify(state.leaves),leaves);
    assert.equal(withConflicts(state).historicalAlerts.length,1);
  } finally { await store.close(); }
});
test('CHANGE-001: a future leave conflict still blocks even beside a historical alert', async () => {
  await clean(); const seed=historicalSeed();
  seed.sessions.push({id:'future-visit',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  seed.leaves.push({id:'future-leave',pod:'a',therapist:'a-t1',startDate:'2030-01-07',startTime:'09:00',endDate:'2030-01-07',endTime:'10:00'});
  const store=await open(seed);
  try {
    let state=await store.read();
    const view=withConflicts(state);
    assert.deepEqual(view.conflicts.map((item)=>item.sessionId),['future-visit']);
    assert.deepEqual(view.historicalAlerts.map((item)=>item.sessionId),['old-visit']);
    await assert.rejects(()=>store.commit(oneOff({date:'2030-01-08'}),state.revision),/Outstanding schedule conflicts/);
    await store.stageDraftChange('a',{kind:'assign',sessionId:'future-visit',therapist:'a-t2'},state.revision);
    state=await store.read();
    await store.stageDraftChange('a',{kind:'assign',sessionId:'future-visit',therapist:'a-t1'},state.revision);
    state=await store.read();
    await store.stageDraftChange('a',{kind:'reschedule',sessionId:'future-visit',therapist:'a-t1',date:'2030-01-07',time:'09:30',minutes:60,location:'clinic',room:'room-1'},state.revision);
    state=await store.read();
    assert.match(draftIssues(state,'a')[0].reasons.join(' '),/Therapist leave/);
    await assert.rejects(()=>store.commitDraft('a',state.revision),/outstanding schedule conflict/);
  } finally { await store.close(); }
});
test('BUG-013: a staged change whose session has started can be removed, keeping other changes, then commit succeeds', async () => {
  await clean(); const seed=initialState();
  seed.sessions.push(
    {id:'first-visit',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1'},
    {id:'second-visit',client:'a-c1',therapist:'a-t1',date:'2030-01-14',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  const store=await open(seed);
  const actualNow=Date.now;
  try {
    let state=await store.read();
    await store.stageDraftChange('a',{kind:'assign',sessionId:'first-visit',therapist:'a-t2'},state.revision);
    state=await store.read();
    await store.stageDraftChange('a',{kind:'assign',sessionId:'second-visit',therapist:'a-t2'},state.revision);
    state=await store.read();
    Date.now=()=>Date.parse('2030-01-08T15:00:00Z'); // first-visit has now started
    await assert.rejects(()=>store.commitDraft('a',state.revision),/already started/);
    await store.previewAutoResolve('a',state.revision); // a pending proposal must go stale when the draft changes
    state=await store.read();
    const removed=await store.removeDraftChange('a','first-visit',state.revision);
    assert.deepEqual(removed.result.changes.map((item)=>item.sessionId),['second-visit']);
    state=await store.read();
    assert.deepEqual(state.drafts[0].changes.map((item)=>item.sessionId),['second-visit']);
    assert.equal(state.sessions.find((item)=>item.id==='first-visit').therapist,'a-t1');
    await assert.rejects(()=>store.applyAutoResolve('a',state.revision),/stale/);
    await store.discardAutoResolve('a',state.revision);
    state=await store.read();
    await assert.rejects(()=>store.removeDraftChange('a','first-visit',state.revision),/no longer in the draft/);
    await store.commitDraft('a',state.revision);
    state=await store.read();
    assert.equal(state.sessions.find((item)=>item.id==='first-visit').therapist,'a-t1');
    assert.equal(state.sessions.find((item)=>item.id==='second-visit').therapist,'a-t2');
    assert.equal(state.drafts.length,0);
  } finally { Date.now=actualNow; await store.close(); }
});
test('BUG-013: removing a staged change cannot touch another pod’s draft', async () => {
  await clean(); const seed=initialState();
  seed.sessions.push({id:'b-visit',client:'b-c1',therapist:'b-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-2'});
  const store=await open(seed);
  try {
    let state=await store.read();
    await store.stageDraftChange('b',{kind:'assign',sessionId:'b-visit',therapist:'b-t2'},state.revision);
    state=await store.read();
    await assert.rejects(()=>store.removeDraftChange('a','b-visit',state.revision),/no longer in the draft/);
    assert.deepEqual((await store.read()).drafts.find((item)=>item.pod==='b').changes.map((item)=>item.sessionId),['b-visit']);
  } finally { await store.close(); }
});
test('room, Home duration, recurrence conflict, and lifecycle guard are durable constraints', async () => {
  await clean(); const store=await open(); try { const p=await store.preview(oneOff({location:'home',room:null,minutes:90})); await store.commit(oneOff({location:'home',room:null,minutes:90}),p.revision); const rev=(await store.read()).revision; await assert.rejects(()=>store.commit(oneOff({time:'10:00',room:'room-2'}),rev),/Therapist overlap/); await store.commit(oneOff({client:'b-c1',therapist:'b-t1',room:'room-1',time:'13:00'}),rev); const current=await store.read(); await assert.rejects(()=>store.commit(weekly({client:'a-c1',therapist:'a-t2',time:'13:00'}),current.revision),/Room overlap/); const next=structuredClone(current); next.rooms.find((room)=>room.id==='room-1').active=false; await assert.rejects(()=>store.updateSetup(next,current.revision),/blocked by committed bookings/); } finally { await store.close(); }
});
test('room deactivation preserves a past reservation and still blocks future reservations', async () => {
  await clean();
  const seed=initialState();
  seed.sessions.push({id:'past-room-visit',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'09:00',minutes:60,location:'clinic',room:'room-1'});
  const store=await open(seed);
  try {
    let state=await store.read();
    const after=structuredClone(state);
    after.rooms.find((item)=>item.id==='room-1').active=false;
    await store.updateSetup(after,state.revision);
    state=await store.read();
    assert.equal(state.sessions[0].room,'room-1');
    assert.equal(state.rooms.find((item)=>item.id==='room-1').active,false);
    const report=await store.report('a-t1','2020-01');
    assert.equal(report.sessions[0].locationName,'Room 1');
    await store.commit(oneOff({date:'2030-01-07',room:'room-2'}),state.revision);
    state=await store.read();
    const blocked=structuredClone(state);
    blocked.rooms.find((item)=>item.id==='room-2').active=false;
    await assert.rejects(()=>store.updateSetup(blocked,state.revision),/blocked by committed bookings/);
  } finally { await store.close(); }
});
test('cancel future on a one-off never deletes peers and local DST gaps are rejected', async () => {
  await clean(); const store=await open(); try { let p=await store.preview(oneOff()); await store.commit(oneOff(),p.revision); let state=await store.read(); await store.commit(oneOff({client:'b-c1',therapist:'b-t1',room:'room-2'}),state.revision); state=await store.read(); await store.commit({kind:'cancel-future',occurrenceId:state.sessions[0].id},state.revision); assert.equal((await store.read()).sessions.length,1); await assert.rejects(()=>store.preview(oneOff({date:'2026-03-08',time:'02:30'})),/does not exist/); } finally { await store.close(); }
});
test('weekly materialization persists and future changes preserve prior occurrences atomically', async () => {
  await clean(); const store=await open(); try { const p=await store.preview(weekly()); await store.commit(weekly(),p.revision); let state=await store.read(); assert.equal(state.sessions.length,3); const selected=state.sessions[1]; await store.commit({kind:'edit-future',occurrenceId:selected.id,client:'a-c1',therapist:'a-t1',date:selected.date,endDate:'2030-01-28',time:'10:00',minutes:60,location:'clinic',room:'room-1'},state.revision); await store.close(); const reopened=await open(); state=await reopened.read(); assert.equal(state.sessions.filter((session)=>session.time==='10:00').length,3); assert.equal(state.sessions.find((session)=>session.date==='2030-01-07').time,'09:00'); await reopened.close(); } catch(error) { await store.close(); throw error; }
});
test('simultaneous commits from one revision produce exactly one durable write', async () => {
  await clean(); const first=await open(), second=await open(); try { const state=await first.read(); const results=await Promise.allSettled([first.commit(oneOff(),state.revision),second.commit(oneOff({room:'room-2'}),state.revision)]); assert.equal(results.filter((result)=>result.status==='fulfilled').length,1); assert.equal((await first.read()).sessions.length,1); } finally { await first.close(); await second.close(); }
});
test('Setup changes persist after reopening and a weekly-cap boundary rejects all new occurrences', async () => {
  await clean(); const store=await open(); let reopened; try { let state=await store.read(); const setup=structuredClone(state); setup.config.recurrenceWeeks=16; setup.config.cascadeDepth=2; setup.therapists.find((item)=>item.id==='a-t1').capHours=1; await store.updateSetup(setup,state.revision); await store.close(); reopened=await open(); state=await reopened.read(); assert.equal(state.config.recurrenceWeeks,16); assert.equal(state.config.cascadeDepth,2); assert.equal(state.therapists.find((item)=>item.id==='a-t1').capHours,1); const invalid=structuredClone(state); invalid.config.cascadeDepth=3; await assert.rejects(()=>reopened.updateSetup(invalid,state.revision),/cascade depth/); const p=await reopened.preview(weekly({endDate:'2030-01-07'})); await reopened.commit(weekly({endDate:'2030-01-07'}),p.revision); const before=await reopened.read(); await assert.rejects(()=>reopened.commit(oneOff({date:'2030-01-07',time:'11:00'}),before.revision),/Weekly cap/); const after=await reopened.read(); assert.equal(after.revision,before.revision); assert.deepEqual(after.sessions,before.sessions); } finally { if (reopened) await reopened.close(); }
});
test('saved S4 state without cascade configuration reads with the approved default', async () => {
  await clean(); const seed=initialState(); delete seed.config.cascadeDepth;
  const store=await open(seed); try { const state=await store.read(); assert.equal(state.config.cascadeDepth,1); assert.equal(state.sessions.length,0); } finally { await store.close(); }
});
test('a conflicting future edit fails atomically and past occurrences cannot change', async () => {
  await clean(); const store=await open(); try { const series=await store.preview(weekly()); await store.commit(weekly(),series.revision); let state=await store.read(); await store.commit(oneOff({client:'b-c1',therapist:'b-t1',date:'2030-01-14',room:'room-2'}),state.revision); state=await store.read(); const selected=state.sessions.find((item)=>item.date==='2030-01-14' && item.seriesId); await assert.rejects(()=>store.commit({kind:'edit-future',occurrenceId:selected.id,client:'a-c1',therapist:'a-t2',date:selected.date,endDate:'2030-01-21',time:'09:00',minutes:60,location:'clinic',room:'room-2'},state.revision),/Room overlap/); const unchanged=await store.read(); assert.equal(unchanged.revision,state.revision); assert.deepEqual(unchanged.sessions,state.sessions); } finally { await store.close(); }
  await clean(); const seed=initialState(); seed.sessions.push({id:'past-oneoff',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'09:00',minutes:60,location:'clinic',room:'room-1'}); const historical=await open(seed); try { const state=await historical.read(); await assert.rejects(()=>historical.commit({kind:'edit-occurrence',occurrenceId:'past-oneoff',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'10:00',minutes:60,location:'clinic',room:'room-1'},state.revision),/Past occurrences/); assert.equal((await historical.read()).sessions[0].time,'09:00'); } finally { await historical.close(); }
});

async function pdfText(bytes) {
  const document = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, disableFontFace: true }).promise;
  try {
    const text = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      text.push((await page.getTextContent()).items.map((item) => item.str).join(' '));
    }
    return text.join(' ');
  } finally { await document.destroy(); }
}

test('PDF download uses committed TEST data, includes report columns and totals, and has download headers', async () => {
  await clean();
  const seed = initialState();
  seed.therapists.find((item) => item.id === 'a-t1').name = 'Dr José 李';
  seed.clients.find((item) => item.id === 'a-c1').name = 'Ana 李';
  const store = await open(seed);
  try {
    const uncommitted = await store.preview(oneOff());
    assert.equal((await store.report('a-t1', '2030-01')).sessions.length, 0);
    let response = await reportPdfResponse(store, 'a-t1', '2030-01');
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.match(response.headers.get('content-disposition'), /^attachment; filename="staff-schedule-2030-01\.pdf"$/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    let content = await pdfText(await response.arrayBuffer());
    assert.match(content, /No committed sessions for this month/);
    assert.match(content, /Total: 0 minutes/);
    assert.doesNotMatch(content, /2030-01-07/);

    await store.commit(oneOff(), uncommitted.revision);
    const revision = (await store.read()).revision;
    await store.commit(oneOff({ date: '2030-01-14', time: '10:00', minutes: 90, location: 'home', room: null }), revision);
    response = await reportPdfResponse(store, 'a-t1', '2030-01');
    const bytes = await response.arrayBuffer();
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
    content = await pdfText(bytes);
    for (const value of ['STILLWELL', 'Dr José 李', 'Ana 李', 'Date', 'Time', 'Client', 'Duration', 'Location', '2030-01-07', '2030-01-14', '09:00', '10:00', 'Home', 'Total: 150 minutes']) assert.ok(content.includes(value), `PDF should include ${value}`);
    assert.ok(content.indexOf('2030-01-07') < content.indexOf('2030-01-14'));
    assert.equal((await store.report('b-t1', '2030-01')).sessions.length, 0);
  } finally { await store.close(); }
});

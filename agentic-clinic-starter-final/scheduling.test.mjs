import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture as legacyFixture} from './schedule.mjs';
import {ClinicStore} from './store.mjs';
import {initialState, localInstant, todayInZone} from './scheduling.mjs';
import {makeServer} from './app.mjs';

const oneOff = (overrides={}) => ({kind:'one-off',client:'a-c1',therapist:'a-t1',date:'2030-01-07',time:'09:00',minutes:60,location:'clinic',room:'room-1',...overrides});
const weekly = (overrides={}) => ({kind:'weekly',client:'a-c1',therapist:'a-t1',startDate:'2030-01-07',endDate:'2030-01-21',time:'09:00',minutes:60,location:'clinic',room:'room-1',...overrides});

test('one-off preview is side-effect free, persists on atomic commit, and stale previews fail', () => {
  const store=new ClinicStore(); try {
    const first=store.preview(oneOff()); const stale=store.preview(oneOff({room:'room-2'}));
    assert.equal(store.read().sessions.length,0); store.commit(oneOff(),first.revision); assert.equal(store.read().sessions.length,1);
    assert.throws(()=>store.commit(oneOff({room:'room-2'}),stale.revision),/stale/); assert.equal(store.read().sessions.length,1);
  } finally {store.close();}
});

test('shared therapist/client/room rules and full Home duration are transaction-time constraints', () => {
  const store=new ClinicStore(); try {
    store.commit(oneOff({location:'home',room:null,minutes:90}),0);
    const revision=store.read().revision;
    assert.throws(()=>store.commit(oneOff({time:'10:00',location:'clinic',room:'room-2'}),revision),/Therapist overlap/);
    assert.equal(store.read().sessions.length,1);
    store.commit(oneOff({client:'b-c1',therapist:'b-t1',room:'room-2'}),revision);
    const rev=store.read().revision;
    assert.throws(()=>store.commit(oneOff({client:'b-c1',therapist:'b-t1',time:'09:30',room:'room-2'}),rev),/Client overlap|Therapist overlap/);
  } finally {store.close();}
});

test('configured boundaries and weekly caps reject without partial saves', () => {
  const state=initialState(); state.therapists.find(t=>t.id==='a-t1').capHours=1; const store=new ClinicStore(':memory:',state); try {
    store.commit(oneOff(),0); const rev=store.read().revision;
    assert.throws(()=>store.commit(oneOff({date:'2030-01-08',time:'10:00'}),rev),/Weekly cap/);
    assert.throws(()=>store.preview(oneOff({date:'2030-01-06'})),/working days/);
    assert.throws(()=>store.preview(oneOff({time:'08:30'})),/office hours/);
    assert.equal(store.read().sessions.length,1);
  } finally {store.close();}
});

test('DST uses configurable Toronto wall time and rejects a non-existent local time', () => {
  assert.throws(()=>localInstant('2026-03-08','02:30','America/Toronto'),/does not exist/);
  assert.doesNotThrow(()=>localInstant('2026-03-08','01:30','America/Toronto'));
  assert.doesNotThrow(()=>localInstant('2026-11-01','01:30','America/Toronto'));
});

test('weekly materialization is atomic; occurrence and future edits preserve past data', () => {
  const store=new ClinicStore(); try {
    const p=store.preview(weekly()); assert.equal(p.occurrences.length,3); store.commit(weekly(),p.revision); assert.equal(store.read().sessions.length,3);
    const stale=store.read(); const selected=stale.sessions[1];
    const edit={kind:'edit-future',occurrenceId:selected.id,client:'a-c1',therapist:'a-t1',time:'10:00',minutes:60,location:'clinic',room:'room-1'};
    store.commit(edit,stale.revision); assert.equal(store.read().sessions.filter(s=>s.time==='10:00').length,2); assert.equal(store.read().sessions[0].time,'09:00');
    const past=initialState(); past.sessions.push({id:'past',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'09:00',minutes:60,location:'clinic',room:'room-1'}); const other=new ClinicStore(':memory:',past);
    try { assert.throws(()=>other.commit({kind:'edit-occurrence',occurrenceId:'past',client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'10:00',minutes:60,location:'clinic',room:'room-1'},0),/Past occurrences/); } finally {other.close();}
  } finally {store.close();}
});

test('maintenance rejects a future move into the past and a one-off future-cancel cannot remove peers', () => {
  const store=new ClinicStore(); try {
    store.commit(oneOff(),0); const second=store.read().revision; store.commit(oneOff({client:'b-c1',therapist:'b-t1',room:'room-2'}),second);
    const before=store.read(); const id=before.sessions[0].id;
    assert.throws(()=>store.commit({kind:'edit-occurrence',occurrenceId:id,client:'a-c1',therapist:'a-t1',date:'2020-01-06',time:'10:00',minutes:60,location:'clinic',room:'room-1'},before.revision),/Past occurrences/);
    store.commit({kind:'cancel-future',occurrenceId:id},before.revision); assert.equal(store.read().sessions.length,1); assert.equal(store.read().sessions[0].client,'b-c1');
  } finally {store.close();}
});

test('a recurring conflict rejects all occurrences and setup lifecycle guard lists bookings', () => {
  const store=new ClinicStore(); try {
    store.commit(oneOff({client:'b-c1',therapist:'b-t1',room:'room-1'}),0); const rev=store.read().revision;
    assert.throws(()=>store.commit(weekly(),rev),/Room overlap/); assert.equal(store.read().series.length,0); assert.equal(store.read().sessions.length,1);
    const changed=store.read(); changed.rooms.find(r=>r.id==='room-1').active=false;
    assert.throws(()=>store.updateSetup(changed,rev),/blocked by committed bookings.*room-1/i);
  } finally {store.close();}
});

test('legacy SQLite migration backs up first and retains template metadata while preserving dated occurrences', () => {
  const dir=mkdtempSync(join(tmpdir(),'clinic-s4-')); const path=join(dir,'clinic.sqlite'); let db=new DatabaseSync(path);
  try {
    db.exec('CREATE TABLE clinic (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)'); db.prepare('INSERT INTO clinic(id,body) VALUES(1,?)').run(JSON.stringify(legacyFixture())); db.close(); db=null;
    const store=new ClinicStore(path); const state=store.read(); assert.ok(existsSync(`${path}.pre-s4.bak`)); assert.equal(state.schema,2); assert.equal(state.sessions.length,4); assert.equal(state.series.length,0); assert.equal(state.migration.legacyStanding.length,4); assert.ok(state.sessions.every(s=>s.id.startsWith('legacy-one-off-'))); store.close();
    const reopened=new ClinicStore(path); assert.equal(reopened.read().sessions.length,4); reopened.close();
  } finally {db?.close(); rmSync(dir,{recursive:true});}
});

test('calendar preview/commit and committed-only report work over HTTP after reload', async () => {
  const store=new ClinicStore(); const server=makeServer(store); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const html=await (await fetch(`${base}/?add=1`)).text(); const token=html.match(/name="token" value="([^"]+)"/)[1];
    const form=new URLSearchParams({...oneOff(),action:'preview',token}); const preview=await fetch(`${base}/calendar`,{method:'POST',body:form,redirect:'manual'}); assert.equal(preview.status,303); const shown=await (await fetch(`${base}${preview.headers.get('location')}`)).text(); assert.match(shown,/Preview ready/); const previewId=preview.headers.get('location').match(/preview=([^&]+)/)[1];
    const commit=await fetch(`${base}/calendar`,{method:'POST',body:new URLSearchParams({token,action:'commit',preview:previewId}),redirect:'manual'}); assert.equal(commit.status,303); const report=await (await fetch(`${base}/reports?therapist=a-t1&month=2030-01`)).text(); assert.match(report,/Committed sessions only/); assert.match(report,/60 minutes/);
  } finally {await new Promise(resolve=>server.close(resolve));}
});

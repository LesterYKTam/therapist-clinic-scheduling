import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture, validate} from './schedule.mjs';
import {ClinicStore} from './store.mjs';
import {makeServer} from './app.mjs';

test('shared rooms reject cross-pod overlaps, permit other rooms and adjacent times', () => {
  const data = fixture(); validate(data);
  const b = data.sessions.find(s => s.client === 'b-client'); b.room = 'room-1';
  assert.throws(() => validate(data), /overlaps/);
  b.time = '10:00'; assert.doesNotThrow(() => validate(data));
  b.time = '09:59'; assert.throws(() => validate(data), /overlaps/);
  b.room = 'room-3'; assert.doesNotThrow(() => validate(data));
});
test('home session uses full booked time and no room; malformed location rejected', () => {
  const data = fixture(); const home = data.sessions.find(s => s.location === 'home');
  assert.equal(home.minutes, 90); assert.equal(home.room, null);
  home.room = 'room-1'; assert.throws(() => validate(data), /location/);
});
test('room mutations survive reopen and use latest shared state without touching sessions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'clinic-s2-')); const path = join(dir, 'test.sqlite');
  let first, second, reopened;
  try {
    first = new ClinicStore(path); second = new ClinicStore(path);
    const sessions = first.read().sessions;
    assert.equal(first.read().rooms.length, 15);
    first.change('add'); second.change('add');
    assert.equal(first.read().rooms.filter(r => r.active).length, 17);
    assert.throws(() => second.change('remove', 'room-2'), /2026-09-14/);
    first.change('remove', 'room-16');
    assert.throws(() => second.change('remove', 'room-16'), /no longer active/);
    assert.deepEqual(first.read().sessions, sessions);
    first.close(); first = null; second.close(); second = null;
    reopened = new ClinicStore(path);
    assert.equal(reopened.read().rooms.filter(r => r.active).length, 16);
    assert.deepEqual(reopened.read().sessions, sessions);
  } finally {first?.close();second?.close();reopened?.close();rmSync(dir, {recursive:true});}
});
test('retiring a room preserves historical reservation references', () => {
  const data = fixture(); data.sessions[0].date = '2026-09-07';
  const store = new ClinicStore(':memory:', data);
  try {
    store.change('remove', 'room-1');
    const current = store.read();
    assert.equal(current.rooms.find(r => r.id === 'room-1').active, false);
    assert.equal(current.sessions[0].room, 'room-1');
  } finally {store.close();}
});
test('ongoing bookings block room removal and invalid dates fail validation', () => {
  const data = fixture(); data.sessions[0].date = '2026-09-13'; data.sessions[0].time = '23:30';
  const store = new ClinicStore(':memory:', data);
  try {assert.throws(() => store.change('remove','room-1'), /cannot be removed/);} finally {store.close();}
  data.sessions[0].date = '2026-02-30'; assert.throws(() => validate(data), /date/);
});
test('browser forms add/remove shared inventory and show private-safe blockers', async () => {
  const server = makeServer(); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const html = await (await fetch(base)).text();
    const token = html.match(/name="token" value="([^"]+)"/)[1];
    assert.ok(html.includes('Home')); assert.ok(html.includes('90 min'));
    const post = (action,room = '', extra = {}) => fetch(`${base}/rooms`, {method:'POST',body:new URLSearchParams({token,pod:'a',action,room,...extra})});
    const added = await (await post('add')).text(); assert.ok(added.includes('16 active'));
    const other = await (await fetch(`${base}/?pod=b`)).text(); assert.ok(other.includes('16 active')); assert.ok(!other.includes('Alex Demo'));
    const blocked = await (await post('remove','room-2')).text();
    assert.ok(blocked.includes('cannot be removed')); assert.ok(!blocked.includes('Sam Sample')); assert.ok(blocked.includes('16 active'));
    const removed = await (await post('remove','room-16')).text(); assert.ok(removed.includes('15 active'));
    assert.equal((await post('add','',{token:'wrong'})).status,403);
  } finally {await new Promise(resolve => server.close(resolve));}
});

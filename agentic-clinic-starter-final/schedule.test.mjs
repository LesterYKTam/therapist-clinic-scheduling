import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, validate, podView} from './schedule.mjs';
import {makeServer, render} from './app.mjs';

test('deterministic fixtures and pod isolation preserve committed state', () => {
  const data = fixture();
  const before = structuredClone(data);
  assert.deepEqual(data, fixture());
  const a = podView(data, 'a');
  assert.equal(a.standing.length, 2);
  assert.equal(a.sessions.length, 2);
  assert.ok(a.therapists.every(t => t.pod === 'a'));
  assert.ok(a.clients.every(c => c.pod === 'a'));
  assert.ok(a.sessions.every(s => s.client === 'a-client'));
  a.clients[0].name = 'Changed in detached view';
  render(data, 'a'); render(data, 'b');
  assert.deepEqual(data, before);
});
test('invalid cross-pod and duplicate assignments are rejected', () => {
  const cross = fixture(); cross.clients[0].assigned[2] = 'b2';
  assert.throws(() => validate(cross), /client pod/);
  const duplicate = fixture(); duplicate.clients[0].assigned[2] = 'a0';
  assert.throws(() => validate(duplicate), /distinct/);
});
test('unassigned therapists and unrelated templates are rejected', () => {
  const data = fixture(); data.sessions[0].therapist = 'b0';
  assert.throws(() => validate(data), /session assignment/);
  const other = fixture(); other.sessions[0].standing = 'b-client-0';
  assert.throws(() => validate(other), /standing template/);
});
test('HTTP demo renders templates and occurrences, isolates data, rejects writes', async () => {
  const data = fixture(); const before = structuredClone(data);
  const server = makeServer(data);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const a = await fetch(base); assert.equal(a.status, 200);
    const html = await a.text();
    for (const value of ['Standing sessions','Committed sessions','2026-09-14','Monday','Alex Demo','24 hours','30 hours','20 hours']) assert.ok(html.includes(value), value);
    assert.ok(!html.includes('Sam Sample'));
    const b = await (await fetch(`${base}/?pod=b`)).text();
    assert.ok(b.includes('Sam Sample')); assert.ok(!b.includes('Alex Demo'));
    assert.equal((await fetch(`${base}/?pod=invalid`)).status, 404);
    assert.equal((await fetch(base, {method:'POST'})).status, 405);
    assert.deepEqual(data, before);
  } finally {await new Promise(resolve => server.close(resolve));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { POST } from '../app/api/clinic/route.ts';
import { readJsonLimited, BodyTooLargeError, MAX_BODY_BYTES } from '../lib/body-limit.mjs';
import { validateState, LIMITS } from '../lib/scheduling.mjs';
import { buildDemoState } from '../lib/demo-seed.mjs';
import { demoModeGate, demoModeStatus } from '../lib/demo-mode.mjs';

const fresh = () => structuredClone(buildDemoState({ today: '2026-10-07', revision: 0 }));
const rejects = (state, pattern) => assert.throws(() => validateState(state), pattern);

test('the seeded demo state passes the size limits', () => { validateState(fresh()); });

test('names at 120 characters are accepted, 121 rejected, for every named entity', () => {
  for (const [list, label] of [['therapists', /Therapist/], ['clients', /Client/], ['rooms', /Room/], ['pods', /Pod/]]) {
    const ok = fresh(); ok[list][0].name = 'N'.repeat(LIMITS.nameLength); validateState(ok);
    const bad = fresh(); bad[list][0].name = 'N'.repeat(LIMITS.nameLength + 1); rejects(bad, label);
  }
});

test('room, therapist, client and leave counts are capped', () => {
  const rooms = fresh(); const room = rooms.rooms[0];
  rooms.rooms = Array.from({ length: LIMITS.rooms }, (_, i) => ({ ...room, id: `r-${i}`, name: `Room ${i}` })); rooms.sessions = []; rooms.series = []; validateState(rooms);
  rooms.rooms.push({ ...room, id: 'r-extra', name: 'Extra' }); rejects(rooms, /At most 50 rooms/);

  const therapists = fresh(); const t = therapists.therapists[0];
  therapists.therapists = Array.from({ length: LIMITS.therapists + 1 }, (_, i) => ({ ...t, id: `t-${i}`, name: `T ${i}` }));
  therapists.clients = []; therapists.sessions = []; therapists.series = []; therapists.leaves = []; rejects(therapists, /At most 200 therapists/);

  const clients = fresh(); const c = clients.clients[0];
  clients.clients = Array.from({ length: LIMITS.clients + 1 }, (_, i) => ({ ...c, id: `c-${i}`, name: `C ${i}` }));
  clients.sessions = []; clients.series = []; rejects(clients, /At most 1000 clients/);

  const leaves = fresh(); const th = leaves.therapists[0];
  leaves.sessions = []; leaves.series = [];
  const leave = (i) => ({ id: `l-${i}`, pod: th.pod, therapist: th.id, startDate: '2027-01-04', startTime: '09:00', endDate: '2027-01-04', endTime: '10:00' });
  leaves.leaves = Array.from({ length: LIMITS.leavesPerTherapist }, (_, i) => leave(i)); validateState(leaves);
  leaves.leaves.push(leave(9999)); rejects(leaves, /At most 500 leave entries/);
});

test('readJsonLimited enforces the limit on the declared length and while streaming', async () => {
  assert.deepEqual(await readJsonLimited(new Request('http://x.test', { method: 'POST', body: '{"a":1}' })), { a: 1 });
  await assert.rejects(readJsonLimited(new Request('http://x.test', { method: 'POST', body: '{}', headers: { 'content-length': String(MAX_BODY_BYTES + 1) } })), BodyTooLargeError);
  const chunk = new TextEncoder().encode(`"${'x'.repeat(64 * 1024)}"`);
  let sent = 0;
  const stream = new ReadableStream({ pull(controller) { if (sent++ < 20) controller.enqueue(chunk); else controller.close(); } });
  await assert.rejects(readJsonLimited(new Request('http://x.test', { method: 'POST', body: stream, duplex: 'half' })), BodyTooLargeError);
});

test('POST /api/clinic answers 413 for an oversized body, declared or not', async () => {
  const url = 'http://localhost:3000/api/clinic';
  const big = JSON.stringify({ action: 'setup', pad: 'x'.repeat(MAX_BODY_BYTES + 10) });
  const streamed = await POST(new NextRequest(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: big }));
  assert.equal(streamed.status, 413);
  assert.match((await streamed.json()).error, /too large/);
  const declared = await POST(new NextRequest(url, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES * 20) }, body: '{}' }));
  assert.equal(declared.status, 413);
});

test('PUBLIC_DEMO wins over CLINIC_DEMO_MODE: the sign-in bypass is refused', async () => {
  assert.equal(demoModeStatus({ CLINIC_DEMO_MODE: '1', PUBLIC_DEMO: '1', NODE_ENV: 'development' }), 'forbidden');
  assert.equal(demoModeStatus({ CLINIC_DEMO_MODE: '1', NODE_ENV: 'development' }), 'on');
  const saved = { a: process.env.CLINIC_DEMO_MODE, b: process.env.PUBLIC_DEMO };
  process.env.CLINIC_DEMO_MODE = '1'; process.env.PUBLIC_DEMO = '1';
  try {
    const gate = demoModeGate();
    assert.equal(gate.demo, false);
    assert.equal(gate.refusal.status, 503);
    assert.equal((await POST(new NextRequest('http://localhost:3000/api/clinic', { method: 'POST', body: '{}' }))).status, 503);
  } finally {
    for (const [k, v] of [['CLINIC_DEMO_MODE', saved.a], ['PUBLIC_DEMO', saved.b]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

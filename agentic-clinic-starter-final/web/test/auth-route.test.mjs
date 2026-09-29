import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server.js';
import { auth, authPool } from '../lib/auth.ts';
import { GET, POST } from '../app/api/clinic/route.ts';
import { GET as GET_PDF } from '../app/api/clinic/report/route.ts';

after(async () => { await authPool.end(); });

test('authenticated clinic reads require assignment and default to the assigned pod', async () => {
  const previousMode = process.env.CLINIC_DEMO_MODE;
  process.env.CLINIC_DEMO_MODE = '0';
  const email = `synthetic-route-${randomBytes(12).toString('hex')}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  let userId, secondUserId;
  const request = (cookie = '', query = '') => new NextRequest(`http://localhost:3000/api/clinic${query}`, { headers: { cookie } });
  const post = (cookie = '', body = {}) => new NextRequest('http://localhost:3000/api/clinic', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const pdf = (cookie = '', staff = 'a-t1') => new NextRequest(`http://localhost:3000/api/clinic/report?staff=${staff}&month=2026-09`, { headers: { cookie } });
  try {
    assert.equal((await GET(request())).status, 401);
    assert.equal((await POST(post('', { action: 'begin-draft', pod: 'a' }))).status, 401);
    assert.equal((await GET_PDF(pdf())).status, 401);
    const created = await auth.api.createUser({ body: { email, password, name: 'Synthetic Route Admin', role: 'admin' } });
    userId = created.user.id;
    const signIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookie = signIn.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    assert.equal((await GET(request(cookie))).status, 403);
    assert.equal((await POST(post(cookie, { action: 'begin-draft', pod: 'a' }))).status, 403);
    assert.equal((await GET_PDF(pdf(cookie))).status, 403);
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['a', userId]);
    const scoped = await GET(request(cookie));
    assert.equal(scoped.status, 200);
    const body = await scoped.json();
    assert.deepEqual(body.pods.map((pod) => pod.id), ['a']);
    assert.equal(body.clients.every((client) => client.pod === 'a'), true);
    assert.equal(body.therapists.every((therapist) => therapist.pod === 'a'), true);
    const secondEmail = `synthetic-other-admin-${randomBytes(12).toString('hex')}@example.invalid`;
    const secondPassword = randomBytes(24).toString('base64url');
    const secondAdmin = await auth.api.createUser({ body: { email: secondEmail, password: secondPassword, name: 'Synthetic Other Admin', role: 'admin' } });
    secondUserId = secondAdmin.user.id;
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['b', secondUserId]);
    const secondSignIn = await auth.api.signInEmail({ body: { email: secondEmail, password: secondPassword }, asResponse: true });
    const secondCookie = secondSignIn.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    const secondView = await (await GET(request(secondCookie))).json();
    assert.deepEqual(secondView.pods.map((pod) => pod.id), ['b']);
    assert.equal(secondView.clients.every((client) => client.pod === 'b'), true);
    assert.deepEqual(secondView.rooms, body.rooms);
    assert.equal((await POST(post(secondCookie, { action: 'begin-draft', pod: 'a', revision: secondView.revision }))).status, 403);
    // D-B020: reports for staff in any pod are readable.
    assert.equal((await GET(request(cookie, '?reportStaff=b-t1&month=2026-09'))).status, 200);
    assert.equal((await GET_PDF(pdf(cookie, 'b-t1'))).status, 200);
    assert.equal((await GET(request(cookie, '?reportStaff=nobody&month=2026-09'))).status, 404);
    // D-B020: another pod is readable read-only with real names; own pod is not read-only; unknown pod is 400.
    assert.equal(body.readOnly, false); assert.equal(body.viewPod, 'a'); assert.equal(body.assignedPod, 'a');
    const viewB = await (await GET(request(cookie, '?viewPod=b'))).json();
    assert.deepEqual(viewB.pods.map((pod) => pod.id), ['b']);
    assert.equal(viewB.viewPod, 'b'); assert.equal(viewB.assignedPod, 'a'); assert.equal(viewB.readOnly, true);
    assert.equal(viewB.clients.length > 0 && viewB.clients.every((client) => client.pod === 'b'), true);
    assert.equal(viewB.therapists.some((therapist) => therapist.name === 'Morgan Cedar'), true);
    assert.equal((await (await GET(request(cookie, '?viewPod=a'))).json()).readOnly, false);
    assert.equal((await GET(request(cookie, '?viewPod=zzz'))).status, 400);
    // Writes stay limited to the assigned pod even for a pod the admin can read.
    assert.equal((await POST(post(cookie, { action: 'begin-draft', pod: 'b', revision: viewB.revision }))).status, 403);
    assert.equal((await POST(post(cookie, { action: 'record-leave', leave: { therapist: 'b-t1' }, revision: viewB.revision }))).status, 403);
    assert.equal((await POST(post(cookie, { action: 'setup', setup: viewB, revision: viewB.revision }))).status, 403);
    const denied = [
      { action: 'begin-draft', pod: 'b', revision: body.revision },
      { action: 'record-leave', leave: { therapist: 'b-t1' }, revision: body.revision },
      { action: 'preview', kind: 'cancel-occurrence', occurrenceId: body.sessions.find((item) => item.client.startsWith('b-'))?.id || 'b-s1', client: 'a-c1' },
      { action: 'setup', setup: { ...body, clients: [...body.clients, { id: 'foreign-injection', pod: 'b' }] }, revision: body.revision },
    ];
    for (const action of denied) assert.equal((await POST(post(cookie, action))).status, 403);
    const opened = await POST(post(cookie, { action: 'begin-draft', pod: 'a', revision: body.revision }));
    assert.equal(opened.status, 200);
    const openedBody = await opened.json();
    assert.deepEqual(openedBody.state.pods.map((pod) => pod.id), ['a']);
    assert.equal(openedBody.state.clients.every((client) => client.pod === 'a'), true);
    assert.equal(openedBody.state.drafts.length, 1);
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['b', userId]);
    assert.equal((await POST(post(cookie, { action: 'discard-draft', pod: 'a', revision: openedBody.state.revision }))).status, 403);
    assert.equal((await authPool.query('SELECT body FROM clinic_state WHERE id=true')).rows[0].body.drafts.some((draft) => draft.pod === 'a'), true);
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['a', userId]);
    const discarded = await POST(post(cookie, { action: 'discard-draft', pod: 'a', revision: openedBody.state.revision }));
    assert.equal(discarded.status, 200);
    const discardedBody = await discarded.json();
    assert.equal(discardedBody.state.drafts.length, 0);
    const foreignStaffBefore = (await authPool.query('SELECT body FROM clinic_state WHERE id=true')).rows[0].body.therapists.filter((person) => person.pod === 'b');
    const setup = structuredClone(discardedBody.state);
    setup.therapists[0].capHours += 1;
    setup.rooms[0].name = 'Synthetic shared room';
    const savedSetup = await POST(post(cookie, { action: 'setup', setup, revision: setup.revision }));
    assert.equal(savedSetup.status, 200);
    const savedSetupBody = await savedSetup.json();
    assert.equal(savedSetupBody.state.therapists[0].capHours, setup.therapists[0].capHours);
    assert.equal(savedSetupBody.state.rooms[0].name, 'Synthetic shared room');
    const afterSetup = (await authPool.query('SELECT body FROM clinic_state WHERE id=true')).rows[0].body;
    assert.deepEqual(afterSetup.therapists.filter((person) => person.pod === 'b'), foreignStaffBefore);
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['b', userId]);
    assert.equal((await POST(post(cookie, { action: 'begin-draft', pod: 'a', revision: setup.revision + 1 }))).status, 403);
    assert.deepEqual((await (await GET(request(cookie))).json()).pods.map((pod) => pod.id), ['b']);
  } finally {
    if (secondUserId) await authPool.query('DELETE FROM "user" WHERE id=$1', [secondUserId]);
    if (userId) await authPool.query('DELETE FROM "user" WHERE id=$1', [userId]);
    if (previousMode === undefined) delete process.env.CLINIC_DEMO_MODE;
    else process.env.CLINIC_DEMO_MODE = previousMode;
  }
});

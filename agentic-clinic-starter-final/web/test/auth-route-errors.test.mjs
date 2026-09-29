import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { NextRequest } from 'next/server.js';
import { auth, authPool } from '../lib/auth.ts';
import { POST } from '../app/api/clinic/route.ts';
import { PostgresClinicStore } from '../lib/clinic-store.mjs';

after(async () => { await authPool.end(); });

const oneOff = (more = {}) => ({ kind: 'one-off', client: 'a-c1', therapist: 'a-t1', date: '2030-01-07', time: '09:00', minutes: 60, location: 'clinic', room: 'room-1', ...more });
const GENERIC = 'Unable to complete this clinic action. Refresh and try again.';

test('authenticated action errors: rule messages reach the admin, other pod real names show (D-B020), internal errors stay generic', async () => {
  const previousMode = process.env.CLINIC_DEMO_MODE;
  process.env.CLINIC_DEMO_MODE = '0';
  const url = process.env.DATABASE_URL;
  assert.equal(new URL(url).port, '5433');
  const reset = new pg.Pool({ connectionString: url });
  await reset.query('DROP TABLE IF EXISTS clinic_state, schema_migrations');
  await reset.end();
  const seed = new PostgresClinicStore(url);
  await seed.migrate();
  let userId;
  const original = PostgresClinicStore.prototype.commit;
  const logged = [];
  const originalConsoleError = console.error;
  try {
    const email = `synthetic-errors-${randomBytes(12).toString('hex')}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    userId = (await auth.api.createUser({ body: { email, password, name: 'Synthetic Error Admin', role: 'admin' } })).user.id;
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['a', userId]);
    const signIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookie = signIn.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    const post = (body) => POST(new NextRequest('http://localhost:3000/api/clinic', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
    const revision = async () => (await seed.read()).revision;

    // Past session: a plain rule message.
    let res = await post({ action: 'commit', ...oneOff({ date: '2020-01-06' }), revision: await revision() });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /Past occurrences remain unchanged/);

    // Stale revision.
    res = await post({ action: 'commit', ...oneOff(), revision: (await revision()) + 5 });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /stale/);

    // Same-pod clash: the actor's own pod ids stay readable.
    const own = await seed.commit(oneOff(), await revision());
    const ownId = own.state.sessions[0].id;
    res = await post({ action: 'commit', ...oneOff({ therapist: 'a-t2' }), revision: await revision() });
    assert.equal(res.status, 400);
    let message = (await res.json()).error;
    assert.notEqual(message, GENERIC);
    assert.ok(message.includes(ownId), message);

    // Cross-pod clash: pod B holds room-2 at 11:00; pod A tries the same room and time.
    const foreign = await seed.commit(oneOff({ client: 'b-c1', therapist: 'b-t1', room: 'room-2', time: '11:00' }), await revision());
    const foreignId = foreign.state.sessions.find((item) => item.client === 'b-c1').id;
    res = await post({ action: 'commit', ...oneOff({ room: 'room-2', time: '11:00' }), revision: await revision() });
    assert.equal(res.status, 400);
    message = (await res.json()).error;
    assert.notEqual(message, GENERIC);
    assert.equal(message.includes(foreignId), true, message); // D-B020: nothing about other pods is hidden

    // Authorization: cross-pod action is a static 403 message.
    res = await post({ action: 'begin-draft', pod: 'b', revision: await revision() });
    assert.equal(res.status, 403);
    assert.match((await res.json()).error, /outside your assigned pod/);

    // Internal error: generic message, logged, no internal text.
    console.error = (...args) => logged.push(args);
    PostgresClinicStore.prototype.commit = async () => { throw new TypeError("Cannot read properties of undefined (reading 'secret-internal')"); };
    res = await post({ action: 'commit', ...oneOff({ date: '2030-02-04' }), revision: await revision() });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, GENERIC);
    assert.equal(logged.some((args) => args.some((item) => item instanceof TypeError)), true);

    // Database errors (they carry a .code) are internal too.
    PostgresClinicStore.prototype.commit = async () => { throw Object.assign(new Error('connection to server at "127.0.0.1" failed'), { code: 'ECONNREFUSED' }); };
    res = await post({ action: 'commit', ...oneOff({ date: '2030-02-04' }), revision: await revision() });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, GENERIC);
  } finally {
    console.error = originalConsoleError;
    PostgresClinicStore.prototype.commit = original;
    await seed.close();
    if (userId) await authPool.query('DELETE FROM "user" WHERE id=$1', [userId]);
    if (previousMode === undefined) delete process.env.CLINIC_DEMO_MODE;
    else process.env.CLINIC_DEMO_MODE = previousMode;
  }
});

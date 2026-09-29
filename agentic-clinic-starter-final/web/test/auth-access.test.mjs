import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { auth, authPool } from '../lib/auth.ts';
import { PostgresClinicStore } from '../lib/clinic-store.mjs';

after(async () => { await authPool.end(); });

test('clinic admin accounts reject public sign-up and keep pod membership server-owned', async () => {
  const email = `synthetic-${randomBytes(12).toString('hex')}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  let userId;
  let clinic;
  try {
    await assert.rejects(auth.api.signUpEmail({ body: { email, password, name: 'Synthetic Admin' } }));
    const created = await auth.api.createUser({ body: { email, password, name: 'Synthetic Admin', role: 'admin' } });
    userId = created.user.id;
    const initial = await authPool.query('SELECT role, "podId" FROM "user" WHERE id=$1', [userId]);
    assert.equal(initial.rows[0].role, 'admin');
    assert.equal(initial.rows[0].podId, null);
    const signedIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    const beforeAssignment = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(beforeAssignment.user.podId, null);
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['a', userId]);
    const afterAssignment = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(afterAssignment.user.podId, 'a');
    clinic = new PostgresClinicStore(process.env.DATABASE_URL, { id: userId, podId: 'a' });
    const state = await clinic.read();
    await assert.rejects(clinic.handleNotification('a', 'missing', state.revision), /not found/);
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['b', userId]);
    await assert.rejects(clinic.handleNotification('a', 'missing', state.revision), /pod access changed/);
  } finally {
    if (clinic) await clinic.close();
    if (userId) await authPool.query('DELETE FROM "user" WHERE id=$1', [userId]);
  }
});

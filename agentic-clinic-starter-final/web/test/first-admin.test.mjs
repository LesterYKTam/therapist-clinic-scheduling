import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { auth, authPool } from '../lib/auth.ts';
import { createFirstAdmin } from '../../scripts/create-first-admin.mjs';

after(async () => { await authPool.end(); });

const suffix = () => randomBytes(8).toString('hex');
const strong = () => randomBytes(24).toString('base64url');

test('first-admin bootstrap creates an admin, refuses repeats, validates input, and the account can sign in', async () => {
  const created = [];
  // Demote any leftover admins so the one-time guard is exercised from a clean state; restored in finally.
  const existing = await authPool.query('SELECT id FROM "user" WHERE role=$1', ['admin']);
  const existingIds = existing.rows.map((r) => r.id);
  try {
    if (existingIds.length) await authPool.query('UPDATE "user" SET role=$1 WHERE id = ANY($2)', ['user', existingIds]);
    const email = `synthetic-first-${suffix()}@example.invalid`;
    const password = strong();

    await assert.rejects(createFirstAdmin({ name: 'Synthetic', email, password: 'short' }), /at least 8/);
    await assert.rejects(createFirstAdmin({ name: 'Synthetic', email, password, pod: 'no-such-pod' }), /Unknown pod/);
    assert.equal((await authPool.query('SELECT 1 FROM "user" WHERE email=$1', [email])).rowCount, 0, 'rejections create nothing');

    const first = await createFirstAdmin({ name: 'Synthetic First', email, password, pod: 'a' });
    created.push(first.id);
    const row = (await authPool.query('SELECT role, "podId" FROM "user" WHERE id=$1', [first.id])).rows[0];
    assert.equal(row.role, 'admin');
    assert.equal(row.podId, 'a');
    assert.equal(first.pod, 'a');
    assert.equal(JSON.stringify(first).includes(password), false);

    const signedIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    assert.equal(signedIn.status, 200);

    const email2 = `synthetic-second-${suffix()}@example.invalid`;
    await assert.rejects(createFirstAdmin({ name: 'Synthetic Second', email: email2, password: strong() }), /admin already exists/);
    assert.equal((await authPool.query('SELECT 1 FROM "user" WHERE email=$1', [email2])).rowCount, 0);

    const extra = await createFirstAdmin({ name: 'Synthetic Second', email: email2, password: strong(), allowAdditional: true });
    created.push(extra.id);
    assert.equal(extra.pod, null);
  } finally {
    if (created.length) await authPool.query('DELETE FROM "user" WHERE id = ANY($1)', [created]);
    if (existingIds.length) await authPool.query('UPDATE "user" SET role=$1 WHERE id = ANY($2)', ['admin', existingIds]);
  }
});

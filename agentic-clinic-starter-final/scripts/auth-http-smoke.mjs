import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { auth, authPool } from '../web/lib/auth.ts';

assert.equal(new URL(process.env.DATABASE_URL).pathname, '/clinic_test', 'Use the isolated TEST database.');
const base = process.env.CLINIC_SMOKE_URL || 'http://localhost:3001';
const created = [];
try {
  const guest = await fetch(base, { redirect: 'manual' });
  assert.equal(guest.status, 307);
  assert.equal(guest.headers.get('location'), '/sign-in');

  for (const podId of ['a', 'b']) {
    const email = `synthetic-http-${podId}-${randomBytes(12).toString('hex')}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const user = await auth.api.createUser({ body: { email, password, name: `Synthetic ${podId} Admin`, role: 'admin' } });
    created.push(user.user.id);
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', [podId, user.user.id]);
    const signed = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookie = signed.headers.getSetCookie().map((part) => part.split(';')[0]).join('; ');
    const page = await fetch(base, { headers: { cookie } });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Calendar/);
    assert.match(html, new RegExp(podId === 'a' ? 'Maple pod' : 'Cedar pod'));
    assert.equal(html.includes(podId === 'a' ? 'Cedar pod' : 'Maple pod'), false);
    const data = await fetch(`${base}/api/clinic`, { headers: { cookie } });
    assert.equal(data.status, 200);
    const state = await data.json();
    assert.deepEqual(state.pods.map((pod) => pod.id), [podId]);
    assert.equal(state.clients.every((client) => client.pod === podId), true);
  }
  process.stdout.write('Authenticated production HTTP smoke passed for both synthetic pods.\n');
} finally {
  for (const id of created) await authPool.query('DELETE FROM "user" WHERE id=$1', [id]);
  await authPool.end();
}

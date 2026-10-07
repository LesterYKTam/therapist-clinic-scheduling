import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auth, authPool } from '../lib/auth.ts';
import { GET as authGet, POST as authPost } from '../app/api/auth/[...all]/route.ts';
import { GET as resetGet } from '../app/api/demo/reset/route.ts';
import { POST as podPost } from '../app/api/admin/pod/route.ts';
import { isPublicDemo, isAuthRequestAllowedInPublicDemo, DEMO_ADMINS } from '../lib/public-demo.mjs';
import { bearerMatches, resetGate } from '../lib/public-demo-reset.mjs';
import { idempotentAuthSchema, AUTH_SCHEMA_IF_NOT_EXISTS, ensureAuthTables } from '../lib/auth-migrate.mjs';

after(async () => { await authPool.end(); });

const FLAGS = ['PUBLIC_DEMO', 'CRON_SECRET', 'DEMO_ADMIN_PASSWORD', 'CLINIC_DEMO_MODE'];
function withEnv(values, fn) {
  const saved = Object.fromEntries(FLAGS.map((key) => [key, process.env[key]]));
  for (const key of FLAGS) delete process.env[key];
  Object.assign(process.env, values);
  const restore = () => { for (const key of FLAGS) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } };
  return Promise.resolve().then(fn).finally(restore);
}

const BASE = 'http://localhost:3000';
const json = (path, body = {}, method = 'POST') => new Request(`${BASE}/api/auth${path}`, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body) });
const BLOCKED = [
  '/change-password', '/change-email', '/update-user', '/delete-user', '/delete-user/callback',
  '/request-password-reset', '/reset-password', '/reset-password/abc', '/forget-password', '/forget-password/email-otp',
  '/send-verification-email', '/verify-email', '/revoke-session', '/revoke-sessions', '/revoke-other-sessions', '/list-sessions', '/list-accounts', '/link-social', '/unlink-account',
  '/sign-up/email',
  '/admin/create-user', '/admin/set-role', '/admin/set-user-password', '/admin/ban-user', '/admin/unban-user', '/admin/remove-user',
  '/admin/impersonate-user', '/admin/stop-impersonating', '/admin/revoke-user-session', '/admin/revoke-user-sessions',
  '/admin/update-user', '/admin/list-users', '/admin/get-user', '/admin/list-user-sessions', '/admin/has-permission',
];

test('PUBLIC_DEMO refuses every account-management and admin-plugin auth endpoint with 403', async () => {
  await withEnv({ PUBLIC_DEMO: '1' }, async () => {
    for (const path of BLOCKED) {
      for (const [handler, method] of [[authPost, 'POST'], [authGet, 'GET']]) {
        const response = await handler(json(path, {}, method));
        assert.equal(response.status, 403, `${method} ${path}`);
        assert.equal((await response.json()).code, 'PUBLIC_DEMO_READ_ONLY');
      }
    }
    // Bypass attempts (case, trailing slash, double slash) must not reach Better Auth.
    for (const path of ['/Change-Password', '/change-password/', '//admin/create-user', '/admin/create-user/']) {
      assert.equal((await authPost(json(path))).status, 403, path);
    }
  });
});

test('PUBLIC_DEMO keeps sign-in, sign-out and get-session reachable', async () => {
  await withEnv({ PUBLIC_DEMO: '1' }, async () => {
    const session = await authGet(json('/get-session', {}, 'GET'));
    assert.equal(session.status, 200);
    const badSignIn = await authPost(json('/sign-in/email', { email: 'nobody@example.invalid', password: 'wrong-password' }));
    assert.equal(badSignIn.status, 401);
    assert.notEqual((await badSignIn.json()).code, 'PUBLIC_DEMO_READ_ONLY');
    assert.notEqual((await authPost(json('/sign-out'))).status, 403);
  });
  assert.equal(isAuthRequestAllowedInPublicDemo('GET', '/api/auth/sign-in/email'), false);
});

test('without PUBLIC_DEMO the same auth endpoints are not refused by the demo guard', async () => {
  await withEnv({}, async () => {
    assert.equal(isPublicDemo(), false);
    for (const path of BLOCKED.filter((p) => !p.startsWith('/sign-up'))) {
      const response = await authPost(json(path));
      const body = await response.json().catch(() => ({}));
      assert.notEqual(body.code, 'PUBLIC_DEMO_READ_ONLY', path);
    }
    // Account management really works when the flag is off: an authenticated admin may create a user.
    const adminEmail = `synthetic-pd-${randomBytes(8).toString('hex')}@example.invalid`;
    const password = randomBytes(18).toString('base64url');
    const created = await auth.api.createUser({ body: { email: adminEmail, password, name: 'Synthetic PD Admin', role: 'admin' } });
    try {
      const signIn = await auth.api.signInEmail({ body: { email: adminEmail, password }, asResponse: true });
      const cookie = signIn.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
      const changed = await authPost(new Request(`${BASE}/api/auth/change-password`, { method: 'POST', headers: { 'content-type': 'application/json', cookie, origin: BASE }, body: JSON.stringify({ currentPassword: password, newPassword: `${password}x` }) }));
      assert.equal(changed.status, 200);
    } finally { await authPool.query('DELETE FROM "user" WHERE id=$1', [created.user.id]); }
  });
});

test('the pod-assignment API returns 403 in the public demo and is untouched otherwise', async () => {
  const request = () => new Request(`${BASE}/api/admin/pod`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: 'x', podId: 'a' }) });
  await withEnv({ PUBLIC_DEMO: '1' }, async () => assert.equal((await podPost(request())).status, 403));
  await withEnv({}, async () => assert.equal((await podPost(request())).status, 401));
});

test('the reset endpoint is inert without the flag or secret, and 401 for a bad or missing bearer', async () => {
  const call = (authorization) => resetGet(new Request(`${BASE}/api/demo/reset`, { headers: authorization ? { authorization } : {} }));
  await withEnv({ CRON_SECRET: 'cron-secret-for-tests', DEMO_ADMIN_PASSWORD: 'demo-password-123' }, async () => assert.equal((await call('Bearer cron-secret-for-tests')).status, 404));
  await withEnv({ PUBLIC_DEMO: '1' }, async () => assert.equal((await call('Bearer anything')).status, 404));
  await withEnv({ PUBLIC_DEMO: '1', CRON_SECRET: 'cron-secret-for-tests', DEMO_ADMIN_PASSWORD: 'demo-password-123' }, async () => {
    assert.equal((await call()).status, 401);
    assert.equal((await call('Bearer wrong')).status, 401);
    assert.equal((await call('cron-secret-for-tests')).status, 401);
    assert.equal((await call('Bearer cron-secret-for-tests-extra')).status, 401);
  });
  assert.equal(bearerMatches('Bearer abc', 'abc'), true);
  assert.equal(bearerMatches('Bearer abc', ''), false);
  assert.equal(resetGate('Bearer s', { PUBLIC_DEMO: '1', CRON_SECRET: 's', DEMO_ADMIN_PASSWORD: 'short' }).status, 'misconfigured');
});

test('the reset endpoint reports a missing or short demo password as 500 without touching data', async () => {
  const before = (await authPool.query('SELECT revision FROM clinic_state WHERE id=true')).rows[0]?.revision;
  await withEnv({ PUBLIC_DEMO: '1', CRON_SECRET: 'cron-secret-for-tests' }, async () => {
    const response = await resetGet(new Request(`${BASE}/api/demo/reset`, { headers: { authorization: 'Bearer cron-secret-for-tests' } }));
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /DEMO_ADMIN_PASSWORD/);
  });
  assert.equal((await authPool.query('SELECT revision FROM clinic_state WHERE id=true')).rows[0]?.revision, before);
});

test('the idempotent auth schema matches auth-schema.sql and can be applied repeatedly', async () => {
  const raw = readFileSync(fileURLToPath(new URL('../auth-schema.sql', import.meta.url)), 'utf8');
  const normalise = (sql) => sql.replace(/\s+/g, ' ').trim();
  assert.equal(normalise(AUTH_SCHEMA_IF_NOT_EXISTS), normalise(idempotentAuthSchema(raw)));
  const client = await authPool.connect();
  try { await ensureAuthTables(client); await ensureAuthTables(client); } finally { client.release(); }
});

test('a successful reset seeds the clinic, keeps exactly the two demo admins and lets them sign in', async () => {
  const target = new URL(process.env.DATABASE_URL);
  assert.equal(target.port, '5433', 'reset test must only run against the TEST database');
  const savedState = (await authPool.query('SELECT revision, body FROM clinic_state WHERE id=true')).rows[0];
  const savedUsers = (await authPool.query('SELECT * FROM "user"')).rows;
  const savedAccounts = (await authPool.query('SELECT * FROM "account"')).rows;
  const password = `demo-${randomBytes(9).toString('base64url')}`;
  const secret = randomBytes(16).toString('hex');
  const extraEmail = `synthetic-extra-${randomBytes(6).toString('hex')}@example.invalid`;
  try {
    const extra = await auth.api.createUser({ body: { email: extraEmail, password: randomBytes(12).toString('base64url'), name: 'Extra', role: 'admin' } });
    await authPool.query('INSERT INTO "session"(id, "expiresAt", token, "updatedAt", "userId") VALUES($1, now() + interval \'1 day\', $2, now(), $3)', ['sess-extra', 'tok-extra', extra.user.id]);
    await withEnv({ PUBLIC_DEMO: '1', CRON_SECRET: secret, DEMO_ADMIN_PASSWORD: password }, async () => {
      const call = () => resetGet(new Request(`${BASE}/api/demo/reset`, { headers: { authorization: `Bearer ${secret}` } }));
      const response = await call();
      assert.equal(response.status, 200);
      const summary = await response.json();
      assert.equal(summary.ok, true);
      assert.ok(summary.clinic.sessions > 0 && summary.clinic.pods === 2);
      assert.ok(!JSON.stringify(summary).includes(password) && !JSON.stringify(summary).includes(secret));
      const users = (await authPool.query('SELECT email, name, role, "podId" FROM "user" ORDER BY email')).rows;
      assert.deepEqual(users, [...DEMO_ADMINS].sort((x, y) => x.email.localeCompare(y.email)).map((admin) => ({ email: admin.email, name: admin.name, role: 'admin', podId: admin.podId })));
      assert.equal((await authPool.query('SELECT count(*)::int AS n FROM "session"')).rows[0].n, 0);
      const state = (await authPool.query('SELECT revision, body FROM clinic_state WHERE id=true')).rows[0];
      assert.equal(Number(state.revision), summary.revision);
      assert.equal(state.body.sessions.length, summary.clinic.sessions);
      for (const admin of DEMO_ADMINS) {
        const signIn = await auth.api.signInEmail({ body: { email: admin.email, password }, asResponse: true });
        assert.equal(signIn.status, 200, admin.email);
      }
      // Re-running is idempotent: still exactly two admins, revision bumped, old sessions gone.
      const second = await (await call()).json();
      assert.equal(second.revision, summary.revision + 1);
      assert.equal((await authPool.query('SELECT count(*)::int AS n FROM "user"')).rows[0].n, 2);
      assert.equal((await authPool.query('SELECT count(*)::int AS n FROM "session"')).rows[0].n, 0);
    });
  } finally {
    // Restore TEST to what it was before this test.
    await authPool.query('DELETE FROM "session"');
    await authPool.query('DELETE FROM "user"');
    for (const row of savedUsers) {
      const cols = Object.keys(row);
      await authPool.query(`INSERT INTO "user"(${cols.map((c) => `"${c}"`).join(',')}) VALUES(${cols.map((_, i) => `$${i + 1}`).join(',')})`, cols.map((c) => row[c]));
    }
    for (const row of savedAccounts) {
      const cols = Object.keys(row);
      await authPool.query(`INSERT INTO "account"(${cols.map((c) => `"${c}"`).join(',')}) VALUES(${cols.map((_, i) => `$${i + 1}`).join(',')})`, cols.map((c) => row[c]));
    }
    if (savedState) await authPool.query('UPDATE clinic_state SET revision=$1, body=$2::jsonb WHERE id=true', [savedState.revision, JSON.stringify(savedState.body)]);
  }
});

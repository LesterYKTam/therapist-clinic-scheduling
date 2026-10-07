// Nightly reset of the public synthetic demo: auth tables, clinic data, the two demo admins. No secrets in results.
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { PostgresClinicStore } from './clinic-store.mjs';
import { buildDemoState } from './demo-seed.mjs';
import { DEFAULT_CONFIG, todayInZone } from './scheduling.mjs';
import { ensureAuthTables } from './auth-migrate.mjs';
import { DEMO_ADMINS, isPublicDemo } from './public-demo.mjs';

export const MIN_PASSWORD_LENGTH = 8; // D-B019

/** Constant-time check of an "Authorization: Bearer <secret>" header. */
export function bearerMatches(header, secret) {
  if (!secret || typeof header !== 'string') return false;
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return false;
  const digest = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(match[1]), digest(secret));
}

/** 'inactive' (404), 'unauthorized' (401), 'misconfigured' (500, with message) or 'ok'. */
export function resetGate(header, env = process.env) {
  if (!isPublicDemo(env) || !env.CRON_SECRET) return { status: 'inactive' };
  if (!bearerMatches(header, env.CRON_SECRET)) return { status: 'unauthorized' };
  if (env.CLINIC_DEMO_MODE === '1') return { status: 'misconfigured', message: 'CLINIC_DEMO_MODE must not be set on the public demo.' };
  const password = env.DEMO_ADMIN_PASSWORD;
  if (!password || password.length < MIN_PASSWORD_LENGTH) return { status: 'misconfigured', message: `DEMO_ADMIN_PASSWORD must be set to at least ${MIN_PASSWORD_LENGTH} characters.` };
  return { status: 'ok' };
}

/**
 * Re-creates the demo. `hashPassword` comes from Better Auth so sign-in verifies the stored hash.
 * Clinic data and users are replaced in one transaction; a failure leaves the previous state untouched.
 */
export async function resetPublicDemo({ connectionString = process.env.DATABASE_URL, password, hashPassword, today = todayInZone(DEFAULT_CONFIG.timezone) }) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) throw new Error(`DEMO_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  const passwordHash = await hashPassword(password);
  const store = new PostgresClinicStore(connectionString);
  try {
    await store.migrate();
    const client = await store.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(918273646)');
      await ensureAuthTables(client);
      const row = await client.query('SELECT revision FROM clinic_state WHERE id=true FOR UPDATE');
      const revision = Number(row.rows[0].revision) + 1;
      const state = buildDemoState({ today, revision });
      await client.query('UPDATE clinic_state SET revision=$1, body=$2::jsonb, updated_at=now() WHERE id=true', [revision, JSON.stringify(state)]);
      const emails = DEMO_ADMINS.map((admin) => admin.email);
      const removed = await client.query('DELETE FROM "user" WHERE email <> ALL($1::text[])', [emails]);
      await client.query('DELETE FROM "session"');
      await client.query('DELETE FROM "verification"');
      for (const admin of DEMO_ADMINS) {
        const upsert = await client.query(
          `INSERT INTO "user"(id, name, email, "emailVerified", role, "podId", banned)
           VALUES($1,$2,$3,true,'admin',$4,false)
           ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, "emailVerified"=true, role='admin', "podId"=EXCLUDED."podId",
             banned=false, "banReason"=NULL, "banExpires"=NULL, "updatedAt"=now()
           RETURNING id`, [randomUUID(), admin.name, admin.email, admin.podId]);
        const userId = upsert.rows[0].id;
        await client.query('DELETE FROM "account" WHERE "userId"=$1', [userId]);
        await client.query(
          `INSERT INTO "account"(id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
           VALUES($1,$2,'credential',$2,$3,now(),now())`, [randomUUID(), userId, passwordHash]);
      }
      await client.query('COMMIT');
      return {
        ok: true, revision, today,
        clinic: { pods: state.pods.length, therapists: state.therapists.length, clients: state.clients.length, sessions: state.sessions.length },
        admins: DEMO_ADMINS.map(({ email, podId }) => ({ email, podId })),
        removedUsers: removed.rowCount,
      };
    } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { client.release(); }
  } finally { await store.close(); }
}

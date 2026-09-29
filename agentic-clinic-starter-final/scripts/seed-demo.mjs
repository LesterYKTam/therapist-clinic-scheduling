// Repeatable synthetic demo-data seed. Usage: node scripts/seed-demo.mjs --env dev|test
// Replaces ONLY the clinic_state body (sessions, series, leaves, people, rooms, config), bumping the revision. It never touches the
// auth tables ("user", "session", "account", ...). Pods "a" (Maple) and "b" (Cedar) keep their ids so admin pod assignments stay valid.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function loadEnv(environment) {
  if (!['dev', 'test'].includes(environment)) throw new Error('Use --env dev or --env test.');
  const file = resolve(fileURLToPath(new URL('..', import.meta.url)), '.local', `${environment}.env`);
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  const url = process.env.DATABASE_URL;
  const port = environment === 'dev' ? '5432' : '5433';
  const target = url && new URL(url);
  if (!target || target.pathname !== `/clinic_${environment}` || target.port !== port || !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw new Error(`${environment}.env must point at the local clinic_${environment} database on port ${port}.`);
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--env') out.env = argv[++i];
    else throw new Error(`Unknown argument ${argv[i]}.`);
  }
  return out;
}

async function main() {
  const { env } = parseArgs(process.argv.slice(2));
  loadEnv(env);
  const { PostgresClinicStore } = await import('../web/lib/clinic-store.mjs');
  const { buildDemoState } = await import('../web/lib/demo-seed.mjs');
  const { todayInZone, DEFAULT_CONFIG, withConflicts } = await import('../web/lib/scheduling.mjs');
  const today = todayInZone(DEFAULT_CONFIG.timezone);
  const store = new PostgresClinicStore();
  try {
    await store.migrate();
    const client = await store.pool.connect();
    let state;
    try {
      const db = await client.query('SELECT current_database() AS name');
      if (db.rows[0].name !== `clinic_${env}`) throw new Error(`Connected to ${db.rows[0].name}, expected clinic_${env}.`);
      await client.query('BEGIN');
      const row = await client.query('SELECT revision FROM clinic_state WHERE id=true FOR UPDATE');
      const revision = Number(row.rows[0].revision) + 1;
      state = buildDemoState({ today, revision });
      await client.query('UPDATE clinic_state SET revision=$1, body=$2::jsonb, updated_at=now() WHERE id=true', [revision, JSON.stringify(state)]);
      await client.query('COMMIT');
    } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { client.release(); }
    const view = withConflicts(state);
    const podOf = (id) => state.clients.find((c) => c.id === id)?.pod;
    const count = (list, pod) => list.filter((item) => podOf(item.session.client) === pod).length;
    process.stdout.write([
      `Demo data loaded into ${env} (run date ${today}, ${DEFAULT_CONFIG.timezone}); revision ${state.revision}.`,
      `  pods: ${state.pods.map((p) => p.name).join(', ')}; therapists: ${state.therapists.length}; clients: ${state.clients.length}; rooms: ${state.rooms.length}`,
      `  series: ${state.series.length}; sessions: ${state.sessions.length} (${state.sessions.filter((s) => s.date >= today).length} from today on); leaves: ${state.leaves.length}`,
      ...state.pods.map((p) => `  ${p.name}: ${count(view.conflicts, p.id)} outstanding conflicts, ${count(view.historicalAlerts, p.id)} historical alerts`),
      '  drafts: 0; notifications: 0'
    ].join('\n') + '\n');
  } finally { await store.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let code = 0;
  try { await main(); } catch (error) { process.stderr.write(`Error: ${error.message}\n`); code = 1; }
  process.exit(code);
}

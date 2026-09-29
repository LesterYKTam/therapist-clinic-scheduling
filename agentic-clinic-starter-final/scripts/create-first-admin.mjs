// One-time bootstrap of the first clinic admin (D-B013).
// Usage: node scripts/create-first-admin.mjs --env dev|test [--pod <id>] [--allow-additional]
// The password is typed at a hidden prompt; it is never accepted as an argument, env var or file.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIN_PASSWORD_LENGTH = 12; // must match emailAndPassword.minPasswordLength in web/lib/auth.ts

export async function createFirstAdmin({ name, email, password, pod, allowAdditional = false }) {
  name = String(name ?? '').trim();
  email = String(email ?? '').trim().toLowerCase();
  if (!name) throw new Error('Name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid email address is required.');
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const { auth, authPool } = await import('../web/lib/auth.ts');
  const { PostgresClinicStore } = await import('../web/lib/clinic-store.mjs');
  if (!allowAdditional) {
    const existing = await authPool.query('SELECT count(*)::int AS n FROM "user" WHERE role = $1', ['admin']);
    if (existing.rows[0].n > 0) {
      throw new Error('An admin already exists. Create additional admins from the config page (/config/admins) while signed in, or pass --allow-additional.');
    }
  }
  if (pod) {
    const clinic = new PostgresClinicStore();
    try {
      const state = await clinic.read();
      if (!state.pods.some((p) => p.id === pod)) throw new Error(`Unknown pod "${pod}". Valid pods: ${state.pods.map((p) => p.id).join(', ')}.`);
    } finally { await clinic.close(); }
  }
  const created = await auth.api.createUser({ body: { email, password, name, role: 'admin' } });
  const id = created.user.id;
  if (pod) await authPool.query('UPDATE "user" SET "podId"=$1, "updatedAt"=now() WHERE id=$2', [pod, id]);
  return { id, email, pod: pod ?? null };
}

function loadEnv(environment) {
  if (!['dev', 'test'].includes(environment)) throw new Error('Use --env dev or --env test.');
  const file = resolve(fileURLToPath(new URL('..', import.meta.url)), '.local', `${environment}.env`);
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  const url = process.env.DATABASE_URL;
  const port = environment === 'dev' ? '5432' : '5433';
  if (!url || new URL(url).pathname !== `/clinic_${environment}` || new URL(url).port !== port) {
    throw new Error(`${environment}.env must point at the local clinic_${environment} database on port ${port}.`);
  }
}

function parseArgs(argv) {
  const out = { allowAdditional: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--env') out.env = argv[++i];
    else if (argv[i] === '--pod') out.pod = argv[++i];
    else if (argv[i] === '--allow-additional') out.allowAdditional = true;
    else throw new Error(`Unknown argument ${argv[i]}. Passwords are never accepted as arguments.`);
  }
  return out;
}

function prompter() {
  let muted = false;
  const output = new Writable({ write(chunk, _enc, cb) { if (!muted) process.stdout.write(chunk); cb(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const ask = (question, hidden = false) => new Promise((done) => {
    process.stdout.write(question);
    muted = hidden;
    rl.question('', (answer) => { muted = false; if (hidden) process.stdout.write('\n'); done(answer); });
  });
  return { ask, close: () => rl.close() };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv(args.env);
  if (!process.stdin.isTTY) throw new Error('Run this in an interactive terminal so the password can be typed hidden.');
  const io = prompter();
  let input;
  try {
    const name = await io.ask('Full name: ');
    const email = await io.ask('Email: ');
    const password = await io.ask('Password (hidden): ', true);
    const again = await io.ask('Repeat password (hidden): ', true);
    if (password !== again) throw new Error('Passwords do not match.');
    input = { name, email, password };
  } finally { io.close(); }
  const result = await createFirstAdmin({ ...input, pod: args.pod, allowAdditional: args.allowAdditional });
  process.stdout.write(`Admin created.\n  email: ${result.email}\n  id: ${result.id}\n  pod: ${result.pod ?? '(unassigned)'}\n`);
  if (!result.pod) process.stdout.write('Assign a pod on the protected config page (/config/admins) after signing in.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let code = 0;
  try { await main(); } catch (error) { process.stderr.write(`Error: ${error.message}\n`); code = 1; }
  try { const { authPool } = await import('../web/lib/auth.ts'); await authPool.end(); } catch {}
  process.exit(code);
}

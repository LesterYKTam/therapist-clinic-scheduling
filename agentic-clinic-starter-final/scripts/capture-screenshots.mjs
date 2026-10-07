// Capture README screenshots from a running, signed-in instance using headless Chrome over the DevTools protocol.
// Usage: SHOT_EMAIL=... SHOT_PASSWORD=... node scripts/capture-screenshots.mjs [--base http://localhost:3001] [--out ../docs/images]
// Synthetic DEV data only. Credentials come from the environment and are never written anywhere.
// The run leaves a draft behind (Auto resolve); reset DEV afterwards with `node scripts/seed-demo.mjs --env dev`.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('--base', 'http://localhost:3001');
const OUT = resolve(arg('--out', fileURLToPath(new URL('../../docs/images', import.meta.url))));
const { SHOT_EMAIL: email, SHOT_PASSWORD: password } = process.env;
if (!email || !password) throw new Error('Set SHOT_EMAIL and SHOT_PASSWORD for a synthetic local admin.');

const chromeCandidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const chromePath = chromeCandidates.find((p) => existsSync(p));
if (!chromePath) throw new Error('Chrome not found; set CHROME_PATH.');

const PORT = 9333;
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shots-'))}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try { const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }); if (res.ok) return (await res.json()).webSocketDebuggerUrl; } catch {}
    await sleep(200);
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 0; const pending = new Map();
ws.addEventListener('message', (event) => { const msg = JSON.parse(event.data); if (msg.id && pending.has(msg.id)) { const { ok, fail } = pending.get(msg.id); pending.delete(msg.id); msg.error ? fail(new Error(msg.error.message)) : ok(msg.result); } });
const send = (method, params = {}) => new Promise((ok, fail) => { const id = ++nextId; pending.set(id, { ok, fail }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed'); return r.result.value; };
const waitFor = async (expression, label, timeout = 15000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await evaluate(expression).catch(() => false)) return; await sleep(150); } throw new Error(`Timed out waiting for ${label}`); };
const goto = async (path) => { await send('Page.navigate', { url: BASE + path }); await sleep(400); await waitFor('document.readyState === "complete"', 'page load'); };
const clickText = (text) => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(text)} && !x.disabled); if (!b) return false; b.click(); return true; })()`);
const hasText = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;

async function shot(name, { fullPage = true, maxHeight = 1800 } = {}) {
  await sleep(500);
  let height = 900;
  if (fullPage) { const m = await send('Page.getLayoutMetrics'); height = Math.min(Math.ceil(m.cssContentSize.height), maxHeight); }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  console.log(`saved ${name} (1440x${height})`);
}

try {
  mkdirSync(OUT, { recursive: true });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await goto('/sign-in');
  const status = await evaluate(`fetch('/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(${JSON.stringify({ email, password })}) }).then((r) => r.status)`);
  if (status !== 200) throw new Error(`Sign-in failed with HTTP ${status}`);

  // 1. Calendar on the leave week: conflicts listed beside the schedule.
  await goto('/');
  await waitFor(hasText('Schedule conflicts'), 'calendar');
  await clickText('Next week');
  await shot('01-calendar-conflicts.png');

  // 2. Auto resolve proposal: every change with its reason, nothing committed yet.
  if (!(await clickText('Auto resolve'))) throw new Error('Auto resolve button not found');
  await waitFor(hasText('Auto resolve proposal'), 'proposal');
  await shot('02-auto-resolve-proposal.png');
  await clickText('Discard draft');
  await sleep(800);

  // 3. Read-only view of the other pod.
  await evaluate(`(() => { const s = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => /Cedar/.test(o.textContent))); const o = [...s.options].find((x) => /Cedar/.test(x.textContent)); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, o.value); s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await waitFor(hasText('read-only'), 'read-only banner');
  await shot('03-read-only-other-pod.png');
} finally {
  try { ws.close(); } catch {}
  chrome.kill();
}

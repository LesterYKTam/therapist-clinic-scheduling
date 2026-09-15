import {createServer} from 'node:http';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {ClinicStore} from './store.mjs';
import {fixture, validate, podView} from './schedule.mjs';

const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
const table = (heads, rows) => `<div class="scroll"><table><thead><tr>${heads.map(h => `<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export function render(data, id, message = '', token = '') {
  const view = podView(data, id);
  const therapist = id => view.therapists.find(t => t.id === id).name;
  const client = id => view.clients.find(c => c.id === id).name;
  const form = (action, room = '') => `<form method="post" action="/rooms"><input type="hidden" name="token" value="${escape(token)}"><input type="hidden" name="pod" value="${escape(id)}"><input type="hidden" name="action" value="${action}"><input type="hidden" name="room" value="${escape(room)}"><button type="submit">${action === 'add' ? 'Add room' : `Remove ${escape(data.rooms.find(r => r.id === room).name)}`}</button></form>`;
  const inventory = `<section id="rooms"><h2>Shared rooms · ${data.rooms.filter(r => r.active).length} active</h2><p class="muted">One room inventory for all pods. Booked rooms cannot be removed until their future bookings are moved.</p>${message ? `<p role="status">${escape(message)}</p>` : ''}${form('add')}<div class="rooms">${data.rooms.filter(r => r.active).map(r => `<article><strong>${escape(r.name)}</strong><p class="muted">${data.sessions.filter(s => s.room === r.id).map(s => `Busy: ${escape(s.date)} ${escape(s.time)} · ${s.minutes} min`).join('<br>') || 'No bookings'}</p>${form('remove', r.id)}</article>`).join('')}</div></section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(view.pod.name)} · Clinic schedule</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f6f5;color:#193c36;font:16px/1.55 system-ui,sans-serif}header{background:#163d35;color:white;padding:24px max(24px,calc((100vw - 1120px)/2))}header p{color:#c1d9cf;margin:4px 0}main{max-width:1168px;margin:auto;padding:32px 24px}h1{font-size:32px;margin:0}h2{font-size:21px;margin:0 0 6px}p{margin:6px 0 18px}.toolbar{display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap}.badge{font-size:13px;border:1px solid #698c7f;padding:5px 12px;border-radius:30px}nav{display:flex;gap:10px}nav a{color:#214e43;padding:8px 16px;border:1px solid #aabfb6;border-radius:8px;text-decoration:none}nav a[aria-current=page]{background:#245849;color:white}section{background:white;border:1px solid #d7e2dc;border-radius:12px;padding:24px;margin-top:24px}.muted{color:#566e64;font-size:14px}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}th{background:#eff4f1;color:#456154;font-size:12px;letter-spacing:.03em}td,th{padding:13px 12px;border-bottom:1px solid #e5ebe7;white-space:nowrap}footer{margin:28px 0;color:#566e64;font-size:13px}a:focus-visible{outline:3px solid #c27925;outline-offset:3px}
  button{background:#245849;color:white;border:0;border-radius:6px;padding:9px 14px;cursor:pointer;font:inherit}button:focus-visible{outline:3px solid #c27925;outline-offset:3px}.rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:18px}.rooms article{border:1px solid #d7e2dc;border-radius:8px;padding:16px}[role=status]{padding:14px;background:#fff2d6;border-radius:8px}
  </style></head><body><header><div class="toolbar"><div><p>CLINIC / SCHEDULE</p><h1>Pod overview</h1></div><span class="badge">Synthetic demo · Shared rooms</span></div></header><main><div class="toolbar"><div><h2>${escape(view.pod.name)}</h2><p class="muted">Week of September 14, 2026 · Supplied sample occurrences</p></div><nav aria-label="Select demo pod">${data.pods.map(p => `<a href="/?pod=${encodeURIComponent(p.id)}" ${p.id === id ? 'aria-current="page"' : ''}>${escape(p.name)}</a>`).join('')}</nav></div>
  <section><h2>Committed sessions</h2><p class="muted">Dated occurrences in the sample schedule.</p>${table(['Date','Time','Duration','Client','Therapist','Location'],view.sessions.map(s => [s.date,s.time,`${s.minutes} min`,client(s.client),therapist(s.therapist),s.location === 'home' ? 'Home' : data.rooms.find(r => r.id === s.room).name]))}</section>
  <section><h2>Standing sessions</h2><p class="muted">Weekly templates, shown separately from calendar occurrences.</p>${table(['Day','Time','Duration','Client','Therapist','Location'],view.standing.map(s => [s.day,s.time,`${s.minutes} min`,client(s.client),therapist(s.therapist),s.location === 'home' ? 'Home' : data.rooms.find(r => r.id === s.room).name]))}</section>
  <section><h2>Client assignments</h2><p class="muted">Three ranked therapists per client, all within this pod.</p>${table(['Client','Major','2nd','3rd'],view.clients.map(c => [c.name,...c.assigned.map(therapist)]))}</section>
  <section><h2>Therapists</h2>${table(['Therapist','Weekly hours cap'],view.therapists.map(t => [t.name,`${t.cap} hours`]))}</section>
  ${inventory}
  <footer>Only synthetic records are shown. Session editing is not available. Home visits use the full booked duration. Demo clock: September 14, 2026, 00:00 UTC; not the clinic timezone. Pod switching is a demo selector, not access control.</footer></main></body></html>`;
}

export function makeServer(data = fixture(), store = new ClinicStore(':memory:', data)) {
  validate(data);
  const token = randomBytes(32).toString('hex');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/rooms') {
      let body = '';
      try {
        for await (const chunk of req) {body += chunk; if (body.length > 4096) {res.writeHead(413);res.end('Request too large');return;}}
        const fields = new URLSearchParams(body);
        if (fields.get('token') !== token || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) {res.writeHead(403);res.end('Invalid form. Reload the page.');return;}
        const pod = fields.get('pod');
        if (!store.read().pods.some(p => p.id === pod)) {res.writeHead(400);res.end('Unknown pod');return;}
        let message;
        try {message = store.change(fields.get('action'), fields.get('room'));}
        catch (error) {message = error.message;}
        res.writeHead(303, {Location: `/?pod=${encodeURIComponent(pod)}&message=${encodeURIComponent(message)}#rooms`});res.end();
      } catch {res.writeHead(500);res.end('Unable to save room change. Refresh and try again.');}
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405, {Allow:'GET, HEAD'});res.end('Schedule is read only');return;}
    if (url.pathname !== '/') {res.writeHead(404);res.end('Not found');return;}
    const id = url.searchParams.get('pod') || 'a';
    const current = store.read();
    if (!current.pods.some(p => p.id === id)) {res.writeHead(404);res.end('Unknown pod');return;}
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : render(current, id, (url.searchParams.get('message') || '').slice(0, 1500), token));
  });
  server.on('close', () => store.close());
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = new URL('./data/', import.meta.url);
  mkdirSync(directory, {recursive: true});
  makeServer(fixture(), new ClinicStore(fileURLToPath(new URL('clinic.sqlite', directory)))).listen(3000, '127.0.0.1', () => console.log('Synthetic clinic demo: http://127.0.0.1:3000'));
}

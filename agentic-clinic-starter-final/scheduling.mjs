/** Shared local-calendar policy for committed normal scheduling (S4). */
const DAY_MS = 86400000;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_CONFIG = Object.freeze({
  timezone: 'America/Toronto', workingDays: [1, 2, 3, 4, 5], open: '09:00', close: '17:00',
  weekStart: 1, recurrenceWeeks: 12
});

export function initialState() {
  const pods = [{id:'a', name:'Maple pod'}, {id:'b', name:'Cedar pod'}];
  const therapists = pods.flatMap(p => ['Morgan', 'Taylor', 'Casey'].map((name, index) =>
    ({id:`${p.id}-t${index + 1}`, pod:p.id, name:`${name} ${p.name.split(' ')[0]}`, capHours:[24,30,20][index], active:true})));
  const clients = pods.map(p => ({id:`${p.id}-c1`, pod:p.id, name:p.id === 'a' ? 'Alex Demo' : 'Sam Sample', active:true, assigned:[`${p.id}-t1`, `${p.id}-t2`, `${p.id}-t3`]}));
  return {schema:2, revision:0, config:structuredClone(DEFAULT_CONFIG), pods, therapists, clients,
    rooms:Array.from({length:15}, (_, i) => ({id:`room-${i + 1}`, name:`Room ${i + 1}`, active:true})), series:[], sessions:[]};
}

const parseDate = date => {
  if (!isoDate.test(date)) throw new Error('Date must use YYYY-MM-DD.');
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0,10) !== date) throw new Error('Date is not valid.');
  return ms;
};
const minutesAt = value => {
  if (!clock.test(value)) throw new Error('Time must use HH:MM.');
  const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute;
};
const formatters = new Map();
const localCache = new Map();
const formatted = (ms, zone) => {
  let formatter=formatters.get(zone);
  if (!formatter) { formatter=new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}); formatters.set(zone,formatter); }
  const parts = formatter.formatToParts(new Date(ms));
  const at = type => parts.find(p => p.type === type)?.value;
  return {date:`${at('year')}-${at('month')}-${at('day')}`, time:`${at('hour')}:${at('minute')}`};
};

/** Convert a wall-clock appointment to an instant, rejecting spring DST gaps. Ambiguous fall times choose the earlier instant. */
export function localInstant(date, time, zone) {
  parseDate(date); minutesAt(time);
  const cacheKey=`${zone}|${date}|${time}`; if (localCache.has(cacheKey)) return localCache.get(cacheKey);
  try { new Intl.DateTimeFormat('en', {timeZone:zone}).format(); } catch { throw new Error('Configured timezone is invalid.'); }
  const base = Date.parse(`${date}T${time}:00Z`);
  const candidates = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = base - offset * 60000;
    const actual = formatted(candidate, zone);
    if (actual.date === date && actual.time === time) candidates.push(candidate);
  }
  if (!candidates.length) throw new Error(`Local time ${date} ${time} does not exist in ${zone} (DST transition).`);
  const result=Math.min(...candidates); localCache.set(cacheKey,result); return result;
}

export function interval(session, config) {
  const start = localInstant(session.date, session.time, config.timezone);
  return [start, start + Number(session.minutes) * 60000];
}
export function overlaps(a, b, config) { const [as, ae] = interval(a, config); const [bs, be] = interval(b, config); return as < be && bs < ae; }
export function weekday(date) { const day = new Date(parseDate(date)).getUTCDay(); return day || 7; }
export function weekKey(date, weekStart = 1) {
  const ms = parseDate(date); const delta = (weekday(date) - weekStart + 7) % 7;
  return new Date(ms - delta * DAY_MS).toISOString().slice(0,10);
}
export function addDays(date, days) { return new Date(parseDate(date) + days * DAY_MS).toISOString().slice(0,10); }
export function datesWeekly(start, end) {
  if (parseDate(end) < parseDate(start)) throw new Error('Series end date must be on or after its start date.');
  const values=[]; for (let date=start; parseDate(date) <= parseDate(end); date=addDays(date,7)) values.push(date); return values;
}
const active = (items, id) => items.find(x => x.id === id && x.active);
export const isPast = (date, nowDate = todayInZone('America/Toronto')) => date < nowDate;
export function todayInZone(zone) { return formatted(Date.now(), zone).date; }

export function validateState(data, {allowHistoric = true} = {}) {
  if (!data || data.schema !== 2 || !Number.isInteger(data.revision) || data.revision < 0) throw new Error('Unsupported clinic data.');
  const c = data.config;
  if (!c || !Array.isArray(c.workingDays) || !c.workingDays.length || new Set(c.workingDays).size !== c.workingDays.length || c.workingDays.some(day => !Number.isInteger(day) || day < 1 || day > 7) || !Number.isInteger(c.weekStart) || c.weekStart < 1 || c.weekStart > 7 || !Number.isInteger(c.recurrenceWeeks) || c.recurrenceWeeks < 1 || c.recurrenceWeeks > 104) throw new Error('Invalid calendar configuration.');
  localInstant('2026-01-05', c.open, c.timezone); localInstant('2026-01-05', c.close, c.timezone);
  if (minutesAt(c.open) >= minutesAt(c.close)) throw new Error('Opening time must be before closing time.');
  for (const key of ['pods','therapists','clients','rooms','series','sessions']) if (!Array.isArray(data[key]) || new Set(data[key].map(x => x.id)).size !== data[key].length) throw new Error(`Invalid or duplicate ${key} records.`);
  const names = new Set();
  for (const person of [...data.therapists, ...data.clients]) { const key = String(person.name || '').trim().toLocaleLowerCase(); if (!person.id || !key || names.has(key)) throw new Error('Duplicate or invalid person identity.'); names.add(key); }
  for (const t of data.therapists) if (!data.pods.some(p=>p.id===t.pod) || typeof t.active !== 'boolean' || !Number.isFinite(t.capHours) || t.capHours <= 0) throw new Error('Invalid therapist pod, active state, or weekly cap.');
  for (const client of data.clients) {
    if (!data.pods.some(p=>p.id===client.pod) || typeof client.active !== 'boolean' || !Array.isArray(client.assigned) || client.assigned.length !== 3 || new Set(client.assigned).size !== 3) throw new Error('Client requires three distinct ranked therapists.');
    if (client.assigned.some(id => !data.therapists.some(t => t.id === id && t.pod === client.pod))) throw new Error('Assigned therapist must belong to the client pod.');
  }
  for (const room of data.rooms) if (!room.id || !String(room.name || '').trim() || typeof room.active !== 'boolean') throw new Error('Invalid room.');
  for (const s of data.sessions) validateSessionShape(data, s, {allowHistoric});
  for (let i=0;i<data.sessions.length;i++) for (const other of data.sessions.slice(i+1)) {
    const s=data.sessions[i]; if (!overlaps(s, other, c)) continue;
    if (s.therapist === other.therapist) throw new Error(`Therapist overlap: ${s.id} and ${other.id}.`);
    if (s.client === other.client) throw new Error(`Client overlap: ${s.id} and ${other.id}.`);
    if (s.location === 'clinic' && other.location === 'clinic' && s.room === other.room) throw new Error(`Room overlap: ${s.id} and ${other.id}.`);
  }
  const loads = new Map(); for (const s of data.sessions) { const key=`${s.therapist}:${weekKey(s.date,c.weekStart)}`; loads.set(key,(loads.get(key)||0)+s.minutes); }
  for (const [key, minutes] of loads) { const therapist = data.therapists.find(t=>key.startsWith(`${t.id}:`)); if (minutes > therapist.capHours * 60) throw new Error(`Weekly cap exceeded for ${therapist.name}.`); }
  return data;
}

export function validateSessionShape(data, s, {allowHistoric = true} = {}) {
  const client=active(data.clients,s.client), therapist=active(data.therapists,s.therapist);
  if (!s.id || !client || !therapist || client.pod !== therapist.pod || !client.assigned.includes(therapist.id)) throw new Error('Session requires an active client and one of its assigned therapists.');
  if (!Number.isInteger(s.minutes) || s.minutes <= 0 || s.minutes > 480) throw new Error('Duration must be between 1 and 480 minutes.');
  localInstant(s.date,s.time,data.config.timezone);
  const localStart=minutesAt(s.time), localEnd=localStart+s.minutes;
  if ((!allowHistoric || !isPast(s.date, todayInZone(data.config.timezone))) && (!data.config.workingDays.includes(weekday(s.date)) || localStart < minutesAt(data.config.open) || localEnd > minutesAt(data.config.close))) throw new Error('Session falls outside configured working days or office hours.');
  if (!['clinic','home'].includes(s.location)) throw new Error('Location must be Clinic or Home.');
  if (s.location === 'home' && s.room !== null) throw new Error('Home sessions cannot reserve a room.');
  if (s.location === 'clinic' && !active(data.rooms,s.room)) throw new Error(`Clinic session requires active shared room ${s.room}.`);
  if (s.seriesId !== undefined && s.seriesId !== null && !data.series.some(series=>series.id===s.seriesId)) throw new Error('Session refers to an unknown series.');
}

export function blockersForSetup(before, after) {
  const issues=[];
  if (before.config.timezone !== after.config.timezone && before.sessions.length) {
    issues.push(...before.sessions.map(s=>`${s.date} ${s.time} · ${s.id}: timezone cannot change while committed bookings exist.`));
    return issues;
  }
  for (const session of before.sessions) {
    try { validateSessionShape(after, session, {allowHistoric:false}); }
    catch (error) { issues.push(`${session.date} ${session.time} · ${session.id}: ${error.message}`); continue; }
  }
  const load=new Map(); for (const session of before.sessions) { const key=`${session.therapist}:${weekKey(session.date,after.config.weekStart)}`; load.set(key,(load.get(key)||0)+session.minutes); }
  for (const [key, minutes] of load) { const therapist=after.therapists.find(t=>key.startsWith(`${t.id}:`)); if (therapist && minutes > therapist.capHours * 60) issues.push(...before.sessions.filter(s=>`${s.therapist}:${weekKey(s.date,after.config.weekStart)}`===key).map(s=>`${s.date} ${s.time} · ${s.id}: weekly cap would be exceeded for ${therapist.name}.`)); }
  return issues;
}

export function createOccurrences(state, request, seriesId) {
  const dates=datesWeekly(request.startDate,request.endDate);
  return dates.map((date,index)=>({id:`${seriesId}-o${index + 1}`, seriesId, client:request.client, therapist:request.therapist, date, time:request.time, minutes:Number(request.minutes), location:request.location, room:request.location === 'home' ? null : request.room}));
}

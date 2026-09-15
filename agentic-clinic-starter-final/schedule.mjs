export function fixture() {
  const pods = [{id: 'a', name: 'Maple pod'}, {id: 'b', name: 'Cedar pod'}];
  const therapists = pods.flatMap(p => ['Morgan', 'Taylor', 'Casey'].map((name, i) => ({id: `${p.id}${i}`, pod: p.id, name: `${name} ${p.name.split(' ')[0]}`, cap: [24, 30, 20][i]})));
  const clients = pods.map(p => ({id: `${p.id}-client`, pod: p.id, name: p.id === 'a' ? 'Alex Demo' : 'Sam Sample', assigned: [0, 1, 2].map(i => `${p.id}${i}`)}));
  const standing = clients.flatMap(c => ['Monday', 'Thursday'].map((day, i) => ({id: `${c.id}-${i}`, client: c.id, therapist: c.assigned[0], day, time: i ? '14:00' : '09:00', minutes: 60})));
  const sessions = standing.map(s => ({id: `${s.id}-occurrence`, standing: s.id, client: s.client, therapist: s.therapist, date: s.day === 'Monday' ? '2026-09-14' : '2026-09-17', time: s.time, minutes: s.minutes}));
  const rooms = Array.from({length: 15}, (_, i) => ({id: `room-${i + 1}`, name: `Room ${i + 1}`, active: true}));
  for (const s of [...standing, ...sessions]) {
    s.location = s.client === 'a-client' && s.time === '14:00' ? 'home' : 'clinic';
    s.room = s.location === 'home' ? null : s.client === 'a-client' ? 'room-1' : 'room-2';
    if (s.location === 'home') s.minutes = 90;
  }
  return {pods, therapists, clients, standing, sessions, rooms};
}

export function validate(data) {
  for (const key of ['pods', 'therapists', 'clients', 'standing', 'sessions', 'rooms']) {
    if (!Array.isArray(data[key]) || new Set(data[key].map(x => x.id)).size !== data[key].length) throw new Error(`Invalid or duplicate ${key} records`);
  }
  for (const room of data.rooms) {
    if (typeof room.id !== 'string' || !room.id || typeof room.name !== 'string' || !room.name.trim() || typeof room.active !== 'boolean') throw new Error('Invalid room');
  }
  for (const t of data.therapists) {
    if (!data.pods.some(p => p.id === t.pod) || !Number.isFinite(t.cap) || t.cap <= 0) throw new Error('Invalid therapist pod or weekly cap');
  }
  for (const c of data.clients) {
    if (!data.pods.some(p => p.id === c.pod) || !Array.isArray(c.assigned) || c.assigned.length !== 3 || new Set(c.assigned).size !== 3) throw new Error('Client requires three distinct ranked therapists in one pod');
    if (c.assigned.some(id => !data.therapists.some(t => t.id === id && t.pod === c.pod))) throw new Error('Assigned therapist must belong to the client pod');
  }
  for (const s of [...data.standing, ...data.sessions]) {
    const c = data.clients.find(c => c.id === s.client);
    if (!c || !c.assigned.includes(s.therapist) || !Number.isFinite(s.minutes) || s.minutes <= 0) throw new Error('Invalid session assignment or duration');
    if (!['clinic', 'home'].includes(s.location) || (s.location === 'home' ? s.room !== null : !data.rooms.some(r => r.id === s.room))) throw new Error('Invalid session location or room');
  }
  for (let i = 0; i < data.sessions.length; i++) {
    const a = data.sessions[i]; const [start, end] = interval(a);
    if (a.room && !data.rooms.find(r => r.id === a.room).active && end > DEMO_NOW) throw new Error('Future booking uses inactive room');
    for (const b of data.sessions.slice(i + 1)) {
      const [otherStart, otherEnd] = interval(b);
      if (a.room && a.room === b.room && start < otherEnd && otherStart < end) throw new Error('Room booking overlaps across the clinic');
    }
  }
  for (const s of data.sessions) {
    if (!data.standing.some(t => t.id === s.standing && t.client === s.client)) throw new Error('Occurrence must refer to its client standing template');
  }
  return data;
}

// Fixed synthetic clock, not an assumed clinic timezone.
export const DEMO_NOW = Date.parse('2026-09-14T00:00:00Z');
export function interval(session) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time)) throw new Error('Invalid session date/time');
  const start = Date.parse(`${session.date}T${session.time}:00Z`);
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== session.date) throw new Error('Invalid session date/time');
  return [start, start + session.minutes * 60000];
}

export function podView(data, id) {
  validate(data);
  const pod = data.pods.find(p => p.id === id);
  if (!pod) throw new Error('Unknown pod');
  const clients = data.clients.filter(c => c.pod === id);
  const ids = new Set(clients.map(c => c.id));
  return structuredClone({pod, therapists: data.therapists.filter(t => t.pod === id), clients, standing: data.standing.filter(s => ids.has(s.client)), sessions: data.sessions.filter(s => ids.has(s.client))});
}

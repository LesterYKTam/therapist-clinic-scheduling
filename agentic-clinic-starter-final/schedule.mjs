export function fixture() {
  const pods = [{id: 'a', name: 'Maple pod'}, {id: 'b', name: 'Cedar pod'}];
  const therapists = pods.flatMap(p => ['Morgan', 'Taylor', 'Casey'].map((name, i) => ({id: `${p.id}${i}`, pod: p.id, name: `${name} ${p.name.split(' ')[0]}`, cap: [24, 30, 20][i]})));
  const clients = pods.map(p => ({id: `${p.id}-client`, pod: p.id, name: p.id === 'a' ? 'Alex Demo' : 'Sam Sample', assigned: [0, 1, 2].map(i => `${p.id}${i}`)}));
  const standing = clients.flatMap(c => ['Monday', 'Thursday'].map((day, i) => ({id: `${c.id}-${i}`, client: c.id, therapist: c.assigned[0], day, time: i ? '14:00' : '09:00', minutes: 60})));
  const sessions = standing.map(s => ({id: `${s.id}-occurrence`, standing: s.id, client: s.client, therapist: s.therapist, date: s.day === 'Monday' ? '2026-09-14' : '2026-09-17', time: s.time, minutes: s.minutes}));
  return {pods, therapists, clients, standing, sessions};
}

export function validate(data) {
  for (const key of ['pods', 'therapists', 'clients', 'standing', 'sessions']) {
    if (!Array.isArray(data[key]) || new Set(data[key].map(x => x.id)).size !== data[key].length) throw new Error(`Invalid or duplicate ${key} records`);
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
  }
  for (const s of data.sessions) {
    if (!data.standing.some(t => t.id === s.standing && t.client === s.client)) throw new Error('Occurrence must refer to its client standing template');
  }
  return data;
}

export function podView(data, id) {
  validate(data);
  const pod = data.pods.find(p => p.id === id);
  if (!pod) throw new Error('Unknown pod');
  const clients = data.clients.filter(c => c.pod === id);
  const ids = new Set(clients.map(c => c.id));
  return structuredClone({pod, therapists: data.therapists.filter(t => t.pod === id), clients, standing: data.standing.filter(s => ids.has(s.client)), sessions: data.sessions.filter(s => ids.has(s.client))});
}

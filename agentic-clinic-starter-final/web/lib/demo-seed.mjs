// Synthetic demo clinic state for the repeatable seed (scripts/seed-demo.mjs). Pure: no I/O, no clock reads except the default `today`.
// Every date is relative to `today` (YYYY-MM-DD in the clinic timezone), so the seed can be re-run on any day. All people are fictional.
import { DEFAULT_CONFIG, addDays, createOccurrences, todayInZone, validateState, weekKey } from './scheduling.mjs';

const CAPS = { a: [20, 25, 15, 12, 10], b: [18, 22, 14, 25, 10] };
const THERAPIST_FIRST = { a: ['Morgan', 'Taylor', 'Casey', 'Jordan', 'Riley'], b: ['Avery', 'Quinn', 'Sage', 'Rowan', 'Drew'] };
const CLIENT_FIRST = {
  a: ['Alex', 'Bailey', 'Charlie', 'Dana', 'Emery', 'Frankie', 'Gray', 'Harper', 'Indigo', 'Jules'],
  b: ['Kai', 'Lane', 'Marlo', 'Nico', 'Oakley', 'Parker', 'Reese', 'Sky', 'Tatum', 'Wren']
};
const CLIENT_LAST = { a: 'Sampleton', b: 'Placeholder' };

// Ranked therapists per client (1-based therapist numbers within the pod), rank 1 first.
const RANKS = {
  a: [[1, 2, 3], [1, 2, 4], [1, 2, 3], [1, 2, 5], [1, 3, 4], [2, 4, 5], [2, 3, 4], [3, 4, 5], [4, 5, 2], [5, 4, 3]],
  b: [[1, 2, 3], [1, 3, 4], [2, 1, 5], [2, 3, 5], [3, 4, 2], [3, 5, 1], [4, 5, 1], [4, 2, 3], [5, 4, 2], [5, 1, 4]]
};

// [pod, client no., therapist no., weekday (1=Mon), time, minutes, location, first week offset from the current week (default -2)]
const SERIES = [
  // Maple. Scenario 1: therapist 1 has leave next Tue-Wed, so the Tue/Wed sessions of clients 1-5 (with therapist 1) conflict.
  ['a', 1, 1, 2, '09:00', 60, 'clinic'],    // resolves directly to rank 2 (therapist 2 is free)
  ['a', 2, 1, 2, '11:00', 60, 'clinic'],    // resolves directly to rank 2
  ['a', 3, 1, 2, '13:00', 60, 'clinic'],    // rank 2 is busy with client 6, who can move to therapist 4: cascade of depth 1
  ['a', 4, 1, 3, '10:00', 60, 'clinic'],    // rank 2 busy, its client cannot move: falls back to rank 3
  ['a', 5, 1, 3, '14:00', 60, 'clinic'],    // therapists 2-5 all busy at this hour: stays unresolved
  ['a', 6, 2, 2, '13:00', 60, 'clinic'],
  ['a', 7, 2, 3, '10:00', 60, 'clinic'],
  ['a', 8, 3, 3, '10:00', 60, 'clinic'],
  ['a', 9, 4, 3, '10:00', 60, 'clinic'],
  ['a', 6, 2, 3, '14:00', 60, 'clinic'],
  ['a', 7, 3, 3, '14:00', 60, 'clinic'],    // rank 2 for client 7
  ['a', 8, 4, 3, '14:00', 60, 'clinic'],    // rank 2
  ['a', 9, 5, 3, '14:00', 60, 'clinic', 0], // rank 2
  ['a', 1, 1, 5, '10:00', 60, 'clinic'],
  ['a', 2, 2, 5, '11:00', 60, 'clinic', 0], // rank 2
  ['a', 3, 1, 4, '13:00', 90, 'home'],      // Home visit
  ['a', 4, 1, 1, '09:00', 60, 'clinic'],
  ['a', 5, 1, 1, '15:00', 60, 'clinic'],
  ['a', 10, 5, 4, '10:00', 60, 'clinic'],   // scenario 2: therapist 5 has past leave over this session last week
  ['a', 10, 3, 1, '11:00', 60, 'clinic', 0], // rank 3
  // Cedar. Scenario 3: therapist 2 has leave next Thursday morning over the two Thursday sessions of clients 3 and 4.
  ['b', 1, 1, 1, '09:00', 60, 'clinic'], ['b', 1, 1, 3, '13:00', 60, 'clinic'],
  ['b', 2, 1, 1, '11:00', 60, 'clinic'], ['b', 2, 3, 4, '14:00', 60, 'clinic'],
  ['b', 3, 2, 4, '09:00', 60, 'clinic'], ['b', 3, 2, 1, '13:00', 60, 'clinic'],
  ['b', 4, 2, 4, '10:00', 60, 'clinic'], ['b', 4, 3, 2, '15:00', 60, 'clinic'],
  ['b', 5, 3, 2, '09:00', 60, 'clinic'], ['b', 5, 3, 5, '09:00', 60, 'clinic'],
  ['b', 6, 3, 2, '11:00', 60, 'clinic'], ['b', 6, 5, 5, '13:00', 60, 'clinic'],
  ['b', 7, 4, 1, '10:00', 60, 'clinic'], ['b', 7, 4, 3, '11:00', 120, 'home', 0],
  ['b', 8, 4, 2, '14:00', 60, 'clinic'], ['b', 8, 4, 5, '15:00', 60, 'clinic'],
  ['b', 9, 5, 1, '14:00', 60, 'clinic'], ['b', 9, 5, 4, '11:00', 60, 'clinic'],
  ['b', 10, 5, 3, '09:00', 60, 'clinic'], ['b', 10, 1, 5, '10:00', 60, 'clinic', 0]
];

const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

/** Lowest-numbered room free for every occurrence of a series; keeps clinic sessions from sharing a room at the same time. */
function assignRooms(entries, roomCount) {
  const taken = new Map(); // room number -> [{date, start, end}]
  for (const entry of entries) {
    if (entry.series.location === 'home') continue;
    const start = minutesOf(entry.series.time), end = start + entry.series.minutes;
    const dates = entry.sessions.map((session) => session.date);
    let chosen = null;
    for (let n = 1; n <= roomCount && !chosen; n++) {
      const busy = taken.get(n) || [];
      if (!busy.some((slot) => dates.includes(slot.date) && slot.start < end && start < slot.end)) chosen = n;
    }
    if (!chosen) throw new Error('Not enough rooms for the demo schedule.');
    entry.series.room = `room-${chosen}`;
    for (const session of entry.sessions) session.room = entry.series.room;
    taken.set(chosen, [...(taken.get(chosen) || []), ...dates.map((date) => ({ date, start, end }))]);
  }
}

export const DEMO_SCENARIOS = Object.freeze({
  mapleLeaveTherapist: 'a-t1', cedarLeaveTherapist: 'b-t2', historicalLeaveTherapist: 'a-t5'
});

/** Build the demo clinic state. `today` is a YYYY-MM-DD date in the clinic timezone; `revision` is set on the result. */
export function buildDemoState({ today = todayInZone(DEFAULT_CONFIG.timezone), revision = 0 } = {}) {
  const config = structuredClone(DEFAULT_CONFIG);
  const monday = weekKey(today, config.weekStart);
  const pods = [{ id: 'a', name: 'Maple pod' }, { id: 'b', name: 'Cedar pod' }];
  const therapists = [], clients = [];
  for (const pod of ['a', 'b']) {
    THERAPIST_FIRST[pod].forEach((first, i) => therapists.push({ id: `${pod}-t${i + 1}`, pod, name: `${first} Testerson`, capHours: CAPS[pod][i], active: true }));
    CLIENT_FIRST[pod].forEach((first, i) => clients.push({ id: `${pod}-c${i + 1}`, pod, name: `${first} ${CLIENT_LAST[pod]}`, active: true, assigned: RANKS[pod][i].map((n) => `${pod}-t${n}`) }));
  }
  const rooms = Array.from({ length: 15 }, (_, i) => ({ id: `room-${i + 1}`, name: `Room ${i + 1}`, active: true }));
  const entries = SERIES.map(([pod, client, therapist, day, time, minutes, location, startWeek = -2], index) => {
    const series = {
      id: `demo-series-${String(index + 1).padStart(2, '0')}`, client: `${pod}-c${client}`, therapist: `${pod}-t${therapist}`,
      time, minutes, location, room: null,
      startDate: addDays(monday, startWeek * 7 + day - 1), endDate: addDays(monday, 8 * 7 + day - 1)
    };
    return { series, sessions: createOccurrences(null, { ...series, room: 'room-1' }, series.id) };
  });
  assignRooms(entries, rooms.length);
  const leave = (n, therapist, weekOffset, startDay, startTime, endDay, endTime) => ({
    id: `demo-leave-${n}`, pod: therapist[0], therapist,
    startDate: addDays(monday, weekOffset * 7 + startDay - 1), startTime, endDate: addDays(monday, weekOffset * 7 + endDay - 1), endTime
  });
  const leaves = [
    leave(1, DEMO_SCENARIOS.mapleLeaveTherapist, 1, 2, '09:00', 3, '17:00'),        // next Tue 09:00 to Wed 17:00 (two full working days)
    leave(2, DEMO_SCENARIOS.historicalLeaveTherapist, -1, 4, '09:00', 4, '11:00'),  // last Thursday, overlaps a past session
    leave(3, DEMO_SCENARIOS.cedarLeaveTherapist, 1, 4, '09:00', 4, '11:00')         // next Thursday morning
  ];
  const state = {
    schema: 2, revision, config, pods, therapists, clients, rooms,
    series: entries.map((entry) => entry.series), sessions: entries.flatMap((entry) => entry.sessions),
    leaves, drafts: [], notifications: []
  };
  return validateState(state);
}

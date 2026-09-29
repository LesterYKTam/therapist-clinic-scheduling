import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, validateState, withConflicts, draftIssues, leaveConflicts, boundedResolutionProposal, workableAssignments } from '../lib/scheduling.mjs';
import { podView } from '../lib/pod-view.mjs';

// BUG-012: pure (no database) scale check. 5 pods, 30 therapists, 100 clients, 15 rooms, 2,400 future sessions and one
// year of history (about 10,400 past sessions). Thresholds are generous multiples of the measured cost.
const PODS = ['a', 'b', 'c', 'd', 'e'];
const FUTURE_WEEKS = 12, HISTORY_WEEKS = 52;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

function buildClinic() {
  const state = initialState();
  state.pods = PODS.map((id) => ({ id, name: `Pod ${id.toUpperCase()}` }));
  state.therapists = PODS.flatMap((pod) => Array.from({ length: 6 }, (_, i) => ({ id: `${pod}-t${i + 1}`, pod, name: `Therapist ${pod}${i + 1}`, capHours: 30, active: true })));
  state.clients = PODS.flatMap((pod) => Array.from({ length: 20 }, (_, i) => ({ id: `${pod}-c${i + 1}`, pod, name: `Client ${pod}${i + 1}`, active: true, assigned: [0, 1, 2].map((step) => `${pod}-t${((i + step) % 6) + 1}`) })));
  // One weekly template: each client gets two 60-minute weekly slots with a free first-ranked therapist, client and room.
  const busy = new Set(), roomsUsed = new Map(), template = [];
  for (const client of state.clients) {
    for (let k = 0; k < 2; k++) {
      for (let attempt = 0, slot = (PODS.indexOf(client.pod) * 9 + Number(client.id.split('-c')[1]) * 5 + k * 17) % 40; attempt < 40; attempt++, slot = (slot + 1) % 40) {
        const therapistKey = `${client.assigned[0]}|${slot}`, clientKey = `${client.id}|${slot}`, used = roomsUsed.get(slot) || 0;
        if (busy.has(therapistKey) || busy.has(clientKey) || used >= 15) continue;
        busy.add(therapistKey); busy.add(clientKey); roomsUsed.set(slot, used + 1);
        template.push({ client: client.id, therapist: client.assigned[0], day: Math.floor(slot / 8), hour: 9 + (slot % 8), room: `room-${used + 1}` });
        break;
      }
    }
  }
  const monday = new Date(); monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) + 7); // next Monday: every session from week 0 is in the future
  let id = 0;
  for (let week = -HISTORY_WEEKS - 1; week < FUTURE_WEEKS; week++) for (const slot of week === -1 ? [] : template) { // week -1 is the current week, part past and part future: skip it
    state.sessions.push({ id: `s${String(id++).padStart(6, '0')}`, client: slot.client, therapist: slot.therapist, date: iso(monday.getTime() + (week * 7 + slot.day) * 86400000), time: `${String(slot.hour).padStart(2, '0')}:00`, minutes: 60, location: 'clinic', room: slot.room });
  }
  return { state, monday };
}

const timed = (fn) => { const start = performance.now(); const value = fn(); return { value, ms: performance.now() - start }; };

test('scheduling engine stays fast at real clinic size and keeps its results', () => {
  const { state, monday } = buildClinic(); // fixed-width ids: podView redaction is substring based, so s1 would also hide s10
  const now = Date.now();
  const future = state.sessions.filter((s) => Date.parse(`${s.date}T${s.time}:00Z`) > now + 86400000);
  assert.equal(state.pods.length, 5); assert.equal(state.therapists.length, 30); assert.equal(state.clients.length, 100); assert.equal(state.rooms.length, 15);
  assert.equal(future.length, 2400);
  assert.ok(state.sessions.length - future.length >= 10000, 'about a year of history');

  // Full validation, including history, from a cold start (no cached instants).
  const validation = timed(() => validateState(structuredClone(state)));
  assert.ok(validation.ms < 500, `validateState took ${validation.ms.toFixed(0)} ms`);

  // Overlap detection still finds the first offender: double-book a therapist on top of an existing future session.
  const clash = future[7], target = future.find((s) => s.client !== clash.client && s.therapist !== clash.therapist && s.date === clash.date && s.time === clash.time && state.clients.find((c) => c.id === s.client).assigned.includes(clash.therapist));
  assert.ok(target, 'a session at the same time whose client may see the same therapist');
  const broken = structuredClone(state); broken.sessions.find((s) => s.id === target.id).therapist = clash.therapist;
  const [lo, hi] = [clash.id, target.id].sort((x, y) => Number(x.slice(1)) - Number(y.slice(1)));
  assert.throws(() => validateState(broken), new RegExp(`^Error: Therapist overlap: ${lo} and ${hi}\\.$`));

  // a-t5 is on leave for two weeks starting in week 2.
  const leaveStart = iso(monday.getTime() + 14 * 86400000), leaveEnd = iso(monday.getTime() + 25 * 86400000);
  state.leaves.push({ id: 'leave-1', therapist: 'a-t5', pod: 'a', startDate: leaveStart, startTime: '09:00', endDate: leaveEnd, endTime: '17:00' });
  state.drafts.push({ id: 'draft-a', pod: 'a', changes: [], autoResolveRun: false });
  const expected = state.sessions.filter((s) => s.therapist === 'a-t5' && s.date >= leaveStart && s.date <= leaveEnd).map((s) => s.id).sort();
  assert.ok(expected.length >= 10 && expected.length <= 14, `about 12 affected sessions, got ${expected.length}`);
  const committed = JSON.stringify(state.sessions);

  const conflicts = leaveConflicts(state);
  assert.deepEqual(conflicts.map((item) => item.sessionId).sort(), expected);

  // Page state build: read model for the pod admin, with conflicts, draft issues and workable options.
  const page = timed(() => podView(withConflicts(state), 'a'));
  assert.ok(page.ms < 1000, `page state build took ${page.ms.toFixed(0)} ms`);
  const issueIds = page.value.draftIssues.a.map((item) => item.sessionId).sort();
  assert.deepEqual(issueIds, expected);
  assert.ok(page.value.draftIssues.a.every((item) => item.reasons.some((reason) => reason.startsWith('Therapist leave:'))));
  assert.deepEqual(Object.keys(page.value.workableOptions).sort(), expected, 'options are computed for issue sessions only');
  assert.equal(page.value.sessions.length, state.sessions.filter((s) => s.client.startsWith('a-')).length);
  const single = workableAssignments(state, 'a', expected[0]);
  assert.deepEqual(page.value.workableOptions[expected[0]], single);
  assert.ok(single.every((option) => option.therapist !== 'a-t5'));

  // Bounded Auto resolve: every affected session is either reassigned or reported, and nothing new breaks.
  const resolve = timed(() => boundedResolutionProposal(state, 'a'));
  assert.ok(resolve.ms < 5000, `Auto resolve took ${resolve.ms.toFixed(0)} ms`);
  const plan = resolve.value;
  const handled = new Set([...plan.proposed.filter((item) => item.causedBy.length).map((item) => item.change.sessionId), ...plan.stops.map((item) => item.sessionId)]);
  assert.deepEqual([...handled].sort(), expected);
  assert.ok(plan.proposed.length > 0, 'at least one session is reassigned');
  assert.ok(plan.proposed.every((item) => item.change.kind === 'assign' && item.change.therapist !== 'a-t5'));
  const applied = structuredClone(state); applied.drafts[0].changes = plan.allDraftChanges;
  const remaining = draftIssues(applied, 'a');
  const left = new Set([...plan.stops.map((item) => item.sessionId)]);
  assert.deepEqual(remaining.map((item) => item.sessionId).sort(), [...left].sort(), 'only stopped sessions still have issues');
  assert.deepEqual(plan.unresolved.map((item) => item.sessionId).sort(), [...left].sort());
  assert.equal(JSON.stringify(state.sessions), committed, 'the proposal never changes committed sessions');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoState } from '../lib/demo-seed.mjs';
import { boundedResolutionProposal, todayInZone, validateState, weekKey, addDays, withConflicts } from '../lib/scheduling.mjs';

// A far-future date keeps every session in the future, so the Auto resolve result is stable (the scenario-2 session then also counts as a live conflict, so scenario 1 is filtered to therapist a-t1).
const FIXED = '2035-03-14';

function autoResolveMix(state) {
  const proposal = boundedResolutionProposal(state, 'a');
  const root = new Set(withConflicts(state).conflicts.filter((item) => item.session.therapist === 'a-t1').map((item) => item.sessionId));
  const cascaded = new Set(proposal.proposed.map((item) => item.displacedBy).filter(Boolean)); // roots that needed a cascade
  const roots = proposal.proposed.filter((item) => root.has(item.change.sessionId));
  return {
    proposal,
    direct: roots.filter((item) => item.rank === 2 && !cascaded.has(item.change.sessionId)),
    cascade: proposal.proposed.filter((item) => item.displacedBy),
    fallback: roots.filter((item) => item.rank === 3),
    stops: proposal.stops
  };
}

test('demo seed validates, is deterministic, and has the documented shape', () => {
  const state = buildDemoState({ today: FIXED, revision: 7 });
  validateState(structuredClone(state));
  assert.deepEqual(buildDemoState({ today: FIXED, revision: 7 }), state);
  assert.equal(state.revision, 7);
  assert.deepEqual(state.pods.map((pod) => pod.id), ['a', 'b']);
  for (const pod of ['a', 'b']) {
    assert.equal(state.therapists.filter((t) => t.pod === pod).length, 5);
    assert.equal(state.clients.filter((c) => c.pod === pod).length, 10);
  }
  assert.equal(state.rooms.length, 15);
  assert.equal(state.drafts.length, 0);
  assert.equal(state.notifications.length, 0);
  assert.ok(state.sessions.some((s) => s.location === 'home' && s.room === null && s.minutes > 60));
  const monday = weekKey(FIXED, 1);
  assert.ok(state.sessions.some((s) => s.date < monday), 'has past weeks');
  assert.ok(state.sessions.some((s) => s.date >= addDays(monday, 49)), 'runs about 8 weeks ahead');
  assert.ok(state.clients.every((c) => c.assigned.every((id) => state.therapists.find((t) => t.id === id).pod === c.pod)));
  // Leave dates are relative to the run date: next Tue 09:00 to Wed 17:00 for Maple.
  const leave = state.leaves.find((l) => l.therapist === 'a-t1');
  assert.deepEqual([leave.startDate, leave.startTime, leave.endDate, leave.endTime], [addDays(monday, 8), '09:00', addDays(monday, 9), '17:00']);
});

test('Maple scenario 1 gives a mix of direct, cascade, rank-3 and unresolved Auto resolve outcomes', () => {
  const state = buildDemoState({ today: FIXED });
  const view = withConflicts(state);
  assert.equal(view.conflicts.filter((c) => c.session.therapist === 'a-t1').length, 5);
  const mix = autoResolveMix(state);
  assert.equal(mix.direct.length, 2);
  assert.equal(mix.cascade.length, 1);
  assert.equal(mix.fallback.length, 1);
  assert.equal(mix.stops.length, 1);
  assert.match(mix.stops[0].reason, /No safe automatic assignment within cascade depth 1/);
  assert.equal(mix.proposal.unresolved.length, 1);
  // Proposals do not change committed data.
  assert.deepEqual(state, buildDemoState({ today: FIXED }));
});

test('Cedar leave is separate and other scenarios hold for the real run date', () => {
  const state = buildDemoState({ today: todayInZone('America/Toronto') });
  const view = withConflicts(state);
  const podOf = (item) => state.clients.find((c) => c.id === item.session.client).pod;
  assert.equal(view.conflicts.filter((c) => podOf(c) === 'b').length, 2);
  assert.equal(view.conflicts.filter((c) => podOf(c) === 'a').length, 5);
  assert.equal(view.historicalAlerts.filter((c) => podOf(c) === 'a').length, 1);
  assert.equal(view.historicalAlerts.filter((c) => podOf(c) === 'b').length, 0);
  const mix = autoResolveMix(state);
  assert.deepEqual([mix.direct.length, mix.cascade.length, mix.fallback.length, mix.stops.length], [2, 1, 1, 1]);
});

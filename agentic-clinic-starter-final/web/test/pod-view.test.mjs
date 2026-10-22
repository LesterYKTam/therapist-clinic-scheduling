import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, draftIssues, workableAssignments } from '../lib/scheduling.mjs';
import { podView } from '../lib/pod-view.mjs';

test('D-B020: pod read model scopes lists to the viewed pod and shows other pod names in conflict reasons', () => {
  const state = initialState();
  const otherClient = state.clients.find((item) => item.pod === 'b');
  const otherTherapist = state.therapists.find((item) => item.pod === 'b');
  const otherSession = { id: 'other-secret-session', client: otherClient.id, therapist: otherTherapist.id, date: '2026-10-12', time: '09:00', minutes: 60, location: 'clinic', room: state.rooms[0].id };
  state.sessions.push(otherSession);
  const ownClient = state.clients.find((item) => item.pod === 'a');
  state.sessions.push({ id: 'own-session', client: ownClient.id, therapist: ownClient.assigned[0], date: '2026-10-12', time: '10:00', minutes: 60, location: 'clinic', room: state.rooms[0].id });
  state.draftIssues = { a: [{ sessionId: 'own-session', session: null, reasons: [`Room overlaps session ${otherSession.id} for ${otherClient.name}.`] }] };
  const view = podView(state, 'a');
  assert.equal(view.pods.length, 1);
  assert.equal(view.rooms.length, state.rooms.length);
  assert.equal(view.clients.every((item) => item.pod === 'a'), true);
  assert.equal(view.therapists.every((item) => item.pod === 'a'), true);
  assert.equal(view.sessions.length, 1);
  assert.equal(Array.isArray(view.workableOptions['own-session']), true);
  const text = JSON.stringify(view);
  assert.equal(view.allPods.length, state.pods.length);
  assert.equal(text.includes(otherClient.name), true); // only through the unredacted reason text
  assert.equal(view.draftIssues.a[0].reasons[0], `Room overlaps session ${otherSession.id} for ${otherClient.name}.`);
  assert.equal(view.sessions.some((item) => item.id === otherSession.id), false);
  assert.equal(view.clients.some((item) => item.id === otherClient.id), false);
  // Viewing pod b shows pod b's own people and bookings.
  const other = podView(state, 'b');
  assert.deepEqual(other.pods.map((item) => item.id), ['b']);
  assert.equal(other.sessions.some((item) => item.id === otherSession.id), true);
  assert.equal(other.clients.every((item) => item.pod === 'b'), true);
});

test('D-B020 replaces BUG-017: no redaction helper remains and reasons are passed through verbatim', async () => {
  const module = await import('../lib/pod-view.mjs');
  assert.equal('podTextRedactor' in module, false);
  const state = initialState();
  const own = state.clients.find((item) => item.pod === 'a');
  const foreign = state.clients.find((item) => item.pod === 'b');
  state.draftIssues = { a: [{ sessionId: 'x', session: null, reasons: [`Clash with ${foreign.name} (${foreign.id}) and ${own.name}.`] }] };
  assert.equal(podView(state, 'a').draftIssues.a[0].reasons[0], `Clash with ${foreign.name} (${foreign.id}) and ${own.name}.`);
});

test('BUG-018: served options cover draft-added sessions and match a full-state computation', () => {
  const state = initialState();
  state.sessions.push({ id: 'b-booking', client: 'b-c1', therapist: 'b-t1', date: '2030-01-07', time: '09:00', minutes: 60, location: 'clinic', room: 'room-1' });
  const added = { id: 'a-new', client: 'a-c1', therapist: 'a-t1', date: '2030-01-07', time: '09:00', minutes: 60, location: 'clinic', room: 'room-1' };
  state.drafts = [{ id: 'd1', pod: 'a', autoResolveRun: false, changes: [{ kind: 'add', sessionId: 'a-new', session: added }] }];
  state.draftIssues = { a: draftIssues(state, 'a') };
  assert.equal(state.draftIssues.a.length, 1);
  assert.equal(state.draftIssues.a[0].sessionId, 'a-new');
  const view = podView(state, 'a');
  assert.deepEqual(view.workableOptions['a-new'], workableAssignments(state, 'a', 'a-new'));
  // A pod-only computation cannot see pod b's booking and would offer therapists that cannot clear the room clash.
  assert.ok(workableAssignments(view, 'a', 'a-new').length > 0);
  assert.equal(view.workableOptions['a-new'].length, 0);
});

test('UX-013: roomsFree lists active rooms free for each issue session across ALL pods committed bookings', () => {
  const state = initialState();
  const make = (id, client, therapist, time, room) => ({ id, client, therapist, date: '2030-01-07', time, minutes: 60, location: 'clinic', room });
  state.sessions.push(
    make('a-issue', 'a-c1', 'a-t1', '09:00', 'room-1'),
    make('b-overlap', 'b-c1', 'b-t1', '09:30', 'room-2'), // other pod, overlaps: room-2 is taken
    make('b-touching', 'b-c1', 'b-t1', '10:00', 'room-3'), // starts when the issue ends: room-3 stays free
    make('a-overlap', 'a-c2', 'a-t2', '09:00', 'room-4'), // same pod, overlaps: room-4 is taken
    { ...make('a-home', 'a-c2', 'a-t2', '09:00', null), location: 'home' },
    make('b-other-day', 'b-c1', 'b-t1', '09:00', 'room-6'),
  );
  state.sessions.find((item) => item.id === 'b-other-day').date = '2030-01-08';
  state.rooms.find((room) => room.id === 'room-5').active = false;
  state.draftIssues = { a: [{ sessionId: 'a-issue', session: null, reasons: ['x'] }] };
  const view = podView(state, 'a');
  const free = view.roomsFree['a-issue'];
  assert.equal(free.includes('room-1'), true, 'its own room counts as free');
  assert.equal(free.includes('room-3'), true);
  assert.equal(free.includes('room-6'), true);
  assert.equal(free.includes('room-2'), false, "another pod's overlapping booking blocks the room");
  assert.equal(free.includes('room-4'), false);
  assert.equal(free.includes('room-5'), false, 'inactive rooms are never free');
  assert.deepEqual(Object.keys(view.roomsFree), ['a-issue']);
  assert.deepEqual(podView(initialState(), 'a').roomsFree, {});
});

test('UX-013: committed leave conflicts get workable options before any draft exists', () => {
  const state = initialState();
  const client = state.clients.find((item) => item.pod === 'a');
  const session = { id: 'conflicted', client: client.id, therapist: client.assigned[0], date: '2030-01-07', time: '09:00', minutes: 60, location: 'clinic', room: 'room-1' };
  state.sessions.push(session);
  state.conflicts = [{ sessionId: 'conflicted', session, leaveIds: [], leaves: [], historical: false }];
  const view = podView(state, 'a');
  assert.deepEqual(view.workableOptions.conflicted, workableAssignments(state, 'a', 'conflicted'));
  assert.equal(Array.isArray(view.roomsFree.conflicted), true);
});

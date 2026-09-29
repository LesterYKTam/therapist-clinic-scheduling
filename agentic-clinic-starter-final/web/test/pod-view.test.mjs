import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, draftIssues, workableAssignments } from '../lib/scheduling.mjs';
import { podView, podTextRedactor } from '../lib/pod-view.mjs';

test('pod read model hides another pod while preserving anonymous shared-room blockers', () => {
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
  assert.equal(text.includes(otherSession.id), false);
  assert.equal(text.includes(otherClient.name), false);
  assert.equal(text.includes(otherTherapist.name), false);
  assert.match(view.draftIssues.a[0].reasons[0], /another pod’s booking/);
});

test('BUG-017: redaction masks whole foreign ids and names only, never own ids or text', () => {
  const state = initialState();
  const own = state.clients.find((item) => item.pod === 'a');
  own.name = 'Samantha Own'; own.id = 'a-c10';
  state.clients.push({ id: 'a-c1', pod: 'b', name: 'Sam', active: true, assigned: ['b-t1', 'b-t2', 'b-t3'] });
  state.sessions.push({ id: 's1', client: 'a-c1', therapist: 'b-t1', date: '2030-01-07', time: '09:00', minutes: 60, location: 'clinic', room: 'room-1' });
  state.sessions.push({ id: 's10', client: 'a-c10', therapist: 'a-t1', date: '2030-01-08', time: '09:00', minutes: 60, location: 'clinic', room: 'room-1' });
  const hide = podTextRedactor(state, 'a');
  const mask = 'another pod’s booking';
  assert.equal(hide('Overlaps s1.'), `Overlaps ${mask}.`);
  assert.equal(hide('Overlaps s10.'), 'Overlaps s10.');
  assert.equal(hide('s1 and s10 and s1-x and xs1'), `${mask} and s10 and s1-x and xs1`);
  assert.equal(hide('Sam with Samantha Own'), `${mask} with Samantha Own`);
  assert.equal(hide('Sam, Sam Sample'), `${mask}, ${mask}`);
  assert.equal(hide('a-c10 a-c1'), `a-c10 ${mask}`);
  assert.equal(hide('nothing here'), 'nothing here');
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

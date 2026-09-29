import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../lib/scheduling.mjs';
import { podView } from '../lib/pod-view.mjs';

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

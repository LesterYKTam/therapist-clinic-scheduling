import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeClinicAction, mergePodSetup } from '../lib/clinic-access.mjs';
import { initialState } from '../lib/scheduling.mjs';
import { podView } from '../lib/pod-view.mjs';

const state = {
  pods: [{ id: 'a' }, { id: 'b' }],
  clients: [{ id: 'a-c', pod: 'a' }, { id: 'b-c', pod: 'b' }],
  therapists: [{ id: 'a-t', pod: 'a' }, { id: 'b-t', pod: 'b' }],
  sessions: [{ id: 'a-s', client: 'a-c' }, { id: 'b-s', client: 'b-c' }],
  drafts: [{ pod: 'a', changes: [{ kind: 'add', sessionId: 'a-new', session: { client: 'a-c' } }] }],
};

test('clinic action authorization follows assigned pod rather than supplied pod', () => {
  assert.doesNotThrow(() => authorizeClinicAction(state, 'a', { action: 'record-leave', leave: { therapist: 'a-t' } }));
  assert.doesNotThrow(() => authorizeClinicAction(state, 'a', { action: 'stage-draft', pod: 'a', change: { sessionId: 'a-new' } }));
  for (const action of [
    { action: 'record-leave', leave: { therapist: 'b-t' } },
    { action: 'commit', kind: 'edit-occurrence', occurrenceId: 'b-s', client: 'a-c' },
    { action: 'preview', kind: 'edit-occurrence', occurrenceId: 'a-s', client: 'b-c' },
    { action: 'stage-draft', pod: 'a', change: { sessionId: 'b-s' } },
    { action: 'stage-draft-add', pod: 'a', client: 'b-c' },
    { action: 'begin-draft', pod: 'b' },
  ]) assert.throws(() => authorizeClinicAction(state, 'a', action));
  assert.throws(() => authorizeClinicAction(state, null, { action: 'begin-draft', pod: 'a' }));
});

test('Setup merges own-pod people and shared rooms while preserving other pods', () => {
  const committed = initialState();
  const form = podView(committed, 'a');
  form.therapists[0].capHours = 30;
  form.rooms[0].name = 'Shared therapy room';
  const merged = mergePodSetup(committed, 'a', form);
  assert.equal(merged.therapists.find((person) => person.id === form.therapists[0].id).capHours, 30);
  assert.equal(merged.rooms[0].name, 'Shared therapy room');
  assert.deepEqual(merged.therapists.filter((person) => person.pod === 'b'), committed.therapists.filter((person) => person.pod === 'b'));
  assert.deepEqual(merged.clients.filter((person) => person.pod === 'b'), committed.clients.filter((person) => person.pod === 'b'));
  assert.deepEqual(merged.sessions, committed.sessions);
  form.clients[0].pod = 'b';
  assert.throws(() => mergePodSetup(committed, 'a', form));
  form.clients[0].pod = 'a';
  form.sessions = [{ id: 'injected-booking' }];
  assert.throws(() => mergePodSetup(committed, 'a', form));
});

import { podView } from './pod-view.mjs';

const podForClient = (state, id) => state.clients.find((client) => client.id === id)?.pod;

/** Merge a pod admin's Setup form into the authoritative clinic snapshot. */
export function mergePodSetup(state, assignedPod, next) {
  if (!assignedPod || !state.pods.some((pod) => pod.id === assignedPod)) throw new Error('An admin pod assignment is required.');
  if (!next || typeof next !== 'object') throw new Error('Choose valid Setup changes.');
  const currentView = podView(state, assignedPod);
  for (const key of ['pods', 'series', 'sessions', 'leaves', 'drafts', 'notifications']) {
    if (JSON.stringify(next[key]) !== JSON.stringify(currentView[key])) throw new Error(`Setup cannot change ${key}.`);
  }
  if (!Array.isArray(next.therapists) || next.therapists.some((item) => item.pod !== assignedPod)) throw new Error('Setup staff must belong to your assigned pod.');
  if (!Array.isArray(next.clients) || next.clients.some((item) => item.pod !== assignedPod)) throw new Error('Setup clients must belong to your assigned pod.');
  if (!Array.isArray(next.rooms) || !next.config) throw new Error('Choose valid shared rooms and calendar settings.');
  const merged = structuredClone(state);
  merged.config = structuredClone(next.config);
  merged.rooms = structuredClone(next.rooms);
  merged.therapists = [...state.therapists.filter((item) => item.pod !== assignedPod), ...structuredClone(next.therapists)];
  merged.clients = [...state.clients.filter((item) => item.pod !== assignedPod), ...structuredClone(next.clients)];
  return merged;
}

/** Authorize a clinic action using the server session's assigned pod and committed state. */
export function authorizeClinicAction(state, assignedPod, body) {
  if (!assignedPod || !state.pods.some((pod) => pod.id === assignedPod)) throw new Error('An admin pod assignment is required.');
  if (!body || typeof body !== 'object') throw new Error('Choose a clinic action.');
  const action = body.action;
  if (action === 'setup') { mergePodSetup(state, assignedPod, body.setup); return; }

  if (action === 'preview' || action === 'commit') {
    const original = body.occurrenceId ? state.sessions.find((item) => item.id === body.occurrenceId) : null;
    if (body.occurrenceId && !original) throw new Error('This booking is outside your assigned pod.');
    const originalPod = original && podForClient(state, original.client);
    const requestedPod = body.client && podForClient(state, body.client);
    if (original && originalPod !== assignedPod) throw new Error('This booking is outside your assigned pod.');
    if (body.client && requestedPod !== assignedPod) throw new Error('This client is outside your assigned pod.');
    if (!original && requestedPod !== assignedPod) throw new Error('Choose a client in your assigned pod.');
    return;
  }

  if (action === 'record-leave') {
    const therapist = state.therapists.find((item) => item.id === body.leave?.therapist);
    if (therapist?.pod !== assignedPod) throw new Error('This therapist is outside your assigned pod.');
    return;
  }

  const podActions = new Set([
    'amend-leave', 'withdraw-leave', 'begin-draft', 'discard-draft',
    'preview-auto-resolve', 'apply-auto-resolve', 'discard-auto-resolve',
    'stage-draft', 'stage-draft-add', 'remove-draft-change', 'commit-draft', 'handle-notification',
  ]);
  if (!podActions.has(action)) throw new Error('Unknown clinic action.');
  if (body.pod !== assignedPod) throw new Error('This action is outside your assigned pod.');
  if (action === 'stage-draft-add' && podForClient(state, body.client) !== assignedPod) throw new Error('This client is outside your assigned pod.');
  if (action === 'remove-draft-change' && !state.drafts.find((draft) => draft.pod === assignedPod)?.changes.some((item) => item.sessionId === body.sessionId)) throw new Error('This staged change is outside your assigned pod.');
  if (action === 'stage-draft') {
    const id = body.change?.sessionId;
    const committed = state.sessions.find((item) => item.id === id);
    const added = state.drafts.find((draft) => draft.pod === assignedPod)?.changes.find((item) => item.kind === 'add' && item.sessionId === id)?.session;
    if (podForClient(state, (committed || added)?.client) !== assignedPod) throw new Error('This booking is outside your assigned pod.');
  }
}

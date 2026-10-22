import { ClinicRuleError } from './clinic-error.mjs';
/** A read model of one pod. Every admin may read every pod (D-B020): lists are scoped to the viewed pod, with clinic-wide rooms and config. */
import { interval, workableAssignmentsFor } from './scheduling.mjs';

export function podView(state, podId) {
  const pod = state.pods.find((item) => item.id === podId);
  if (!pod) throw new ClinicRuleError('An assigned pod is required.');
  const clients = state.clients.filter((item) => item.pod === podId);
  const clientIds = new Set(clients.map((item) => item.id));
  const sessions = state.sessions.filter((item) => clientIds.has(item.client));
  const issueSessionIds = new Set((state.draftIssues?.[podId] || []).map((item) => item.sessionId));
  const draftAddedIds = (state.drafts || []).find((item) => item.pod === podId)?.changes.filter((item) => item.kind === 'add').map((item) => item.sessionId) || [];
  // Committed leave conflicts count too: the guided resolve panel needs their options before any draft exists.
  const conflictIds = new Set((state.conflicts || []).filter((item) => clientIds.has(item.session.client)).map((item) => item.sessionId));
  const optionIds = [...sessions.map((session) => session.id), ...draftAddedIds].filter((id) => issueSessionIds.has(id) || conflictIds.has(id));
  return {
    schema: state.schema,
    revision: state.revision,
    config: structuredClone(state.config),
    pods: [structuredClone(pod)],
    allPods: structuredClone(state.pods),
    rooms: structuredClone(state.rooms),
    therapists: structuredClone(state.therapists.filter((item) => item.pod === podId)),
    clients: structuredClone(clients),
    series: structuredClone(state.series.filter((item) => clientIds.has(item.client))),
    sessions: structuredClone(sessions),
    leaves: structuredClone(state.leaves.filter((item) => item.pod === podId)),
    drafts: structuredClone(state.drafts.filter((item) => item.pod === podId)),
    notifications: structuredClone(state.notifications.filter((item) => item.pod === podId)),
    conflicts: structuredClone((state.conflicts || []).filter((item) => clientIds.has(item.session.client))),
    historicalAlerts: structuredClone((state.historicalAlerts || []).filter((item) => clientIds.has(item.session.client))),
    proposalStale: { [podId]: !!state.proposalStale?.[podId] },
    draftIssues: { [podId]: structuredClone(state.draftIssues?.[podId] || []) },
    // Workable options only serve issue resolution, so compute them for issue sessions (committed and draft-added); the client derives any other on demand.
    workableOptions: workableAssignmentsFor(state, podId, optionIds),
    roomsFree: roomsFreeFor(state, podId, optionIds),
  };
}

/** For each given session of the pod: ids of active rooms with no committed booking, in ANY pod, that overlaps the session's interval. The session's own room counts as free. Other pods' bookings are not in the pod view, so this is computed here. */
function roomsFreeFor(state, podId, sessionIds) {
  if (!sessionIds.length) return {};
  const clientPod = new Map(state.clients.map((item) => [item.id, item.pod]));
  const draftAdded = (state.drafts || []).find((item) => item.pod === podId)?.changes.filter((item) => item.kind === 'add').map((item) => item.session) || [];
  const known = new Map([...state.sessions, ...draftAdded].filter((item) => clientPod.get(item.client) === podId).map((item) => [item.id, item]));
  const booked = state.sessions.filter((item) => item.location !== 'home' && item.room).map((item) => ({ id: item.id, room: item.room, span: interval(item, state.config) }));
  const activeRooms = state.rooms.filter((room) => room.active).map((room) => room.id);
  const result = {};
  for (const id of sessionIds) {
    const session = known.get(id);
    if (!session) continue;
    const [start, end] = interval(session, state.config);
    const used = new Set(booked.filter((item) => item.id !== id && start < item.span[1] && item.span[0] < end).map((item) => item.room));
    result[id] = activeRooms.filter((room) => !used.has(room));
  }
  return result;
}

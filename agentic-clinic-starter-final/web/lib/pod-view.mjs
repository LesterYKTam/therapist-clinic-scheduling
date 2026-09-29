/** A pod admin's read model. Keep clinic-wide room inventory, but no other pod's people or bookings. */
import { workableAssignments } from './scheduling.mjs';

export function podView(state, podId) {
  const pod = state.pods.find((item) => item.id === podId);
  if (!pod) throw new Error('An assigned pod is required.');
  const clients = state.clients.filter((item) => item.pod === podId);
  const clientIds = new Set(clients.map((item) => item.id));
  const sessions = state.sessions.filter((item) => clientIds.has(item.client));
  const ownSessionIds = new Set(sessions.map((item) => item.id));
  const foreignTokens = [
    ...state.clients.filter((item) => item.pod !== podId).flatMap((item) => [item.id, item.name]),
    ...state.therapists.filter((item) => item.pod !== podId).flatMap((item) => [item.id, item.name]),
    ...state.sessions.filter((item) => !ownSessionIds.has(item.id)).map((item) => item.id),
  ].filter(Boolean).sort((a, b) => b.length - a.length);
  const redact = (value) => {
    if (typeof value === 'string') return foreignTokens.reduce((text, token) => text.replaceAll(token, 'another pod’s booking'), value);
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
    return value;
  };
  return {
    schema: state.schema,
    revision: state.revision,
    config: structuredClone(state.config),
    pods: [structuredClone(pod)],
    rooms: structuredClone(state.rooms),
    therapists: structuredClone(state.therapists.filter((item) => item.pod === podId)),
    clients: structuredClone(clients),
    series: structuredClone(state.series.filter((item) => clientIds.has(item.client))),
    sessions: structuredClone(sessions),
    leaves: structuredClone(state.leaves.filter((item) => item.pod === podId)),
    drafts: redact(structuredClone(state.drafts.filter((item) => item.pod === podId))),
    notifications: structuredClone(state.notifications.filter((item) => item.pod === podId)),
    conflicts: structuredClone((state.conflicts || []).filter((item) => clientIds.has(item.session.client))),
    draftIssues: { [podId]: redact(structuredClone(state.draftIssues?.[podId] || [])) },
    workableOptions: Object.fromEntries(sessions.map((session) => [session.id, workableAssignments(state, podId, session.id)])),
  };
}

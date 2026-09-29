/** A pod admin's read model. Keep clinic-wide room inventory, but no other pod's people or bookings. */
import { workableAssignmentsFor } from './scheduling.mjs';

export function podView(state, podId) {
  const pod = state.pods.find((item) => item.id === podId);
  if (!pod) throw new Error('An assigned pod is required.');
  const clients = state.clients.filter((item) => item.pod === podId);
  const clientIds = new Set(clients.map((item) => item.id));
  const sessions = state.sessions.filter((item) => clientIds.has(item.client));
  const ownSessionIds = new Set(sessions.map((item) => item.id));
  const issueSessionIds = new Set((state.draftIssues?.[podId] || []).map((item) => item.sessionId));
  const foreignTokens = [
    ...state.clients.filter((item) => item.pod !== podId).flatMap((item) => [item.id, item.name]),
    ...state.therapists.filter((item) => item.pod !== podId).flatMap((item) => [item.id, item.name]),
    ...state.sessions.filter((item) => !ownSessionIds.has(item.id)).map((item) => item.id),
  ].filter(Boolean);
  // Longest token wins at each position; tokens are looked up by length so cost does not grow with the clinic's history.
  const tokenSet = new Set(foreignTokens);
  const tokenLengths = [...new Set(foreignTokens.map((token) => token.length))].sort((a, b) => b - a);
  const hide = (text) => {
    let out = '', from = 0, at = 0;
    while (at < text.length) {
      const length = tokenLengths.find((size) => at + size <= text.length && tokenSet.has(text.slice(at, at + size)));
      if (length === undefined) { at++; continue; }
      out += text.slice(from, at) + 'another pod’s booking'; at += length; from = at;
    }
    return from === 0 ? text : out + text.slice(from);
  };
  const redact = (value) => {
    if (typeof value === 'string') return hide(value);
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
    // Workable options only serve issue resolution, so compute them for issue sessions; the client derives any other on demand.
    workableOptions: workableAssignmentsFor(state, podId, sessions.filter((session) => issueSessionIds.has(session.id)).map((session) => session.id)),
  };
}

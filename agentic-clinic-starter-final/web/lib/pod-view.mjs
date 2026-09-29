import { ClinicRuleError } from './clinic-error.mjs';
/** A pod admin's read model. Keep clinic-wide room inventory, but no other pod's people or bookings. */
import { workableAssignmentsFor } from './scheduling.mjs';

/** Returns a function that replaces other pods' client/therapist names and ids and session ids in text. */
export function podTextRedactor(state, podId) {
  const ownClientIds = new Set(state.clients.filter((item) => item.pod === podId).map((item) => item.id));
  const ownSessionIds = new Set(state.sessions.filter((item) => ownClientIds.has(item.client)).map((item) => item.id));
  const foreignTokens = [
    ...state.clients.filter((item) => item.pod !== podId).flatMap((item) => [item.id, item.name]),
    ...state.therapists.filter((item) => item.pod !== podId).flatMap((item) => [item.id, item.name]),
    ...state.sessions.filter((item) => !ownSessionIds.has(item.id)).map((item) => item.id),
  ].filter(Boolean);
  // Longest token wins at each position; tokens are looked up by length so cost does not grow with the clinic's history.
  const tokenSet = new Set(foreignTokens);
  const tokenLengths = [...new Set(foreignTokens.map((token) => token.length))].sort((a, b) => b - a);
  const idChar = /[A-Za-z0-9_-]/;
  return (text) => {
    let out = '', from = 0, at = 0;
    while (at < text.length) {
      // Whole tokens only: a match is never preceded or followed by an id character, so foreign "s1" leaves own "s10" alone.
      const length = idChar.test(text[at - 1] || '') ? undefined : tokenLengths.find((size) => at + size <= text.length && !idChar.test(text[at + size] || '') && tokenSet.has(text.slice(at, at + size)));
      if (length === undefined) { at++; continue; }
      out += text.slice(from, at) + 'another pod’s booking'; at += length; from = at;
    }
    return from === 0 ? text : out + text.slice(from);
  };
}

export function podView(state, podId) {
  const pod = state.pods.find((item) => item.id === podId);
  if (!pod) throw new ClinicRuleError('An assigned pod is required.');
  const clients = state.clients.filter((item) => item.pod === podId);
  const clientIds = new Set(clients.map((item) => item.id));
  const sessions = state.sessions.filter((item) => clientIds.has(item.client));
  const issueSessionIds = new Set((state.draftIssues?.[podId] || []).map((item) => item.sessionId));
  const draftAddedIds = (state.drafts || []).find((item) => item.pod === podId)?.changes.filter((item) => item.kind === 'add').map((item) => item.sessionId) || [];
  const optionIds = [...sessions.map((session) => session.id), ...draftAddedIds].filter((id) => issueSessionIds.has(id));
  const hide = podTextRedactor(state, podId);
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
    historicalAlerts: structuredClone((state.historicalAlerts || []).filter((item) => clientIds.has(item.session.client))),
    proposalStale: { [podId]: !!state.proposalStale?.[podId] },
    draftIssues: { [podId]: redact(structuredClone(state.draftIssues?.[podId] || [])) },
    // Workable options only serve issue resolution, so compute them for issue sessions (committed and draft-added); the client derives any other on demand.
    workableOptions: workableAssignmentsFor(state, podId, optionIds),
  };
}

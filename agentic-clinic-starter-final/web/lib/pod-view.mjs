import { ClinicRuleError } from './clinic-error.mjs';
/** A read model of one pod. Every admin may read every pod (D-B020): lists are scoped to the viewed pod, with clinic-wide rooms and config. */
import { workableAssignmentsFor } from './scheduling.mjs';

export function podView(state, podId) {
  const pod = state.pods.find((item) => item.id === podId);
  if (!pod) throw new ClinicRuleError('An assigned pod is required.');
  const clients = state.clients.filter((item) => item.pod === podId);
  const clientIds = new Set(clients.map((item) => item.id));
  const sessions = state.sessions.filter((item) => clientIds.has(item.client));
  const issueSessionIds = new Set((state.draftIssues?.[podId] || []).map((item) => item.sessionId));
  const draftAddedIds = (state.drafts || []).find((item) => item.pod === podId)?.changes.filter((item) => item.kind === 'add').map((item) => item.sessionId) || [];
  const optionIds = [...sessions.map((session) => session.id), ...draftAddedIds].filter((id) => issueSessionIds.has(id));
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
  };
}

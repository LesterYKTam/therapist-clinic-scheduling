"use client";

import { nameOf } from "./names";
import { shortName } from "./resolve-model";
import type { ClinicState, PodHandler, Session } from "./types";

// The Auto resolve proposal: suggested moves, what is still unresolved, and
// the apply / discard controls. Nothing here touches the committed calendar.
export function AutoResolveProposal({
  state,
  pod,
  proposal,
  sessions,
  readOnly,
  onApply,
  onDiscard,
}: {
  state: ClinicState;
  pod: string;
  proposal: any;
  sessions: Session[];
  readOnly: boolean;
  onApply: PodHandler;
  onDiscard: PodHandler;
}) {
  const session = (id: string) => sessions.find((item) => item.id === id);
  return (
    <section className="resolve-card proposal-card" aria-label="Auto resolve proposal">
      <h2>Auto resolve proposal · {proposal.proposed.length} changed sessions</h2>
      <p>Review all suggested moves. Nothing in the committed calendar has changed.</p>
      {proposal.proposed.length ? (
        <ol>
          {proposal.proposed.map((item: any) => (
            <li key={item.change.sessionId}>
              <strong>{session(item.change.sessionId)?.date} {session(item.change.sessionId)?.time} · {nameOf(state.clients, session(item.change.sessionId)?.client)}</strong>
              <span> with {shortName(nameOf(state.therapists, item.change.therapist || item.change.session?.therapist) || "")} · Rank {item.rank}</span>
              {item.displacedBy && (
                <p>Moved because of {nameOf(state.clients, session(item.displacedBy)?.client)}’s session.</p>
              )}
              {!item.displacedBy && item.causedBy?.length > 0 && <p>{item.causedBy.join("; ")}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p>No safe automatic changes were found.</p>
      )}
      <h3 className="options-head">Still unresolved · {proposal.unresolved.length}</h3>
      {proposal.unresolved.length ? (
        <ol>
          {proposal.unresolved.map((item: any) => (
            <li key={item.sessionId}>
              {nameOf(state.clients, item.session?.client)}: {item.reasons.join("; ")}
            </li>
          ))}
        </ol>
      ) : (
        <p>No conflicts remain in this proposal.</p>
      )}
      {proposal.stops.length > 0 && (
        <ul>
          {proposal.stops.map((item: any) => (
            <li key={item.sessionId}>
              {nameOf(state.clients, session(item.sessionId)?.client)}: {item.reason}
            </li>
          ))}
        </ul>
      )}
      {state.proposalStale?.[pod] && (
        <p role="alert">
          The shared schedule changed after this proposal. Discard these suggestions and continue manually.
        </p>
      )}
      {!readOnly && (
        <div className="detail-actions">
          <button
            className="primary"
            disabled={state.proposalStale?.[pod] || !proposal.proposed.length}
            onClick={() => void onApply(pod)}
          >
            Apply to draft
          </button>
          <button onClick={() => void onDiscard(pod)}>Discard suggestions</button>
        </div>
      )}
    </section>
  );
}

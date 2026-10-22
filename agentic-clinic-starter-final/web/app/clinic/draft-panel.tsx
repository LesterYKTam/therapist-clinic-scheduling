"use client";

import { nameOf } from "./names";
import { changeText } from "./resolve-model";
import type { ClinicState, PodHandler, Session } from "./types";

// The shared schedule draft in the staged style (dashed border, staged tint):
// what is waiting to be committed, what still blocks the commit, and the
// commit / discard controls. Nothing here reaches the calendar until Commit.
export function DraftPanel({
  state,
  pod,
  draft,
  sessions,
  hasProposal,
  openIds,
  readOnly,
  onRemove,
  onCommit,
  onDiscard,
}: {
  state: ClinicState;
  pod: string;
  draft: any;
  sessions: Session[];
  hasProposal: boolean;
  // Conflicts still listed in the Conflicts view; they are counted, not repeated here.
  openIds: Set<string>;
  readOnly: boolean;
  onRemove: (pod: string, sessionId: string) => Promise<boolean>;
  onCommit: PodHandler;
  onDiscard: PodHandler;
}) {
  const issues = state.draftIssues?.[pod] || [];
  const stillOpen = issues.filter((issue: any) => openIds.has(issue.sessionId)).length;
  const others = issues.filter((issue: any) => !openIds.has(issue.sessionId));
  const count = draft.changes.length;
  const plural = (n: number) => `${n} ${n === 1 ? "change" : "changes"}`;
  const sessionFor = (id: string) =>
    sessions.find((item) => item.id === id) || state.sessions?.find((item) => item.id === id);
  return (
    <section className="resolve-card draft-card" aria-label="Draft changes">
      <div className="resolve-head">
        <h2>Draft</h2>
        <span className="draft-count">{plural(count)}</span>
      </div>
      <p className="draft-note">
        Not saved yet. Nothing changes for clients or therapists until you commit.
      </p>
      {count ? (
        <ol className="draft-list">
          {draft.changes.map((change: any) => {
            const text = changeText(
              change,
              sessionFor(change.sessionId),
              state.clients,
              state.therapists,
              state.rooms,
            );
            return (
              <li key={change.sessionId}>
                <span>{text}</span>
                {!readOnly && (
                  <button
                    type="button"
                    className="link-button"
                    aria-label={`Remove change: ${text}`}
                    onClick={() => void onRemove(pod, change.sessionId)}
                  >
                    Remove change
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="draft-note">No schedule changes yet.</p>
      )}
      {stillOpen > 0 && (
        <p className="draft-blocked">
          {stillOpen} open {stillOpen === 1 ? "conflict" : "conflicts"} to resolve before you can commit.
        </p>
      )}
      {others.length > 0 && (
        <div className="draft-issues">
          <h3>Outstanding in draft · {others.length}</h3>
          <ol>
            {others.map((issue: any) => (
              <li key={issue.sessionId}>
                <strong>
                  {issue.session?.date} {issue.session?.time}
                </strong>{" "}
                · {nameOf(state.clients, issue.session?.client)} · Client
                <ul>
                  {issue.reasons.map((reason: string) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
      {!readOnly && (
        <div className="detail-actions">
          <button
            type="button"
            className="primary"
            disabled={hasProposal || !count || issues.length > 0}
            onClick={() => void onCommit(pod)}
          >
            Commit {plural(count)}
          </button>
          <button type="button" onClick={() => void onDiscard(pod)}>
            Discard
          </button>
        </div>
      )}
    </section>
  );
}

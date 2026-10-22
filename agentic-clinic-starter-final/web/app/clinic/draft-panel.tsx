"use client";

import { useEffect, useState } from "react";
// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { workableAssignments, draftCandidate, localInstant } from "../../lib/scheduling.mjs";
import { AutoResolveProposal } from "./auto-resolve-proposal";
import { nameOf } from "./names";
import { RescheduleDraftForm } from "./reschedule-draft-form";
import type { ClinicState, PodHandler, Selection, Session, StageHandler } from "./types";
import { WorkableOptionsDialog } from "./workable-options-dialog";

// The shared schedule draft for the selected pod: Auto resolve, staging forms,
// the list of staged changes, and commit / discard.
export function DraftPanel({
  state,
  pod,
  readOnly = false,
  onStage,
  onRemove,
  onPreviewAuto,
  onApplyAuto,
  onDiscardAuto,
  onCommit,
  onDiscard,
  selection,
}: {
  state: ClinicState;
  pod: string;
  readOnly?: boolean;
  onStage: StageHandler;
  onRemove: (pod: string, sessionId: string) => Promise<boolean>;
  onPreviewAuto: PodHandler;
  onApplyAuto: PodHandler;
  onDiscardAuto: PodHandler;
  onCommit: PodHandler;
  onDiscard: PodHandler;
  selection: Selection | null;
}) {
  const [selected, setSelected] = useState("");
  const [therapist, setTherapist] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => {
    if (selection) {
      setSelected(selection.sessionId);
      setTherapist("");
      if (selection.openOptions) setOptionsOpen(true);
    }
  }, [selection]);
  const draft = state.drafts?.find((item) => item.pod === pod);
  const proposal = draft?.proposal;
  const issues = state.draftIssues?.[pod] || [];
  const sessions: Session[] = draftCandidate(state, pod).candidate.sessions.filter(
    (item: Session) =>
      state.clients.find((client) => client.id === item.client)?.pod === pod,
  );
  const startsLater = (item: Session) =>
    localInstant(item.date, item.time, state.config.timezone) >= Date.now();
  const current =
    sessions.find((item) => item.id === selected) ||
    sessions.find(startsLater) ||
    sessions[0];
  const editable = !!current && startsLater(current);
  const client = state.clients.find((item) => item.id === current?.client);
  const ranked = state.therapists.filter(
    (item) => item.active && client?.assigned.includes(item.id),
  );
  const target = ranked.some((item) => item.id === therapist) ? therapist : ranked[0]?.id;
  const safeOptions = current
    ? (state.workableOptions?.[current.id] ?? workableAssignments(state, pod, current.id))
    : [];
  const session = (id: string) => sessions.find((item) => item.id === id);
  return (
    <section className="conflict-panel">
      <h2>Shared schedule draft</h2>
      <p>Changes here stay separate from committed sessions until you commit.</p>
      <div className="calendar-actions">
        {!readOnly && <button onClick={() => void onPreviewAuto(pod)}>Auto resolve</button>}
        {!readOnly && draft?.autoResolveRun && !proposal && (
          <small>
            Auto resolve has run for this draft. It can run again once the draft or the pod’s schedule inputs change.
          </small>
        )}
      </div>
      {proposal && (
        <AutoResolveProposal
          state={state}
          pod={pod}
          proposal={proposal}
          sessions={sessions}
          readOnly={readOnly}
          onApply={onApplyAuto}
          onDiscard={onDiscardAuto}
        />
      )}
      {!readOnly && !proposal && sessions.length > 0 && (
        <>
          <label>
            Session
            <select
              value={current?.id || ""}
              onChange={(e) => {
                setSelected(e.target.value);
                setTherapist("");
              }}
            >
              {sessions.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.date} {item.time} · {nameOf(state.clients, item.client)} · Client
                </option>
              ))}
            </select>
          </label>
          {editable && (
            <label>
              Assign therapist
              <select value={target || ""} onChange={(e) => setTherapist(e.target.value)}>
                {ranked.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · Therapist
                  </option>
                ))}
              </select>
            </label>
          )}
          {!editable && <p>This session has already started and cannot be changed.</p>}
          {editable && (
            <>
              <div className="calendar-actions">
                <button onClick={() => setOptionsOpen(true)}>Review workable options</button>
                <button
                  disabled={!target}
                  onClick={() =>
                    void onStage(pod, { kind: "assign", sessionId: current.id, therapist: target })
                  }
                >
                  Stage assignment
                </button>
                <button
                  onClick={() => void onStage(pod, { kind: "cancel", sessionId: current.id })}
                >
                  Stage cancellation
                </button>
              </div>
              <RescheduleDraftForm
                key={`${pod}:${current?.id}`}
                state={state}
                pod={pod}
                session={current}
                onStage={onStage}
              />
            </>
          )}
        </>
      )}
      {draft && (
        <>
          <h3>Proposed changes · {draft.changes.length}</h3>
          {draft.changes.length ? (
            <ol>
              {draft.changes.map((change: any) => (
                <li key={change.sessionId}>
                  {nameOf(
                    state.clients,
                    (
                      session(change.sessionId) ||
                      state.sessions?.find((item) => item.id === change.sessionId) ||
                      change.session
                    )?.client,
                  )}{" "}
                  · Client:{" "}
                  {change.kind === "add"
                    ? `Add ${change.session.date} ${change.session.time} for ${change.session.minutes} minutes · ${nameOf(state.therapists, change.session.therapist)} · Therapist`
                    : change.kind === "cancel"
                      ? "Cancel session"
                      : change.kind === "reschedule"
                        ? `Move to ${change.date} ${change.time} for ${change.minutes} minutes · ${nameOf(state.therapists, change.therapist)} · Therapist`
                        : `Assign ${nameOf(state.therapists, change.therapist)} · Therapist`}{" "}
                  {!readOnly && (
                    <button onClick={() => void onRemove(pod, change.sessionId)}>
                      Remove change
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>No schedule changes yet.</p>
          )}
          <h3>Outstanding in draft · {issues.length}</h3>
          {issues.length ? (
            <ol>
              {issues.map((issue: any) => (
                <li key={issue.sessionId}>
                  <strong>{issue.session?.date} {issue.session?.time}</strong> · {nameOf(state.clients, issue.session?.client)} · Client
                  <ul>
                    {issue.reasons.map((reason: string) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p>No conflicts in this draft.</p>
          )}
          {!readOnly && (
            <div className="calendar-actions">
              <button onClick={() => void onDiscard(pod)}>Discard draft</button>
              <button
                className="primary"
                disabled={!!proposal || !draft.changes.length || issues.length > 0}
                onClick={() => void onCommit(pod)}
              >
                Commit schedule
              </button>
            </div>
          )}
        </>
      )}
      {optionsOpen && !readOnly && current && (
        <WorkableOptionsDialog
          state={state}
          pod={pod}
          current={current}
          options={safeOptions}
          onStage={onStage}
          onClose={() => setOptionsOpen(false)}
        />
      )}
    </section>
  );
}

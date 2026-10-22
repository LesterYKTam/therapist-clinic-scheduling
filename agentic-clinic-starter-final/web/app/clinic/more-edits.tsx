"use client";

import { useEffect, useState } from "react";
// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { workableAssignments, draftCandidate, localInstant } from "../../lib/scheduling.mjs";
import { nameOf } from "./names";
import { RescheduleDraftForm } from "./reschedule-draft-form";
import type { ClinicState, Selection, Session, StageHandler } from "./types";
import { WorkableOptionsDialog } from "./workable-options-dialog";

// The manual editing forms that predate the guided panel: pick any session,
// assign a therapist, stage a cancellation, or move it / change its length.
// Folded away under "More edits"; phase 5 gives them a proper tab or drawer.
export function MoreEdits({
  state,
  pod,
  onStage,
  selection,
}: {
  state: ClinicState;
  pod: string;
  onStage: StageHandler;
  selection: Selection | null;
}) {
  const [selected, setSelected] = useState("");
  const [therapist, setTherapist] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (selection) {
      setSelected(selection.sessionId);
      setTherapist("");
      setOpen(true);
      if (selection.openOptions) setOptionsOpen(true);
    }
  }, [selection]);
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
  // While an Auto resolve proposal is pending, the proposal is the only job.
  if (state.drafts?.find((item) => item.pod === pod)?.proposal) return null;
  return (
    <details
      className="more-edits"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>More edits</summary>
      {sessions.length > 0 ? (
        <div className="more-edits-body">
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
                <button type="button" onClick={() => setOptionsOpen(true)}>
                  Review workable options
                </button>
                <button
                  type="button"
                  disabled={!target}
                  onClick={() =>
                    void onStage(pod, { kind: "assign", sessionId: current.id, therapist: target })
                  }
                >
                  Stage assignment
                </button>
                <button
                  type="button"
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
        </div>
      ) : (
        <p>No sessions to edit in this pod.</p>
      )}
      {optionsOpen && current && (
        <WorkableOptionsDialog
          state={state}
          pod={pod}
          current={current}
          options={safeOptions}
          onStage={onStage}
          onClose={() => setOptionsOpen(false)}
        />
      )}
    </details>
  );
}

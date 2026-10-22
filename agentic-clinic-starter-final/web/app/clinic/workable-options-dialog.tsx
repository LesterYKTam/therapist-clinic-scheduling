"use client";

import { nameOf } from "./names";
import type { ClinicState, Session, StageHandler } from "./types";
import { useDialog } from "./use-dialog";

// Lists the assigned therapists who would add no new conflict to the draft.
export function WorkableOptionsDialog({
  state,
  pod,
  current,
  options,
  onStage,
  onClose,
}: {
  state: ClinicState;
  pod: string;
  current: Session;
  options: any[];
  onStage: StageHandler;
  onClose: () => void;
}) {
  const { dialogProps, titleProps } = useDialog(onClose);
  return (
    <div className="modal">
      <div className="dialog" {...dialogProps}>
        <h2 {...titleProps}>Workable options</h2>
        <p>
          {current.date} {current.time} · {nameOf(state.clients, current.client)}. These assigned therapists introduce no new conflicts in the current draft.
        </p>
        {options.length ? (
          <ol>
            {options.map((option) => (
              <li key={option.therapist}>
                <strong>{nameOf(state.therapists, option.therapist)}</strong> · Rank {option.rank} {option.suggested && <strong>· Suggested</strong>}{" "}
                <button
                  onClick={() =>
                    void onStage(pod, {
                      kind: "assign",
                      sessionId: current.id,
                      therapist: option.therapist,
                    }).then((saved) => {
                      if (saved) onClose();
                    })
                  }
                >
                  Use option
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p>No conflict-free therapist assignment is available. You can close this and edit the draft manually.</p>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

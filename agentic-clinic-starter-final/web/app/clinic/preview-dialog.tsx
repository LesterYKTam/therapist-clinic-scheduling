"use client";

import { nameOf } from "./names";
import type { ClinicState, PreviewResult } from "./types";
import { useDialog } from "./use-dialog";

// Shows what a one-off edit or cancellation would change before it is committed.
export function PreviewDialog({
  state,
  preview,
  onBack,
  onCommit,
}: {
  state: ClinicState;
  preview: PreviewResult;
  onBack: () => void;
  onCommit: () => void;
}) {
  const { dialogProps, titleProps } = useDialog(onBack);
  return (
    <div className="modal">
      <div className="dialog" {...dialogProps}>
        <h2 {...titleProps}>Preview ready</h2>
        <p>
          {preview.occurrences.length} changed and {preview.removed.length} removed. The calendar is unchanged until you commit.
        </p>
        <ul>
          {preview.occurrences.map((item) => (
            <li key={item.id}>
              {item.date} · {item.time} · {item.minutes} min · {nameOf(state.clients, item.client)} · Client · {nameOf(state.therapists, item.therapist)} · Therapist · {item.location === "home" ? "Home" : state.rooms.find((r) => r.id === item.room)?.name}
            </li>
          ))}
          {preview.removed.map((item) => (
            <li key={item.id}>
              Remove {item.date} · {item.time} · {nameOf(state.clients, item.client)} · Client
            </li>
          ))}
        </ul>
        <button onClick={onBack}>Back to edit</button>
        <button className="primary" onClick={onCommit}>
          Commit schedule
        </button>
      </div>
    </div>
  );
}

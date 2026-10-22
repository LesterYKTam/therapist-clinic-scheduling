"use client";

import { useState } from "react";
import type { ClinicState, LeaveWindow } from "./types";

// Recorded leave for the selected pod, with edit and withdraw controls.
export function LeavePanel({
  state,
  pod,
  readOnly = false,
  onAmend,
  onWithdraw,
}: {
  state: ClinicState;
  pod: string;
  readOnly?: boolean;
  onAmend: (pod: string, leaveId: string, leave: LeaveWindow) => Promise<boolean>;
  onWithdraw: (pod: string, leaveId: string) => Promise<boolean>;
}) {
  const leaves = (state.leaves || []).filter((item) => item.pod === pod);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveWindow | null>(null);
  const blocked = state.drafts?.some((draft) => draft.pod === pod);
  const therapist = (id: string) =>
    state.therapists.find((item) => item.id === id)?.name || id;
  const start = (leave: LeaveWindow & { id: string }) => {
    setEditing(leave.id);
    setForm({
      startDate: leave.startDate,
      startTime: leave.startTime,
      endDate: leave.endDate,
      endTime: leave.endTime,
    });
  };
  const put = (key: keyof LeaveWindow, value: string) =>
    setForm((old) => ({ ...old!, [key]: value }));
  return (
    <section className="conflict-panel" aria-label="Recorded leave">
      <h2>Recorded leave · {leaves.length}</h2>
      {blocked && !readOnly && (
        <p>Commit or discard this pod’s shared draft before changing recorded leave.</p>
      )}
      {leaves.length ? (
        <ol>
          {leaves.map((leave) => (
            <li key={leave.id}>
              <strong>{therapist(leave.therapist)}</strong>
              <span>
                {leave.startDate} {leave.startTime} – {leave.endDate} {leave.endTime}
              </span>
              {readOnly ? null : editing === leave.id && form ? (
                <div>
                  <div className="two">
                    <label>
                      Starts on
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => put("startDate", e.target.value)}
                      />
                    </label>
                    <label>
                      At
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => put("startTime", e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="two">
                    <label>
                      Ends on
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={(e) => put("endDate", e.target.value)}
                      />
                    </label>
                    <label>
                      At
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => put("endTime", e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      setEditing(null);
                      setForm(null);
                    }}
                  >
                    Cancel edit
                  </button>
                  <button
                    disabled={!!blocked}
                    onClick={() =>
                      void onAmend(pod, leave.id, form).then((saved) => {
                        if (saved) {
                          setEditing(null);
                          setForm(null);
                        }
                      })
                    }
                  >
                    Save leave
                  </button>
                </div>
              ) : (
                <div>
                  <button disabled={!!blocked} onClick={() => start(leave)}>
                    Edit leave
                  </button>
                  <button disabled={!!blocked} onClick={() => void onWithdraw(pod, leave.id)}>
                    Withdraw leave
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p>No leave recorded for this pod.</p>
      )}
    </section>
  );
}

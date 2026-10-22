"use client";

import { useState } from "react";
import { today } from "./dates";
import type { ClinicState, LeaveInterval } from "./types";

type LeaveDraft = LeaveInterval;

// Dialog for recording a therapist's leave.
export function LeaveForm({
  state,
  pod,
  onClose,
  onRecord,
}: {
  state: ClinicState;
  pod: string;
  onClose: () => void;
  onRecord: (leave: LeaveDraft) => Promise<boolean>;
}) {
  const staff = state.therapists.filter((item) => item.pod === pod && item.active);
  const [leave, setLeave] = useState<LeaveDraft>({
    therapist: staff[0]?.id || "",
    startDate: today(state.config.timezone),
    startTime: state.config.open,
    endDate: today(state.config.timezone),
    endTime: state.config.close,
  });
  const set = (key: keyof LeaveDraft, value: string) =>
    setLeave((old) => ({ ...old, [key]: value }));
  return (
    <div className="modal">
      <div className="dialog">
        <h2>Record therapist leave</h2>
        <p>
          This saves the leave now. Any affected sessions stay on the committed calendar as schedule conflicts until resolved.
        </p>
        <label>
          Therapist
          <select value={leave.therapist} onChange={(e) => set("therapist", e.target.value)}>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · Therapist
              </option>
            ))}
          </select>
        </label>
        <div className="two">
          <label>
            Starts on
            <input
              type="date"
              value={leave.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </label>
          <label>
            At
            <input
              type="time"
              value={leave.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
          </label>
        </div>
        <div className="two">
          <label>
            Ends on
            <input
              type="date"
              value={leave.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </label>
          <label>
            At
            <input
              type="time"
              value={leave.endTime}
              onChange={(e) => set("endTime", e.target.value)}
            />
          </label>
        </div>
        <p>
          For a whole working day, use the clinic opening and closing times. Partial-day and multi-day intervals are supported.
        </p>
        <div className="calendar-actions">
          <button onClick={onClose}>Back</button>
          <button
            className="primary"
            disabled={!leave.therapist}
            onClick={() => void onRecord(leave)}
          >
            Record leave
          </button>
        </div>
      </div>
    </div>
  );
}

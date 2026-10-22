"use client";

import type { ClinicState } from "./types";

export function CalendarHeader({
  editingPod,
  readOnly,
  onRecordLeave,
  onRecheck,
  onAdd,
}: {
  editingPod: string | null;
  readOnly: boolean;
  onRecordLeave: () => void;
  onRecheck: () => void;
  onAdd: () => void;
}) {
  return (
    <header className="calendar-head">
      <div>
        <p className="eyebrow">{editingPod ? "Shared schedule draft" : "Committed normal scheduling"}</p>
        <h1>Calendar</h1>
        <p>Preview every change before it is committed.</p>
      </div>
      <div className="calendar-actions">
        {!readOnly && <button onClick={onRecordLeave}>Record leave</button>}
        <button onClick={onRecheck}>Recheck conflicts</button>
        {!readOnly && (
          <button className="primary" onClick={onAdd}>
            Add session
          </button>
        )}
      </div>
    </header>
  );
}

export function CalendarTools({
  state,
  pod,
  editingPod,
  setPod,
  onPrevious,
  onToday,
  onNext,
}: {
  state: ClinicState;
  pod: string;
  editingPod: string | null;
  setPod: (id: string) => void;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <section className="calendar-tools">
      <label>
        {state.assignedPod ? "View pod" : "Pod"}
        <select value={pod} disabled={!!editingPod} onChange={(e) => setPod(e.target.value)}>
          {(state.allPods || state.pods).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button onClick={onPrevious}>Previous week</button>
        <button onClick={onToday}>Today</button>
        <button onClick={onNext}>Next week</button>
      </div>
    </section>
  );
}

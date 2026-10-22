"use client";

import type { ReactNode } from "react";

export function CalendarHeader({
  conflictStatus,
  readOnly,
  onRecordLeave,
  onRecheck,
  onAdd,
}: {
  conflictStatus: ReactNode;
  readOnly: boolean;
  onRecordLeave: () => void;
  onRecheck: () => void;
  onAdd: () => void;
}) {
  return (
    <header className="calendar-head">
      <div>
        <h1>Calendar</h1>
        <p className="calendar-sub">Preview every change before it is committed.</p>
      </div>
      <div className="calendar-actions">
        {conflictStatus}
        {!readOnly && (
          <button className="primary" onClick={onAdd}>
            Add session
          </button>
        )}
        {!readOnly && <button onClick={onRecordLeave}>Record leave</button>}
        <button onClick={onRecheck}>Recheck conflicts</button>
      </div>
    </header>
  );
}

export function CalendarTools({
  onPrevious,
  onToday,
  onNext,
}: {
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <section className="calendar-tools">
      <div>
        <button onClick={onPrevious}>Previous week</button>
        <button onClick={onToday}>Today</button>
        <button onClick={onNext}>Next week</button>
      </div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import type { CalendarView } from "./time-grid";

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
          <button className="primary" data-dialog-return onClick={onAdd}>
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
  view,
  title,
  onView,
  onPrevious,
  onToday,
  onNext,
  panelHidden,
  onTogglePanel,
}: {
  view: CalendarView;
  title: string;
  onView: (view: CalendarView) => void;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  panelHidden: boolean;
  onTogglePanel: () => void;
}) {
  const unit = view === "day" ? "day" : "week";
  return (
    <section className="calendar-tools" aria-label="Calendar view and dates">
      <div className="view-switch" role="group" aria-label="Calendar view">
        <button type="button" aria-pressed={view === "day"} onClick={() => onView("day")}>
          Day by therapist
        </button>
        <button type="button" aria-pressed={view === "week"} onClick={() => onView("week")}>
          Week
        </button>
      </div>
      <div className="date-nav">
        <button onClick={onPrevious}>Previous {unit}</button>
        <button onClick={onToday}>Today</button>
        <button onClick={onNext}>Next {unit}</button>
      </div>
      <strong className="date-title" aria-live="polite">{title}</strong>
      <button
        type="button"
        className="panel-toggle"
        aria-expanded={!panelHidden}
        aria-controls="side-column"
        onClick={onTogglePanel}
      >
        {panelHidden ? "Show panel" : "Hide panel"}
      </button>
    </section>
  );
}

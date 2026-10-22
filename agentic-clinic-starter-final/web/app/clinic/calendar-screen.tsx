"use client";

import { useEffect, useState, type ReactNode } from "react";
// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { draftCandidate } from "../../lib/scheduling.mjs";
import { CalendarHeader, CalendarTools } from "./calendar-toolbar";
import { ConflictPanel } from "./conflict-panel";
import { defaultEndDate, nextBookingDate, startOfWeek, today } from "./dates";
import { DraftPanel } from "./draft-panel";
import { LeaveForm } from "./leave-form";
import { LeavePanel } from "./leave-panel";
import { NotificationPanel } from "./notification-panel";
import { PreviewDialog } from "./preview-dialog";
import { SessionDialog } from "./session-dialog";
import type { ClinicActions } from "./use-clinic-actions";
import type { Clinic } from "./use-clinic";
import type { Selection } from "./types";
import { formatDay, TimeGrid, type CalendarView } from "./time-grid";

const VIEW_KEY = "clinic.calendar.view";

type CalendarScreenProps = Pick<
  Clinic,
  | "state"
  | "draft"
  | "setDraft"
  | "preview"
  | "setPreview"
  | "editing"
  | "setEditing"
  | "editingPod"
  | "readOnly"
  | "clients"
  | "staff"
> &
  Pick<
    ClinicActions,
    | "previewDraft"
    | "commit"
    | "beginEdit"
    | "canUse"
    | "change"
    | "recheckConflicts"
    | "recordLeave"
    | "amendLeave"
    | "withdrawLeave"
    | "stageDraft"
    | "removeDraftChange"
    | "previewAutoResolve"
    | "applyAutoResolve"
    | "discardAutoResolve"
    | "commitSharedDraft"
    | "discardSharedDraft"
    | "handleNotification"
  > & {
    pod: string;
    conflictStatus: ReactNode;
  };

// The week grid plus the side panels (conflicts, shared draft, notifications,
// recorded leave) and the dialogs opened from them.
export function CalendarScreen({
  state,
  pod,
  conflictStatus,
  draft,
  setDraft,
  previewDraft,
  preview,
  setPreview,
  commit,
  editing,
  setEditing,
  beginEdit,
  clients,
  staff,
  canUse,
  change,
  recordLeave,
  amendLeave,
  withdrawLeave,
  recheckConflicts,
  stageDraft,
  removeDraftChange,
  previewAutoResolve,
  applyAutoResolve,
  discardAutoResolve,
  commitSharedDraft,
  discardSharedDraft,
  handleNotification,
  editingPod,
  readOnly,
}: CalendarScreenProps) {
  const weekStart = state.config.weekStart;
  const [anchor, setAnchor] = useState(() => today(state.config.timezone));
  const [view, setView] = useState<CalendarView>("week");
  // Restore the last view after mount, so the server and first client render agree.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === "day" || saved === "week") setView(saved);
    } catch {
      // Storage can be blocked; the default view is fine.
    }
  }, []);
  const chooseView = (next: CalendarView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not remembering the view is harmless.
    }
  };
  const week = startOfWeek(anchor, weekStart);
  const shift = (date: string, days: number) => {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const [entryOpen, setEntryOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const todayDate = today(state.config.timezone);
  // One day at a time, skipping closed days that have no sessions.
  const stepDay = (direction: number) => {
    let next = shift(anchor, direction);
    for (let tries = 0; tries < 7; tries++) {
      const weekday = new Date(`${next}T00:00:00Z`).getUTCDay() || 7;
      if (
        state.config.workingDays.includes(weekday) ||
        events.some((item: { date: string }) => item.date === next)
      ) {
        break;
      }
      next = shift(next, direction);
    }
    return next;
  };
  const days =
    view === "day" ? [anchor] : Array.from({ length: 7 }, (_, index) => shift(week, index));
  const title =
    view === "day"
      ? `${anchor === todayDate ? "Today · " : ""}${formatDay(anchor)}`
      : `${formatDay(days[0])} – ${formatDay(days[6])}`;
  const defaultEnd = (date: string) => defaultEndDate(date, state.config.recurrenceWeeks);
  const beginAdd = () => {
    const start = nextBookingDate(state.config);
    const end = defaultEnd(start);
    const client = clients.find((c) => c.pod === pod);
    const therapist =
      client?.assigned
        .map((id) => staff.find((person) => person.id === id))
        .find(Boolean)?.id || "";
    setEditing(null);
    setDraft({
      kind: "one-off",
      client: client?.id || "",
      therapist,
      date: start,
      time: state.config.open,
      minutes: 60,
      location: "clinic",
      room: state.rooms.find((r) => r.active)?.id || "",
      endDate: end,
      defaultEndDate: end,
    });
    setEntryOpen(true);
  };
  const candidate = state.drafts?.some((item) => item.pod === pod)
    ? draftCandidate(state, pod).candidate
    : state;
  const events = candidate.sessions.filter(
    (item: { client: string }) =>
      state.clients.find((c) => c.id === item.client)?.pod === pod,
  );
  const submit = async () => {
    if (await previewDraft()) setEntryOpen(false);
  };
  const choose = (sessionId: string, openOptions: boolean) =>
    setSelection({ sessionId, openOptions, key: Date.now() });
  return (
    <>
      <CalendarHeader
        conflictStatus={conflictStatus}
        readOnly={readOnly}
        onRecordLeave={() => setLeaveOpen(true)}
        onRecheck={recheckConflicts}
        onAdd={beginAdd}
      />
      <CalendarTools
        view={view}
        title={title}
        onView={chooseView}
        onPrevious={() => setAnchor(view === "day" ? stepDay(-1) : shift(anchor, -7))}
        onToday={() => setAnchor(todayDate)}
        onNext={() => setAnchor(view === "day" ? stepDay(1) : shift(anchor, 7))}
      />
      <div className="calendar-body">
        <TimeGrid
          view={view}
          state={state}
          pod={pod}
          candidate={events}
          days={days}
          today={todayDate}
          onOpenDay={(date) => {
            setAnchor(date);
            chooseView("day");
          }}
          readOnly={readOnly}
          editingPod={editingPod}
          onSelect={(sessionId) => choose(sessionId, false)}
          onEdit={(item) => {
            beginEdit(item);
            setEntryOpen(true);
          }}
        />
        <div>
          <ConflictPanel
            state={state}
            pod={pod}
            readOnly={readOnly}
            onRecheck={recheckConflicts}
            onChoose={choose}
          />
          <DraftPanel
            state={state}
            pod={pod}
            readOnly={readOnly}
            onStage={stageDraft}
            onRemove={removeDraftChange}
            onPreviewAuto={previewAutoResolve}
            onApplyAuto={applyAutoResolve}
            onDiscardAuto={discardAutoResolve}
            onCommit={commitSharedDraft}
            onDiscard={discardSharedDraft}
            selection={selection}
          />
          <NotificationPanel
            state={state}
            pod={pod}
            readOnly={readOnly}
            onHandle={handleNotification}
          />
          <LeavePanel
            state={state}
            pod={pod}
            readOnly={readOnly}
            onAmend={amendLeave}
            onWithdraw={withdrawLeave}
          />
        </div>
      </div>
      {leaveOpen && !readOnly && (
        <LeaveForm
          state={state}
          pod={pod}
          onClose={() => setLeaveOpen(false)}
          onRecord={async (leave) => {
            const saved = await recordLeave(leave);
            if (saved) setLeaveOpen(false);
            return saved;
          }}
        />
      )}
      {entryOpen && !readOnly && (
        <SessionDialog
          state={state}
          pod={pod}
          draft={draft}
          setDraft={setDraft}
          change={change}
          clients={clients}
          staff={staff}
          canUse={canUse}
          editing={editing}
          defaultEnd={defaultEnd}
          beginEdit={beginEdit}
          onBack={() => setEntryOpen(false)}
          onSubmit={submit}
        />
      )}
      {preview && !readOnly && (
        <PreviewDialog
          state={state}
          preview={preview}
          onBack={() => {
            setPreview(null);
            setEntryOpen(true);
          }}
          onCommit={commit}
        />
      )}
    </>
  );
}

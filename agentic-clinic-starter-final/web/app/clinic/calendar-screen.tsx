"use client";

import { useState } from "react";
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
import { WeekGrid } from "./week-grid";

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
    setPod: (id: string) => void;
  };

// The week grid plus the side panels (conflicts, shared draft, notifications,
// recorded leave) and the dialogs opened from them.
export function CalendarScreen({
  state,
  pod,
  setPod,
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
  const [week, setWeek] = useState(() =>
    startOfWeek(today(state.config.timezone), weekStart),
  );
  const [entryOpen, setEntryOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const dateAt = (offset: number) => {
    const value = new Date(`${week}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
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
        editingPod={editingPod}
        readOnly={readOnly}
        onRecordLeave={() => setLeaveOpen(true)}
        onRecheck={recheckConflicts}
        onAdd={beginAdd}
      />
      <CalendarTools
        state={state}
        pod={pod}
        editingPod={editingPod}
        setPod={setPod}
        onPrevious={() => setWeek(startOfWeek(dateAt(-7), weekStart))}
        onToday={() => setWeek(startOfWeek(today(state.config.timezone), weekStart))}
        onNext={() => setWeek(startOfWeek(dateAt(7), weekStart))}
      />
      <div className="calendar-body">
        <WeekGrid
          state={state}
          pod={pod}
          events={events}
          dateAt={dateAt}
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

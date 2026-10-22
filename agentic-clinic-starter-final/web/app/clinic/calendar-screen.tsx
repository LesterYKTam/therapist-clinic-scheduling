"use client";

import { useEffect, useState, type ReactNode } from "react";
// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { draftCandidate } from "../../lib/scheduling.mjs";
import { CalendarHeader, CalendarTools } from "./calendar-toolbar";
import { defaultEndDate, nextBookingDate, startOfWeek, today } from "./dates";
import { LeaveForm } from "./leave-form";
import { PreviewDialog } from "./preview-dialog";
import { openConflicts, previewChange } from "./resolve-model";
import { optionCardsFor } from "./conflict-detail";
import { SessionDialog } from "./session-dialog";
import { SidePanel } from "./side-panel";
import { PANEL_HIDDEN_KEY, parseSideTab, tabForCard, TAB_KEY, type SideTab } from "./side-tabs";
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
  // Side panel: the active tab (kept for the browser tab) and whether it is hidden.
  const [tab, setTab] = useState<SideTab>("conflicts");
  const [panelHidden, setPanelHidden] = useState(false);
  useEffect(() => {
    try {
      const saved = parseSideTab(window.sessionStorage.getItem(TAB_KEY));
      if (saved) setTab(saved);
    } catch {
      // Storage can be blocked; Conflicts is the default.
    }
    try {
      if (window.localStorage.getItem(PANEL_HIDDEN_KEY) === "1") setPanelHidden(true);
    } catch {
      // The panel stays visible.
    }
  }, []);
  const chooseTab = (next: SideTab) => {
    setTab(next);
    try {
      window.sessionStorage.setItem(TAB_KEY, next);
    } catch {
      // Not remembering the tab is harmless.
    }
  };
  const togglePanel = () => {
    const next = !panelHidden;
    setPanelHidden(next);
    try {
      window.localStorage.setItem(PANEL_HIDDEN_KEY, next ? "1" : "0");
    } catch {
      // Not remembering the choice is harmless.
    }
  };
  // After a commit, focus the Notifications tab when tasks were created, else the success notice.
  const [committed, setCommitted] = useState(0);
  const pendingTasks = (state.notifications || []).filter(
    (item) => item.pod === pod && item.status === "pending",
  ).length;
  useEffect(() => {
    if (!committed) return;
    if (pendingTasks > 0) {
      chooseTab("notifications");
      setPanelHidden(false);
      window.setTimeout(() => document.getElementById("side-tab-notifications")?.focus(), 0);
    } else {
      window.setTimeout(() => document.getElementById("clinic-notice")?.focus(), 0);
    }
  }, [committed]);
  const afterCommit = async (run: () => Promise<boolean>) => {
    const ok = await run();
    if (ok) setCommitted((value) => value + 1);
    return ok;
  };
  const [entryOpen, setEntryOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  // The conflict open in the guided panel, and the option being previewed on the grid.
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [optionKey, setOptionKey] = useState<string | null>(null);
  const selectConflict = (sessionId: string | null) => {
    setResolveId(sessionId);
    // Picking a conflict means the Conflicts tab (and the panel) should be showing.
    if (sessionId) {
      chooseTab("conflicts");
      setPanelHidden(false);
    }
    // Show the conflict on the grid: its day in Day view, its week in Week view.
    const date = (state.conflicts || []).find((item: any) => item.sessionId === sessionId)?.session.date;
    if (date) setAnchor(date);
    setOptionKey(null);
  };
  // Another pod is a different list of conflicts; drop the selection.
  useEffect(() => selectConflict(null), [pod]);
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
  const draftNow = state.drafts?.find((item) => item.pod === pod);
  const open = openConflicts(
    state.conflicts || [],
    state.clients,
    pod,
    draftNow,
    (state.draftIssues?.[pod] || []).map((item: { sessionId: string }) => item.sessionId),
  );
  const resolving = readOnly || draftNow?.proposal ? undefined : open.find((item) => item.sessionId === resolveId);
  // Overlay only: the selected option drawn on the grid. Nothing is sent to the server.
  const previewed = resolving
    ? previewChange(optionCardsFor(state, pod, resolving.session), optionKey)
    : null;
  const submit = async () => {
    if (await previewDraft()) setEntryOpen(false);
  };
  const choose = (sessionId: string, openOptions: boolean) => {
    setSelection({ sessionId, openOptions, key: Date.now() });
    // Any other card is edited by hand: Draft tab, with More edits.
    chooseTab(tabForCard(false));
    setPanelHidden(false);
  };
  // A grid card: an open conflict opens the guided view, anything else the manual forms.
  const selectCard = (sessionId: string) => {
    if (open.some((item) => item.sessionId === sessionId)) selectConflict(sessionId);
    else choose(sessionId, false);
  };
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
        panelHidden={panelHidden}
        onTogglePanel={togglePanel}
      />
      <div className={`calendar-body${panelHidden ? " panel-hidden" : ""}`}>
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
          preview={previewed}
          selectedId={resolving?.sessionId || null}
          onSelect={selectCard}
          onEdit={(item) => {
            beginEdit(item);
            setEntryOpen(true);
          }}
        />
        <div className="side-column" hidden={panelHidden} id="side-column">
          <SidePanel
            state={state}
            pod={pod}
            readOnly={readOnly}
            sessions={events}
            tab={tab}
            onTab={chooseTab}
            resolveId={resolveId}
            optionKey={optionKey}
            onSelectConflict={selectConflict}
            onOption={setOptionKey}
            onStage={stageDraft}
            onRemove={removeDraftChange}
            onPreviewAuto={previewAutoResolve}
            onApplyAuto={applyAutoResolve}
            onDiscardAuto={discardAutoResolve}
            onCommit={(target: string) => afterCommit(() => commitSharedDraft(target))}
            onDiscard={discardSharedDraft}
            onAmendLeave={amendLeave}
            onWithdrawLeave={withdrawLeave}
            onHandleNotification={handleNotification}
            selection={selection}
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
          onCommit={() => afterCommit(() => commit())}
        />
      )}
    </>
  );
}

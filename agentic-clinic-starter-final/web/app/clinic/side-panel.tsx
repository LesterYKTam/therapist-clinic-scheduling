"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { DraftPanel } from "./draft-panel";
import { LeavePanel } from "./leave-panel";
import { MoreEdits } from "./more-edits";
import { NotificationPanel } from "./notification-panel";
import { openConflicts } from "./resolve-model";
import { ResolvePanel } from "./resolve-panel";
import {
  badgeLabel,
  SIDE_TAB_LABELS,
  SIDE_TABS,
  tabBadges,
  tabForKey,
  type SideTab,
} from "./side-tabs";
import type {
  ClinicState,
  LeaveWindow,
  PodHandler,
  Selection,
  Session,
  StageHandler,
} from "./types";

type SidePanelProps = {
  state: ClinicState;
  pod: string;
  readOnly: boolean;
  // The pod's sessions with its draft applied.
  sessions: Session[];
  tab: SideTab;
  onTab: (tab: SideTab) => void;
  resolveId: string | null;
  optionKey: string | null;
  onSelectConflict: (sessionId: string | null) => void;
  onOption: (key: string | null) => void;
  onStage: StageHandler;
  onRemove: (pod: string, sessionId: string) => Promise<boolean>;
  onPreviewAuto: PodHandler;
  onApplyAuto: PodHandler;
  onDiscardAuto: PodHandler;
  onCommit: PodHandler;
  onDiscard: PodHandler;
  onAmendLeave: (pod: string, leaveId: string, leave: LeaveWindow) => Promise<boolean>;
  onWithdrawLeave: (pod: string, leaveId: string) => Promise<boolean>;
  onHandleNotification: (pod: string, taskId: string) => Promise<boolean>;
  selection: Selection | null;
};

// The side panel: one job per tab. Conflicts (the guided resolve flow) is the
// default; Draft holds the shared draft and the manual forms; Leave and
// Notifications hold the recorded leave and the post-commit worklist.
export function SidePanel(props: SidePanelProps) {
  const { state, pod, readOnly, tab, onTab } = props;
  const draft = state.drafts?.find((item) => item.pod === pod);
  const proposal = draft?.proposal;
  const issues = state.draftIssues?.[pod] || [];
  const open = openConflicts(
    state.conflicts || [],
    state.clients,
    pod,
    draft,
    issues.map((item: any) => item.sessionId),
  );
  const pending = (state.notifications || []).filter(
    (item) => item.pod === pod && item.status === "pending",
  ).length;
  const badges = tabBadges(draft ? draft.changes.length : null, pending);
  const [announcement, setAnnouncement] = useState("");
  // A stale announcement should not follow the admin to another pod.
  useEffect(() => setAnnouncement(""), [pod]);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = tabForKey(tab, event.key);
    if (!next) return;
    event.preventDefault();
    onTab(next);
    tabs.current[next]?.focus();
  };
  const count = (id: SideTab) => (id === "draft" ? badges.draft : id === "notifications" ? badges.notifications : null);
  return (
    <aside className="side-panel" aria-label="Conflicts and changes">
      <div className="side-tabs" role="tablist" aria-label="Side panel" onKeyDown={onKeyDown}>
        {SIDE_TABS.map((id) => {
          const badge = count(id);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`side-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`side-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              ref={(element) => {
                tabs.current[id] = element;
              }}
              className={`side-tab${tab === id ? " is-active" : ""}`}
              onClick={() => onTab(id)}
            >
              {SIDE_TAB_LABELS[id]}
              {badge !== null && (
                <>
                  <span className={`tab-badge badge-${id}`} aria-hidden="true">
                    {badge}
                  </span>
                  <span className="sr-only"> {badgeLabel(id, badge)}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id="side-panel-conflicts"
        aria-labelledby="side-tab-conflicts"
        hidden={tab !== "conflicts"}
      >
        <ResolvePanel
          state={state}
          pod={pod}
          readOnly={readOnly}
          sessions={props.sessions}
          selectedId={props.resolveId}
          optionKey={props.optionKey}
          onSelect={props.onSelectConflict}
          onOption={props.onOption}
          onStage={props.onStage}
          onPreviewAuto={props.onPreviewAuto}
          onApplyAuto={props.onApplyAuto}
          onDiscardAuto={props.onDiscardAuto}
          onAnnounce={setAnnouncement}
          onResolved={() => {
            onTab("draft");
            tabs.current.draft?.focus();
          }}
        />
      </div>
      <div
        role="tabpanel"
        id="side-panel-draft"
        aria-labelledby="side-tab-draft"
        hidden={tab !== "draft"}
        className="resolve"
      >
        {draft ? (
          <DraftPanel
            state={state}
            pod={pod}
            draft={draft}
            sessions={props.sessions}
            hasProposal={!!proposal}
            openIds={new Set(open.map((item) => item.sessionId))}
            readOnly={readOnly}
            onRemove={props.onRemove}
            onCommit={props.onCommit}
            onDiscard={props.onDiscard}
          />
        ) : (
          <section className="resolve-card" aria-label="Draft changes">
            <h2>Draft</h2>
            <p>No shared draft for this pod. Staged changes appear here until you commit them.</p>
          </section>
        )}
        {!readOnly && (
          <MoreEdits state={state} pod={pod} onStage={props.onStage} selection={props.selection} />
        )}
      </div>
      <div
        role="tabpanel"
        id="side-panel-leave"
        aria-labelledby="side-tab-leave"
        hidden={tab !== "leave"}
      >
        <LeavePanel
          state={state}
          pod={pod}
          readOnly={readOnly}
          onAmend={props.onAmendLeave}
          onWithdraw={props.onWithdrawLeave}
        />
      </div>
      <div
        role="tabpanel"
        id="side-panel-notifications"
        aria-labelledby="side-tab-notifications"
        hidden={tab !== "notifications"}
      >
        <NotificationPanel
          state={state}
          pod={pod}
          readOnly={readOnly}
          onHandle={props.onHandleNotification}
        />
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </aside>
  );
}

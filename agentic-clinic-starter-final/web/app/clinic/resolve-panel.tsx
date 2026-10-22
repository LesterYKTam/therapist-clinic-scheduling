"use client";

import { useEffect, useState } from "react";
import { AutoResolveProposal } from "./auto-resolve-proposal";
import { ConflictDetail, optionCardsFor } from "./conflict-detail";
import { AUTO_RAN_NOTE, ConflictList } from "./conflict-panel";
import { DraftPanel } from "./draft-panel";
import { MoreEdits } from "./more-edits";
import { openConflicts } from "./resolve-model";
import type { ClinicState, PodHandler, Selection, Session, StageHandler } from "./types";

// The side panel: one job at a time. Conflicts by default; picking a conflict
// opens its guided detail with the engine's options. The shared draft and the
// older manual forms sit below. Nothing here commits without the Commit button.
export function ResolvePanel({
  state,
  pod,
  readOnly,
  sessions,
  selectedId,
  optionKey,
  onSelect,
  onOption,
  onStage,
  onRemove,
  onPreviewAuto,
  onApplyAuto,
  onDiscardAuto,
  onCommit,
  onDiscard,
  selection,
}: {
  state: ClinicState;
  pod: string;
  readOnly: boolean;
  // The pod's sessions with its draft applied.
  sessions: Session[];
  selectedId: string | null;
  optionKey: string | null;
  onSelect: (sessionId: string | null) => void;
  onOption: (key: string | null) => void;
  onStage: StageHandler;
  onRemove: (pod: string, sessionId: string) => Promise<boolean>;
  onPreviewAuto: PodHandler;
  onApplyAuto: PodHandler;
  onDiscardAuto: PodHandler;
  onCommit: PodHandler;
  onDiscard: PodHandler;
  selection: Selection | null;
}) {
  const [announcement, setAnnouncement] = useState("");
  const [listFocus, setListFocus] = useState(0);
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
  const index = open.findIndex((item) => item.sessionId === selectedId);
  const current = index >= 0 && !proposal && !readOnly ? open[index] : null;
  // A stale announcement should not follow the admin to another pod or out of the detail.
  useEffect(() => setAnnouncement(""), [pod]);
  const back = () => {
    setAnnouncement("");
    onSelect(null);
    setListFocus((value) => value + 1);
  };
  return (
    <aside className="resolve" aria-label="Conflicts and changes">
      {proposal ? (
        <AutoResolveProposal
          state={state}
          pod={pod}
          proposal={proposal}
          sessions={sessions}
          readOnly={readOnly}
          onApply={onApplyAuto}
          onDiscard={onDiscardAuto}
        />
      ) : current ? (
        <ConflictDetail
          key={current.sessionId}
          state={state}
          pod={pod}
          conflict={current}
          position={index + 1}
          total={open.length}
          sessions={sessions}
          cards={optionCardsFor(state, pod, current.session)}
          optionKey={optionKey}
          onOption={onOption}
          onBack={back}
          onStage={onStage}
          onStaged={() => {
            const rest = open.filter((item) => item.sessionId !== current.sessionId);
            setAnnouncement(
              `Added to draft. ${rest.length === 0 ? "No open conflicts left." : `${rest.length} open ${rest.length === 1 ? "conflict" : "conflicts"} left.`}`,
            );
            onSelect(rest[0]?.sessionId || null);
            if (!rest.length) setListFocus((value) => value + 1);
          }}
        />
      ) : (
        <>
          <ConflictList
            state={state}
            pod={pod}
            open={open}
            readOnly={readOnly}
            hasIssues={issues.length > 0}
            autoRan={!!draft?.autoResolveRun}
            focusKey={listFocus}
            onPick={(id) => {
              onOption(null);
              onSelect(id);
            }}
            onAutoResolve={onPreviewAuto}
          />
          {!readOnly && draft?.autoResolveRun && <p className="resolve-sub">{AUTO_RAN_NOTE}</p>}
        </>
      )}
      {draft && (
        <DraftPanel
          state={state}
          pod={pod}
          draft={draft}
          sessions={sessions}
          hasProposal={!!proposal}
          openIds={new Set(open.map((item) => item.sessionId))}
          readOnly={readOnly}
          onRemove={onRemove}
          onCommit={onCommit}
          onDiscard={onDiscard}
        />
      )}
      {!readOnly && <MoreEdits state={state} pod={pod} onStage={onStage} selection={selection} />}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </aside>
  );
}

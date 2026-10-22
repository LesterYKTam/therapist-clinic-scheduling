"use client";

import { useState } from "react";
import { AutoResolveProposal } from "./auto-resolve-proposal";
import { ConflictDetail, optionCardsFor } from "./conflict-detail";
import { AUTO_RAN_NOTE, ConflictList } from "./conflict-panel";
import { openConflicts } from "./resolve-model";
import type { ClinicState, PodHandler, Session, StageHandler } from "./types";

// The Conflicts tab: one job at a time. Picking a conflict opens its guided
// detail with the engine's options. The shared draft and the older manual
// forms live in the Draft tab. Nothing here commits without the Commit button.
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
  onPreviewAuto,
  onApplyAuto,
  onDiscardAuto,
  onAnnounce,
  onResolved,
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
  onPreviewAuto: PodHandler;
  onApplyAuto: PodHandler;
  onDiscardAuto: PodHandler;
  // Screen-reader message; the live region sits outside the tab panels.
  onAnnounce: (message: string) => void;
  // The last open conflict was staged.
  onResolved: () => void;
}) {
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
  const back = () => {
    onAnnounce("");
    onSelect(null);
    setListFocus((value) => value + 1);
  };
  return (
    <div className="resolve">
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
            onAnnounce(
              `Added to draft. ${rest.length === 0 ? "No open conflicts left. Opening the Draft tab." : `${rest.length} open ${rest.length === 1 ? "conflict" : "conflicts"} left.`}`,
            );
            onSelect(rest[0]?.sessionId || null);
            if (!rest.length) {
              setListFocus((value) => value + 1);
              onResolved();
            }
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
    </div>
  );
}

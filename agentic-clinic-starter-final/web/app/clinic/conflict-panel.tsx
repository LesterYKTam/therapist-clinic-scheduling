"use client";

import { useEffect, useRef } from "react";
import { formatDay, leaveSummaryLine, shortName } from "./resolve-model";
import { nameOf } from "./names";
import type { ClinicState, Leave } from "./types";

export const AUTO_RAN_NOTE =
  "Auto resolve has run for this draft. It can run again once the draft or the pod’s schedule inputs change.";

const leaveText = (leaves: Leave[]) =>
  leaves
    .map((leave) => `${leave.startDate} ${leave.startTime} – ${leave.endDate} ${leave.endTime}`)
    .join("; ");

// The Conflicts view: the default job of the side panel. Open conflicts as
// rows, a one-line leave summary, "Auto resolve all", and past alerts folded
// away below. Reading only: choosing a row hands off to the detail view.
export function ConflictList({
  state,
  pod,
  open,
  readOnly,
  hasIssues,
  autoRan,
  focusKey,
  onPick,
  onAutoResolve,
}: {
  state: ClinicState;
  pod: string;
  open: any[];
  readOnly: boolean;
  hasIssues: boolean;
  // Auto resolve already ran for this unchanged draft.
  autoRan: boolean;
  // Changes when the list should take focus again (coming back from a detail).
  focusKey: number;
  onPick: (sessionId: string) => void;
  onAutoResolve: (pod: string) => Promise<boolean>;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusKey > 0) heading.current?.focus();
  }, [focusKey]);
  const inPod = (item: any) =>
    state.clients.find((client) => client.id === item.session.client)?.pod === pod;
  const historical = (state.historicalAlerts || []).filter(inPod);
  const summary = leaveSummaryLine(open, state.therapists);
  const placeOf = (session: any) =>
    session.location === "home" ? "Home visit" : nameOf(state.rooms, session.room);
  return (
    <section className="resolve-card" aria-label="Conflicts">
      <div className="resolve-head">
        <div>
          <h2 ref={heading} tabIndex={-1}>
            Conflicts{open.length > 0 ? ` · ${open.length}` : ""}
          </h2>
          {summary && <p className="resolve-sub">{summary}</p>}
        </div>
        {!readOnly && (open.length > 0 || hasIssues) && (
          <button
            type="button"
            className="resolve-secondary"
            disabled={autoRan}
            title={autoRan ? AUTO_RAN_NOTE : undefined}
            aria-description={autoRan ? AUTO_RAN_NOTE : undefined}
            onClick={() => void onAutoResolve(pod)}
          >
            Auto resolve all
          </button>
        )}
      </div>
      {open.length ? (
        <ol className="conflict-rows">
          {open.map((item) => {
            const session = item.session;
            const body = (
              <>
                <span className="row-when">
                  <span className="row-time">{session.time}</span>
                  <span className="row-day">{formatDay(session.date)}</span>
                </span>
                <span className="row-main">
                  <strong>{nameOf(state.clients, session.client)}</strong>
                  <span className="row-meta">
                    {placeOf(session)} · with{" "}
                    {shortName(nameOf(state.therapists, session.therapist) || "")}
                  </span>
                </span>
                {!readOnly && <span className="row-action">Resolve ›</span>}
              </>
            );
            return (
              <li key={item.sessionId}>
                {readOnly ? (
                  <div className="conflict-row is-static">{body}</div>
                ) : (
                  <button
                    type="button"
                    className="conflict-row"
                    aria-label={`Resolve conflict: ${nameOf(state.clients, session.client)}, ${formatDay(session.date)} ${session.time}`}
                    onClick={() => onPick(item.sessionId)}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="resolve-ok">No open conflicts for this pod.</p>
      )}
      {historical.length > 0 && (
        <details className="past-alerts">
          <summary>Past alerts · {historical.length}</summary>
          <p className="resolve-sub">
            These sessions already started while recorded leave overlapped them. They are kept as a record and do not block scheduling.
          </p>
          <ol>
            {historical.map((item) => (
              <li key={item.sessionId}>
                <strong>
                  {item.session.date} · {item.session.time}
                </strong>
                <span>
                  {nameOf(state.clients, item.session.client)} with{" "}
                  {shortName(nameOf(state.therapists, item.session.therapist) || "")}
                </span>
                <span>Recorded leave: {leaveText(item.leaves)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

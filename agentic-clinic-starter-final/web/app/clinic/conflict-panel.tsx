"use client";

// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { localInstant } from "../../lib/scheduling.mjs";
import { nameOf } from "./names";
import type { ClinicState, Leave } from "./types";

const leaveSummary = (leaves: Leave[]) =>
  leaves
    .map((leave) => `${leave.startDate} ${leave.startTime} – ${leave.endDate} ${leave.endTime}`)
    .join("; ");

// Schedule conflicts for the selected pod, plus sessions that already started
// while recorded leave overlapped them.
export function ConflictPanel({
  state,
  pod,
  readOnly = false,
  onRecheck,
  onChoose,
}: {
  state: ClinicState;
  pod: string;
  readOnly?: boolean;
  onRecheck: () => void;
  onChoose: (sessionId: string, openOptions: boolean) => void;
}) {
  const inPod = (item: any) =>
    state.clients.find((client) => client.id === item.session.client)?.pod === pod;
  const conflicts = (state.conflicts || []).filter(inPod);
  const historical = (state.historicalAlerts || []).filter(inPod);
  return (
    <aside className="conflict-panel">
      <div className="conflict-panel-head">
        <h2>Schedule conflicts · {conflicts.length}</h2>
        <button onClick={onRecheck}>Recheck conflicts</button>
      </div>
      {conflicts.length ? (
        <ol>
          {conflicts.map((item) => {
            const upcoming =
              localInstant(item.session.date, item.session.time, state.config.timezone) >=
              Date.now();
            return (
              <li key={item.sessionId}>
                <strong>
                  {item.session.date} · {item.session.time}
                </strong>
                <span>{nameOf(state.clients, item.session.client)} · Client</span>
                <span>{nameOf(state.therapists, item.session.therapist)} · Therapist</span>
                <small>
                  {item.session.minutes} minutes ·{" "}
                  {item.session.location === "home" ? "Home" : nameOf(state.rooms, item.session.room)}
                </small>
                {!readOnly && (
                  <button onClick={() => onChoose(item.sessionId, upcoming)}>
                    {upcoming ? "Review options" : "View conflict"}
                  </button>
                )}
                <p>Recorded leave: {leaveSummary(item.leaves)}</p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p>No conflicts for this pod.</p>
      )}
      {historical.length > 0 && (
        <section className="historical-alerts" aria-label="Historical alerts">
          <h3>Historical alerts · {historical.length}</h3>
          <p>
            These sessions already started while recorded leave overlapped them. They are kept as a record and do not block scheduling.
          </p>
          <ol>
            {historical.map((item) => (
              <li key={item.sessionId}>
                <strong>
                  {item.session.date} · {item.session.time}
                </strong>
                <span>{nameOf(state.clients, item.session.client)} · Client</span>
                <span>{nameOf(state.therapists, item.session.therapist)} · Therapist</span>
                <p>Recorded leave: {leaveSummary(item.leaves)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}

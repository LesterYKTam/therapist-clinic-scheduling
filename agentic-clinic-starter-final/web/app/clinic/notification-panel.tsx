"use client";

import { nameOf } from "./names";
import { shortName } from "./resolve-model";
import type { ClinicState } from "./types";

type TaskItem = {
  sessionId: string;
  changeType: string;
  before?: any;
  after?: any;
};

const changeKind = (type: string) =>
  type === "added" ? "New" : type === "cancelled" ? "Cancelled" : "Changed";

// Old per-session tasks read as one item.
const taskItems = (task: any): TaskItem[] =>
  Array.isArray(task.items)
    ? task.items
    : [
        {
          sessionId: task.sessionId,
          changeType: task.changeType,
          before: task.before,
          after: task.after,
        },
      ];

// Pending "tell the client or therapist" tasks created by a schedule commit.
export function NotificationPanel({
  state,
  pod,
  readOnly = false,
  onHandle,
}: {
  state: ClinicState;
  pod: string;
  readOnly?: boolean;
  onHandle: (pod: string, taskId: string) => Promise<boolean>;
}) {
  const tasks = (state.notifications || []).filter(
    (item) => item.pod === pod && item.status === "pending",
  );
  const details = (session: any) =>
    session
      ? `${session.date} at ${session.time} · ${session.minutes} minutes · ${nameOf(state.clients, session.client)} with ${shortName(nameOf(state.therapists, session.therapist) || "")} · ${session.location === "home" ? "Home" : session.roomName || nameOf(state.rooms, session.room)}`
      : "None";
  return (
    <section className="conflict-panel notify-list" aria-label="Notification worklist">
      <h2>Notification worklist · {tasks.length}</h2>
      <p>These tasks are created only after a schedule commit. No messages are sent automatically.</p>
      {tasks.length ? (
        <ol>
          {tasks.map((task) => (
            <li key={task.id}>
              <strong>
                {task.recipientRole === "client"
                  ? nameOf(state.clients, task.recipientId)
                  : nameOf(state.therapists, task.recipientId)}{" "}
                · {taskItems(task).length} session {taskItems(task).length === 1 ? "change" : "changes"}
              </strong>
              {taskItems(task).map((item) => (
                <div key={item.sessionId}>
                  <span>{changeKind(item.changeType)} session</span>
                  {item.before && <span>Before: {details(item.before)}</span>}
                  {item.after && <span>After: {details(item.after)}</span>}
                  {!item.before && !item.after && <small>Session {item.sessionId}</small>}
                </div>
              ))}
              {!readOnly && <button onClick={() => void onHandle(pod, task.id)}>Mark handled</button>}
            </li>
          ))}
        </ol>
      ) : (
        <p>No pending notification tasks for this pod.</p>
      )}
    </section>
  );
}

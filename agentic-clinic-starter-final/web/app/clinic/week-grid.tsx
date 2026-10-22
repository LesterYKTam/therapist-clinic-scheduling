"use client";

// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { localInstant } from "../../lib/scheduling.mjs";
import { nameOf } from "./names";
import type { ClinicState, Session } from "./types";

const dayHeading = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

// Seven day columns of session cards for the selected week.
export function WeekGrid({
  state,
  pod,
  events,
  dateAt,
  readOnly,
  editingPod,
  onSelect,
  onEdit,
}: {
  state: ClinicState;
  pod: string;
  events: Session[];
  dateAt: (offset: number) => string;
  readOnly: boolean;
  editingPod: string | null;
  onSelect: (sessionId: string) => void;
  onEdit: (session: Session) => void;
}) {
  const open = (item: Session) => {
    if (readOnly) return;
    if (
      editingPod ||
      state.drafts?.some((draft) => draft.pod === pod) ||
      localInstant(item.date, item.time, state.config.timezone) < Date.now() ||
      !state.sessions.some((saved) => saved.id === item.id)
    ) {
      onSelect(item.id);
    } else {
      onEdit(item);
    }
  };
  return (
    <section className="week-grid">
      {Array.from({ length: 7 }, (_, index) => {
        const date = dateAt(index);
        const day = events.filter((item) => item.date === date);
        return (
          <div className="day-column" key={date}>
            <strong>{dayHeading.format(new Date(`${date}T00:00:00Z`))}</strong>
            {day.length ? (
              day
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((item) => (
                  <button
                    className={
                      state.sessions.some((saved) => saved.id === item.id)
                        ? "event"
                        : "event draft-event"
                    }
                    key={item.id}
                    onClick={() => open(item)}
                  >
                    <b>{item.time}</b>
                    <span>{nameOf(state.clients, item.client)} · Client</span>
                    <span>{nameOf(state.therapists, item.therapist)} · Therapist</span>
                    <small>
                      {item.location === "home"
                        ? "Home"
                        : state.rooms.find((r) => r.id === item.room)?.name}
                    </small>
                  </button>
                ))
            ) : (
              <span className="empty-day">No sessions</span>
            )}
          </div>
        );
      })}
    </section>
  );
}

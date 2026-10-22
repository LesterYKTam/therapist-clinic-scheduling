"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { localInstant } from "../../lib/scheduling.mjs";
import { buildCards, type CardModel, type CardPreview } from "./card-state";
import { hiddenSummary, laneBudget, layoutColumn } from "./grid-collapse";
import { assignLanes, formatMinutes, hourRange, leaveBlocks, toMinutes } from "./grid-layout";
import { nameOf as lookup } from "./names";
import { formatDay } from "./resolve-model";
import type { ClinicState, Session } from "./types";

export { formatDay };

export type CalendarView = "day" | "week";

const HOUR_PX = 64;
const HOURS_COL_PX = 56;

// "Morgan Testerson" -> "Morgan T."
const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
};

const nameOf = (items: { id: string; name: string }[], id?: string | null) => lookup(items, id) || "";

type Column = {
  key: string;
  title: string;
  sub?: string;
  isLeave?: boolean;
  today: boolean;
  cards: CardModel[];
  leave: { start: number; end: number }[];
};

// Hours down the left, one column per day (Week) or per therapist (Day).
export function TimeGrid({
  view,
  state,
  pod,
  candidate,
  days,
  today,
  readOnly,
  editingPod,
  preview = null,
  selectedId = null,
  onSelect,
  onEdit,
  onOpenDay,
}: {
  view: CalendarView;
  state: ClinicState;
  pod: string;
  candidate: Session[];
  days: string[];
  today: string;
  readOnly: boolean;
  editingPod: string | null;
  preview?: CardPreview | null;
  selectedId?: string | null;
  onSelect: (sessionId: string) => void;
  onEdit: (session: Session) => void;
  onOpenDay: (date: string) => void;
}) {
  const tz = state.config.timezone;
  // The grid's own width decides how many lanes fit before sessions fold into "+N more".
  const gridRef = useRef<HTMLElement>(null);
  const [gridPx, setGridPx] = useState<number | null>(null);
  useEffect(() => {
    const element = gridRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setGridPx(element.clientWidth));
    observer.observe(element);
    setGridPx(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  const draft = state.drafts?.find((item) => item.pod === pod);
  const inPod = (item: any) =>
    state.clients.find((client) => client.id === item.session?.client)?.pod === pod;
  const alertIds = (list: any[] | undefined) =>
    new Set<string>((list || []).filter(inPod).map((item) => item.sessionId));
  const issueIds = new Set<string>(
    (state.draftIssues?.[pod] || []).map((item: any) => item.sessionId),
  );
  const cards = buildCards({
    candidate,
    saved: state.sessions,
    changes: draft?.changes || [],
    conflictIds: alertIds(state.conflicts),
    issueIds,
    historicalIds: alertIds(state.historicalAlerts),
    started: (item) => localInstant(item.date, item.time, tz) < Date.now(),
    ghostTherapistMoves: view === "day",
    preview,
    selectedId,
  }).filter((card) => days.includes(card.session.date));

  const open = (item: Session) => {
    if (readOnly) return;
    // An open conflict always opens its guided view in the side panel.
    if (alertIds(state.conflicts).has(item.id)) {
      onSelect(item.id);
    } else if (
      editingPod ||
      draft ||
      localInstant(item.date, item.time, tz) < Date.now() ||
      !state.sessions.some((saved) => saved.id === item.id)
    ) {
      onSelect(item.id);
    } else {
      onEdit(item);
    }
  };

  const { firstHour, lastHour } = hourRange(
    state.config.open,
    state.config.close,
    cards.map((card) => card.session),
  );
  const gridStart = firstHour * 60;
  const gridEnd = lastHour * 60;
  const leaves = state.leaves || [];
  const openMin = toMinutes(state.config.open);
  const closeMin = toMinutes(state.config.close);

  let columns: Column[];
  if (view === "week") {
    const shown = days.filter((date) => {
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
      return (
        state.config.workingDays.includes(weekday) ||
        cards.some((card) => card.session.date === date)
      );
    });
    columns = shown.map((date) => ({
      key: date,
      title: formatDay(date),
      today: date === today,
      cards: cards.filter((card) => card.session.date === date),
      leave: [],
    }));
  } else {
    const date = days[0];
    const dayCards = cards.filter((card) => card.session.date === date);
    const people = state.therapists
      .filter(
        (person) =>
          person.pod === pod &&
          (person.active || dayCards.some((card) => card.session.therapist === person.id)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    columns = people.map((person) => {
      const mine = dayCards.filter((card) => card.session.therapist === person.id);
      const count = mine.filter((c) => c.kind !== "moving" && c.kind !== "cancelled").length;
      const clipped = leaveBlocks(leaves, person.id, date, openMin, closeMin);
      let sub = count === 1 ? "1 session" : `${count} sessions`;
      if (clipped.length) {
        const all = clipped.length === 1 && clipped[0].start <= openMin && clipped[0].end >= closeMin;
        sub = all
          ? "On leave all day"
          : `On leave ${clipped.map((b) => `${formatMinutes(b.start)}–${formatMinutes(b.end)}`).join(", ")}`;
      }
      return {
        key: person.id,
        title: person.name,
        sub,
        isLeave: clipped.length > 0,
        today: date === today,
        cards: mine,
        leave: leaveBlocks(leaves, person.id, date, gridStart, gridEnd),
      };
    });
  }

  const budget = laneBudget(
    gridPx === null ? null : (gridPx - HOURS_COL_PX) / Math.max(columns.length, 1),
  );
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const template = `${HOURS_COL_PX}px repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))`;

  return (
    <section
      ref={gridRef}
      className="time-grid"
      aria-label={view === "day" ? "Day schedule by therapist" : "Week schedule"}
    >
      <div className="time-grid-head" style={{ gridTemplateColumns: template }}>
        <div />
        {columns.map((column) => (
          <div className={`time-head${column.today ? " is-today" : ""}`} key={column.key}>
            <h2>{column.title}</h2>
            {column.sub && (
              <span className={`time-sub${column.isLeave ? " is-leave" : ""}`}>{column.sub}</span>
            )}
          </div>
        ))}
      </div>
      {columns.length === 0 ? (
        <p className="empty-day">No active therapists in this pod.</p>
      ) : (
        <div className="time-grid-body" style={{ gridTemplateColumns: template }}>
          <div className="time-hours" aria-hidden="true">
            {hours.map((hour) => (
              <div className="time-hour" key={hour} style={{ height: HOUR_PX }}>
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {columns.map((column) => {
            const laneItems = column.cards.map((card) => ({
              key: card.key,
              start: toMinutes(card.session.time),
              end: toMinutes(card.session.time) + card.session.minutes,
            }));
            // Day columns are per therapist, so only Week view folds crowded clusters.
            const { placed, overflows } =
              view === "week"
                ? layoutColumn(laneItems, budget.maxLanes, budget.shown)
                : { placed: assignLanes(laneItems), overflows: [] as ReturnType<typeof layoutColumn>["overflows"] };
            return (
              <div
                className={`time-col${column.today ? " is-today" : ""}`}
                key={column.key}
                style={{ height: hours.length * HOUR_PX }}
              >
                {hours.map((hour) => (
                  <div className="time-slot" key={hour} style={{ height: HOUR_PX }} />
                ))}
                {column.leave.map((block, index) => (
                  <div
                    className="leave-block"
                    key={index}
                    aria-hidden="true"
                    style={{
                      top: ((block.start - gridStart) / 60) * HOUR_PX,
                      height: ((block.end - block.start) / 60) * HOUR_PX,
                    }}
                  />
                ))}
                {overflows.map((more) => {
                  const hidden = column.cards.filter((card) => more.keys.includes(card.key));
                  const parts = hiddenSummary(hidden).split(" · ");
                  const aria = `${hidden.length} more session${hidden.length === 1 ? "" : "s"} at ${formatMinutes(more.start)} on ${formatDay(column.key)}${parts.length > 1 ? ", " + parts.slice(1).join(", ") : ""}. Open day view.`;
                  return (
                    <button
                      type="button"
                      className="overflow-card"
                      key={`more-${more.start}`}
                      aria-label={aria}
                      title={aria}
                      style={{
                        top: ((more.start - gridStart) / 60) * HOUR_PX + 1,
                        height: Math.max(20, ((more.end - more.start) / 60) * HOUR_PX - 2),
                        left: `calc(${(more.lane / more.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / more.lanes}% - 4px)`,
                      }}
                      onClick={() => onOpenDay(column.key)}
                    >
                      {parts.map((part) => (
                        <span key={part}>{part}</span>
                      ))}
                    </button>
                  );
                })}
                {column.cards.filter((card) => placed.has(card.key)).map((card) => (
                  <SessionCard
                    key={card.key}
                    card={card}
                    view={view}
                    state={state}
                    gridStart={gridStart}
                    placement={placed.get(card.key) || { lane: 0, lanes: 1 }}
                    readOnly={readOnly}
                    onOpen={open}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SessionCard({
  card,
  view,
  state,
  gridStart,
  placement,
  readOnly,
  onOpen,
}: {
  card: CardModel;
  view: CalendarView;
  state: ClinicState;
  gridStart: number;
  placement: { lane: number; lanes: number };
  readOnly: boolean;
  onOpen: (session: Session) => void;
}) {
  const { session } = card;
  const start = toMinutes(session.time);
  const client = nameOf(state.clients, session.client);
  const therapist = nameOf(state.therapists, session.therapist);
  const place =
    session.location === "home"
      ? "Home"
      : state.rooms.find((room) => room.id === session.room)?.name || "";
  let caption = view === "week" ? [`with ${shortName(therapist)}`, place].filter(Boolean).join(" · ") : place;
  if (card.kind === "moving" && card.movedTo) {
    const to = card.movedTo;
    caption =
      to.therapist !== session.therapist
        ? `to ${shortName(nameOf(state.therapists, to.therapist))}`
        : `to ${formatDay(to.date)}, ${to.time}`;
  }
  const destination =
    card.kind === "moving" && card.movedTo
      ? `moving to ${shortName(nameOf(state.therapists, card.movedTo.therapist))}, ${formatDay(card.movedTo.date)} ${card.movedTo.time}`
      : "";
  const aria = [
    `${client} with ${therapist}`,
    `${formatMinutes(start)} to ${formatMinutes(start + session.minutes)}`,
    formatDay(session.date),
    place,
    ...card.pills.map((pill) => pill.toLowerCase()),
    destination,
  ]
    .filter(Boolean)
    .join(", ");
  const style: CSSProperties = {
    top: ((start - gridStart) / 60) * HOUR_PX + 1,
    height: Math.max(20, (session.minutes / 60) * HOUR_PX - 2),
    left: `calc(${(placement.lane / placement.lanes) * 100}% + 2px)`,
    width: `calc(${100 / placement.lanes}% - 4px)`,
  };
  const conflictToo = card.kind === "staged" && card.pills.includes("Conflict");
  const className = `session-card is-${card.kind}${conflictToo ? " has-conflict" : ""}${card.preview ? " is-preview" : ""}${card.selected ? " is-selected" : ""}`;
  const content = (
    <>
      <span className="card-body">
        <span className="card-time">
          {formatMinutes(start)}
          <span className="card-end"> – {formatMinutes(start + session.minutes)}</span>
        </span>
        <span className="card-pills">
          {card.pills.map((pill) => (
            <span className={`pill pill-${pill === "Conflict" ? "conflict" : card.kind}`} key={pill}>
              {pill === "Conflict" && (
                <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" focusable="false">
                  <path d="M8 1.5 15 14H1L8 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M8 6v4M8 11.6v.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              {pill}
            </span>
          ))}
        </span>
        <span className="card-client">{client}</span>
        {caption && <span className="card-caption">{caption}</span>}
      </span>
    </>
  );
  if (readOnly) {
    return (
      <div role="group" className={`${className} is-static`} style={style} aria-label={aria} title={aria}>
        {content}
      </div>
    );
  }
  return (
    <button type="button" className={className} style={style} aria-label={aria} title={aria} onClick={() => onOpen(session as Session)}>
      {content}
    </button>
  );
}

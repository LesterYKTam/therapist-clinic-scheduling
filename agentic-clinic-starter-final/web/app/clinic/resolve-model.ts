// Pure helpers for the guided resolve panel. They only arrange facts the server
// and the scheduling engine already decided: the options and their order come
// from `workableOptions` (D-B021), nothing here ranks, moves times or schedules.
// Erasable TypeScript with explicit extensions, so the Node suite imports it directly.
// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { interval, leaveInterval } from "../../lib/scheduling.mjs";

type Named = { id: string; name: string };
type SessionLike = {
  id: string;
  client: string;
  therapist: string;
  date: string;
  time: string;
  minutes: number;
  location?: string;
  room?: string | null;
  seriesId?: string;
};
type LeaveLike = {
  id?: string;
  therapist: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};
type ConfigLike = { timezone: string; open?: string; close?: string };

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});
// "Tue, Oct 27"
export const formatDay = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`));

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// "Morgan Testerson" -> "Morgan T."
export const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
};

const nameFor = (items: Named[], id?: string | null) =>
  items.find((item) => item.id === id)?.name || id || "";

const endTime = (session: SessionLike) => {
  const [hours, minutes] = session.time.split(":").map(Number);
  const total = hours * 60 + minutes + Number(session.minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const placeOf = (session: SessionLike, rooms: Named[]) =>
  session.location === "home" ? "Home visit" : nameFor(rooms, session.room);

// "Tue, Oct 27 · 09:00 – 10:00 · Room 1"
export function whenLine(session: SessionLike, rooms: Named[]) {
  return [
    formatDay(session.date),
    `${session.time} – ${endTime(session)}`,
    placeOf(session, rooms),
  ]
    .filter(Boolean)
    .join(" · ");
}

// "Tue, Oct 27 – Wed, Oct 28", or one day when the leave starts and ends on it.
const leaveRange = (leave: LeaveLike) =>
  leave.startDate === leave.endDate
    ? formatDay(leave.startDate)
    : `${formatDay(leave.startDate)} – ${formatDay(leave.endDate)}`;

type ConflictLike = { sessionId: string; session: SessionLike; leaves?: LeaveLike[] };

// The one-line summary under "Conflicts": which leave causes the conflicts.
export function leaveSummaryLine(conflicts: ConflictLike[], therapists: Named[]) {
  const byTherapist = new Map<string, Map<string, LeaveLike>>();
  for (const item of conflicts) {
    for (const leave of item.leaves || []) {
      const leaves = byTherapist.get(leave.therapist) || new Map<string, LeaveLike>();
      leaves.set(leave.id || `${leave.startDate}${leave.startTime}${leave.endDate}${leave.endTime}`, leave);
      byTherapist.set(leave.therapist, leaves);
    }
  }
  if (byTherapist.size === 0) return "";
  if (byTherapist.size > 1) return `${byTherapist.size} therapists on leave`;
  const [[therapist, leaves]] = [...byTherapist];
  const ranges = [...leaves.values()]
    .sort((a, b) => `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`))
    .map(leaveRange);
  return `${nameFor(therapists, therapist)} is on leave ${[...new Set(ranges)].join("; ")}`;
}

type DraftLike = { changes: { kind: string; sessionId?: string }[] } | undefined;

// Committed conflicts of the pod that still need a decision, earliest first.
// One the draft already changes counts as handled, unless the draft still flags it.
export function openConflicts<T extends ConflictLike>(
  conflicts: T[],
  clients: { id: string; pod: string }[],
  pod: string,
  draft: DraftLike,
  draftIssueIds: string[],
): T[] {
  const handled = new Set(
    (draft?.changes || [])
      .filter((change) => change.kind !== "add" && change.sessionId)
      .map((change) => change.sessionId as string),
  );
  const flagged = new Set(draftIssueIds);
  return conflicts
    .filter((item) => clients.find((client) => client.id === item.session.client)?.pod === pod)
    .filter((item) => !handled.has(item.sessionId) || flagged.has(item.sessionId))
    .sort(
      (a, b) =>
        `${a.session.date} ${a.session.time}`.localeCompare(`${b.session.date} ${b.session.time}`) ||
        a.sessionId.localeCompare(b.sessionId),
    );
}

export type TherapistAt = { id: string; name: string; state: string; kind: "leave" | "busy" | "free" };

// Each of the client's ranked therapists at the session's time: "on leave",
// "with <client first name>" or "free". `sessions` is the pod's sessions with
// its draft applied; the session being resolved never blocks anyone.
export function therapistsAtSession(
  session: SessionLike,
  ranked: Named[],
  sessions: SessionLike[],
  clients: Named[],
  leaves: LeaveLike[],
  config: ConfigLike,
): TherapistAt[] {
  const [start, end] = interval(session, config);
  return ranked.map((person) => {
    const onLeave = leaves.some((leave) => {
      if (leave.therapist !== person.id) return false;
      const [from, to] = leaveInterval(leave, config);
      return start < to && from < end;
    });
    if (onLeave) return { id: person.id, name: person.name, state: "on leave", kind: "leave" };
    const other = sessions.find((item) => {
      if (item.id === session.id || item.therapist !== person.id) return false;
      const [from, to] = interval(item, config);
      return start < to && from < end;
    });
    return other
      ? {
          id: person.id,
          name: person.name,
          state: `with ${firstName(nameFor(clients, other.client))}`,
          kind: "busy",
        }
      : { id: person.id, name: person.name, state: "free", kind: "free" };
  });
}

// Room ids with no other booking over the session's interval. Only for a payload that
// carries every pod's sessions (demo mode); the pod view gets this from the server
// as roomsFree, because other pods' bookings are not in it.
export function roomsFreeFrom(
  session: SessionLike,
  allSessions: SessionLike[],
  rooms: (Named & { active?: boolean })[],
  config: ConfigLike,
) {
  const [start, end] = interval(session, config);
  const used = new Set(
    allSessions
      .filter((item) => item.id !== session.id && item.location !== "home" && item.room)
      .filter((item) => {
        const [from, to] = interval(item, config);
        return start < to && from < end;
      })
      .map((item) => item.room),
  );
  return rooms.filter((room) => room.active !== false && !used.has(room.id)).map((room) => room.id);
}

// "Rooms 2, 3, 4" when they are all numbered rooms, otherwise the names; long
// lists are cut short. `ids` come from the server's clinic-wide roomsFree.
export function roomsFreeLabel(ids: string[] | undefined, rooms: Named[]) {
  if (!ids) return "Not available";
  if (ids.length === 0) return "None free";
  const names = ids.map((id) => nameFor(rooms, id));
  const numbers = names.map((name) => /^Room (\d+)$/.exec(name)?.[1]);
  return numbers.every(Boolean)
    ? `${names.length === 1 ? "Room" : "Rooms"} ${numbers.join(", ")}`
    : names.join(", ");
}

export type ResolveChange =
  | { kind: "assign"; sessionId: string; therapist: string }
  | { kind: "cancel"; sessionId: string };

const ordinal = (n: number) =>
  `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

export type OptionCard = {
  key: string;
  title: string;
  tag: string;
  rank: string;
  free: string;
  room: string;
  step: string;
  change: ResolveChange;
  lastResort: boolean;
};

// One card per engine option, in the engine's order, then the last-resort cancel.
// `options` is state.workableOptions[sessionId]; nothing is added or reordered.
export function buildOptionCards(
  session: SessionLike,
  options: { therapist: string; rank: number; suggested?: boolean }[],
  therapists: Named[],
  clients: Named[],
  rooms: Named[],
): OptionCard[] {
  const client = nameFor(clients, session.client);
  const window = `${session.time} – ${endTime(session)}`;
  const place = placeOf(session, rooms);
  const home = session.location === "home";
  const cards: OptionCard[] = options.map((option, index) => {
    const name = nameFor(therapists, option.therapist);
    return {
      key: `assign:${option.therapist}`,
      title: `${firstName(name)} takes this session`,
      tag: index === 0 ? "Suggested" : "",
      rank: `${ordinal(option.rank)}-ranked therapist`,
      free: `Free ${window}`,
      room: home ? "Home visit" : `Stays in ${place}`,
      step: `${client} → ${shortName(name)}, ${session.time}, ${place}`,
      change: { kind: "assign", sessionId: session.id, therapist: option.therapist },
      lastResort: false,
    };
  });
  cards.push({
    key: "cancel",
    title: "Cancel this session",
    tag: "Last resort",
    rank: "Client misses this session",
    free: "No therapist needed",
    room: home ? "Home visit" : `${place} is freed`,
    step: `Cancel ${client}, ${session.time}`,
    change: { kind: "cancel", sessionId: session.id },
    lastResort: true,
  });
  return cards;
}

// The calendar overlay for the selected option, or null when the key is not
// one of the offered cards (a stale selection never previews anything).
export function previewChange(cards: OptionCard[], key: string | null): ResolveChange | null {
  return cards.find((card) => card.key === key)?.change || null;
}

type StagedLike = Record<string, any>;

// One line for a staged change in the Draft list.
export function changeText(
  change: StagedLike,
  session: SessionLike | undefined,
  clients: Named[],
  therapists: Named[],
  rooms: Named[],
) {
  const source = session || change.session;
  const client = nameFor(clients, source?.client);
  if (change.kind === "add") {
    const added = change.session as SessionLike;
    return `Add ${client}, ${formatDay(added.date)} ${added.time}, ${shortName(nameFor(therapists, added.therapist))}`;
  }
  if (change.kind === "cancel") return `Cancel ${client}${source ? `, ${source.time}` : ""}`;
  if (change.kind === "reschedule") {
    const place = change.location === "home" ? "Home visit" : nameFor(rooms, change.room);
    return `${client} → ${shortName(nameFor(therapists, change.therapist))}, ${formatDay(change.date)} ${change.time} for ${change.minutes} minutes${place ? `, ${place}` : ""}`;
  }
  const place = source ? placeOf(source, rooms) : "";
  return `${client} → ${shortName(nameFor(therapists, change.therapist))}${source ? `, ${source.time}` : ""}${place ? `, ${place}` : ""}`;
}

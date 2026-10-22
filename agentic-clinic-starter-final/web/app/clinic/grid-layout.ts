// Pure helpers for the calendar time grid. No React and no scheduling policy:
// they only place already-decided sessions on a grid. Erasable TypeScript only,
// so the Node test suite can import this file directly.

export type LaneItem = { key: string; start: number; end: number };
export type LanePlacement = { lane: number; lanes: number };

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

export const formatMinutes = (value: number) =>
  `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

/**
 * Side-by-side lanes for overlapping items in one column. Items that touch
 * (one ends exactly when the next starts) do not overlap. Every item in a
 * connected cluster of overlaps shares the cluster's lane count, so widths line up.
 */
export function assignLanes(items: LaneItem[]): Map<string, LanePlacement> {
  const sorted = [...items].sort(
    (a, b) => a.start - b.start || a.end - b.end || a.key.localeCompare(b.key),
  );
  const result = new Map<string, LanePlacement>();
  let cluster: { key: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const member of cluster) {
      result.set(member.key, { lane: member.lane, lanes: laneEnds.length });
    }
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };
  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    cluster.push({ key: item.key, lane });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return result;
}

// Whole-hour range the grid shows: the clinic's opening hours, widened to
// include any session that falls outside them.
export function hourRange(
  open: string,
  close: string,
  sessions: { time: string; minutes: number }[],
) {
  let start = toMinutes(open);
  let end = toMinutes(close);
  for (const session of sessions) {
    const from = toMinutes(session.time);
    start = Math.min(start, from);
    end = Math.max(end, from + session.minutes);
  }
  const firstHour = Math.floor(start / 60);
  const lastHour = Math.min(24, Math.max(firstHour + 1, Math.ceil(end / 60)));
  return { firstHour, lastHour };
}

export type LeaveLike = {
  therapist: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

// Minutes of `date` a therapist is on leave, clipped to [from, to].
export function leaveBlocks(
  leaves: LeaveLike[],
  therapist: string,
  date: string,
  from: number,
  to: number,
) {
  const blocks: { start: number; end: number }[] = [];
  for (const leave of leaves) {
    if (leave.therapist !== therapist) continue;
    if (date < leave.startDate || date > leave.endDate) continue;
    const start = Math.max(from, leave.startDate === date ? toMinutes(leave.startTime) : 0);
    const end = Math.min(to, leave.endDate === date ? toMinutes(leave.endTime) : 1440);
    if (end > start) blocks.push({ start, end });
  }
  return blocks.sort((a, b) => a.start - b.start);
}

import { assignLanes, type LaneItem, type LanePlacement } from "./grid-layout.ts";
import type { CardModel } from "./card-state.ts";

export type Overflow = { start: number; end: number; keys: string[]; lane: number; lanes: number };

/**
 * Lanes for one column, collapsing crowded clusters. A cluster that needs more
 * than `maxLanes` lanes keeps its first `shown` lanes as cards; everything in
 * the remaining lanes folds into one overflow entry in the lane after them.
 * Other clusters are laid out exactly as assignLanes does.
 */
export function layoutColumn(items: LaneItem[], maxLanes = 3, shown = 2) {
  const lanes = assignLanes(items);
  const sorted = [...items].sort(
    (a, b) => a.start - b.start || a.end - b.end || a.key.localeCompare(b.key),
  );
  const placed = new Map<string, LanePlacement>();
  const overflows: Overflow[] = [];
  let cluster: LaneItem[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    if (!cluster.length) return;
    const count = lanes.get(cluster[0].key)!.lanes;
    if (count <= maxLanes) {
      for (const member of cluster) placed.set(member.key, lanes.get(member.key)!);
    } else {
      const hidden = cluster.filter((member) => lanes.get(member.key)!.lane >= shown);
      for (const member of cluster) {
        const lane = lanes.get(member.key)!.lane;
        if (lane < shown) placed.set(member.key, { lane, lanes: shown + 1 });
      }
      overflows.push({
        start: Math.min(...hidden.map((h) => h.start)),
        end: Math.max(...hidden.map((h) => h.end)),
        keys: hidden.map((h) => h.key),
        lane: shown,
        lanes: shown + 1,
      });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };
  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return { placed, overflows };
}

// "+3 more · 1 conflict · 2 draft" for the sessions folded into an overflow button.
export function hiddenSummary(cards: Pick<CardModel, "kind" | "pills">[]) {
  const conflicts = cards.filter((c) => c.pills.includes("Conflict") || c.kind === "conflict").length;
  const drafts = cards.filter(
    (c) => c.kind === "staged" || c.kind === "cancelled" || c.kind === "moving",
  ).length;
  const parts = [`+${cards.length} more`];
  if (conflicts) parts.push(`${conflicts} conflict${conflicts === 1 ? "" : "s"}`);
  if (drafts) parts.push(`${drafts} draft`);
  return parts.join(" · ");
}

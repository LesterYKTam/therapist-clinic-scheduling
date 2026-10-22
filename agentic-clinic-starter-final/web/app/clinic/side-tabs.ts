// Pure helpers for the tabbed side panel (UX-014). No React, so they are
// tested in the Node suite.

export const SIDE_TABS = ["conflicts", "draft", "leave", "notifications"] as const;
export type SideTab = (typeof SIDE_TABS)[number];

export const SIDE_TAB_LABELS: Record<SideTab, string> = {
  conflicts: "Conflicts",
  draft: "Draft",
  leave: "Leave",
  notifications: "Notifications",
};

export const TAB_KEY = "clinic.sidePanel.tab";
export const PANEL_HIDDEN_KEY = "clinic.sidePanel.hidden";

/** A stored value back to a tab; anything unknown is ignored. */
export function parseSideTab(value: unknown): SideTab | null {
  return SIDE_TABS.find((tab) => tab === value) ?? null;
}

/**
 * Arrow-key navigation for a horizontal tablist: Right/Down go forward,
 * Left/Up back (both wrap), Home and End jump. Returns null for other keys.
 */
export function tabForKey(current: SideTab, key: string): SideTab | null {
  const index = SIDE_TABS.indexOf(current);
  const count = SIDE_TABS.length;
  if (key === "ArrowRight" || key === "ArrowDown") return SIDE_TABS[(index + 1) % count];
  if (key === "ArrowLeft" || key === "ArrowUp") return SIDE_TABS[(index + count - 1) % count];
  if (key === "Home") return SIDE_TABS[0];
  if (key === "End") return SIDE_TABS[count - 1];
  return null;
}

/** Clicking a conflict card opens Conflicts; any other card opens Draft with More edits. */
export const tabForCard = (isConflict: boolean): SideTab => (isConflict ? "conflicts" : "draft");

/**
 * Where to go after a change is staged from a conflict: stay on Conflicts while
 * any remain, otherwise show the Draft so it can be committed.
 */
export const tabAfterStage = (conflictsLeft: number): SideTab =>
  conflictsLeft > 0 ? "conflicts" : "draft";

export type TabBadges = { draft: number | null; notifications: number | null };

/** Both badges show only when there is something to count. */
export function tabBadges(draftChanges: number | null, pendingNotifications: number): TabBadges {
  return {
    draft: draftChanges ? draftChanges : null,
    notifications: pendingNotifications > 0 ? pendingNotifications : null,
  };
}

/** Screen-reader text for a badge, e.g. "3 changes". */
export function badgeLabel(tab: SideTab, count: number): string {
  const unit = tab === "draft" ? "change" : "pending";
  return tab === "draft" ? `${count} ${unit}${count === 1 ? "" : "s"}` : `${count} ${unit}`;
}

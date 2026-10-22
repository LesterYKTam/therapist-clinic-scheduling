import assert from "node:assert/strict";
import test from "node:test";
import {
  badgeLabel,
  parseSideTab,
  SIDE_TABS,
  tabAfterStage,
  tabBadges,
  tabForCard,
  tabForKey,
} from "../app/clinic/side-tabs.ts";
import { laneBudget, layoutColumn } from "../app/clinic/grid-collapse.ts";
import { trapTarget } from "../app/clinic/use-dialog.ts";

const item = (key, from, to) => {
  const m = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return { key, start: m(from), end: m(to) };
};

test("tab order and stored tab parsing", () => {
  assert.deepEqual([...SIDE_TABS], ["conflicts", "draft", "leave", "notifications"]);
  assert.equal(parseSideTab("leave"), "leave");
  assert.equal(parseSideTab("nope"), null);
  assert.equal(parseSideTab(null), null);
});

test("arrow keys move between tabs and wrap; Home and End jump", () => {
  assert.equal(tabForKey("conflicts", "ArrowRight"), "draft");
  assert.equal(tabForKey("notifications", "ArrowRight"), "conflicts");
  assert.equal(tabForKey("conflicts", "ArrowLeft"), "notifications");
  assert.equal(tabForKey("draft", "ArrowDown"), "leave");
  assert.equal(tabForKey("leave", "ArrowUp"), "draft");
  assert.equal(tabForKey("leave", "Home"), "conflicts");
  assert.equal(tabForKey("leave", "End"), "notifications");
  assert.equal(tabForKey("leave", "Enter"), null);
});

test("cards and staging pick the right tab", () => {
  assert.equal(tabForCard(true), "conflicts");
  assert.equal(tabForCard(false), "draft");
  assert.equal(tabAfterStage(2), "conflicts");
  assert.equal(tabAfterStage(0), "draft");
});

test("badges: badges hide at zero", () => {
  assert.deepEqual(tabBadges(null, 0), { draft: null, notifications: null });
  assert.deepEqual(tabBadges(0, 0), { draft: null, notifications: null });
  assert.deepEqual(tabBadges(3, 2), { draft: 3, notifications: 2 });
  assert.equal(badgeLabel("draft", 1), "1 change");
  assert.equal(badgeLabel("draft", 3), "3 changes");
  assert.equal(badgeLabel("notifications", 2), "2 pending");
});

test("lane budget follows the column width, in lanes of about 90px", () => {
  assert.deepEqual(laneBudget(null), { maxLanes: 3, shown: 2 });
  assert.deepEqual(laneBudget(130), { maxLanes: 2, shown: 1 });
  assert.deepEqual(laneBudget(280), { maxLanes: 3, shown: 2 });
  assert.deepEqual(laneBudget(400), { maxLanes: 4, shown: 3 });
  assert.deepEqual(laneBudget(2000), { maxLanes: 5, shown: 4 });
  assert.deepEqual(laneBudget(0), { maxLanes: 3, shown: 2 });
});

test("a narrow column folds a three-way cluster that a wide one would show", () => {
  const items = ["a", "b", "c"].map((k) => item(k, "10:00", "11:00"));
  const wide = laneBudget(300);
  assert.equal(layoutColumn(items, wide.maxLanes, wide.shown).overflows.length, 0);
  const narrow = laneBudget(130);
  const { placed, overflows } = layoutColumn(items, narrow.maxLanes, narrow.shown);
  assert.deepEqual([...placed.keys()], ["a"]);
  assert.deepEqual(overflows[0].keys.sort(), ["b", "c"]);
  assert.equal(overflows[0].lanes, 2);
});

test("focus trap wraps at both ends and pulls stray focus back in", () => {
  const items = ["a", "b", "c"];
  assert.equal(trapTarget(items, "c", false), "a");
  assert.equal(trapTarget(items, "a", true), "c");
  assert.equal(trapTarget(items, "b", false), null);
  assert.equal(trapTarget(items, "b", true), null);
  assert.equal(trapTarget(items, "outside", false), "a");
  assert.equal(trapTarget(items, null, true), "c");
  assert.equal(trapTarget([], "x", false), null);
});

import { summarizeFailure } from "../app/clinic/notice-text.ts";

test("long failure lists are capped with an 'and N more' count", () => {
  assert.deepEqual(summarizeFailure("Plain failure."), { lead: "Plain failure.", items: [], more: 0, full: [] });
  assert.equal(summarizeFailure("Blocked: a; b; c").more, 0);
  const s = summarizeFailure("Blocked: 1; 2; 3; 4; 5; 6; 7");
  assert.equal(s.lead, "Blocked:");
  assert.deepEqual(s.items, ["1", "2", "3", "4", "5"]);
  assert.equal(s.more, 2);
  assert.equal(s.full.length, 7);
});

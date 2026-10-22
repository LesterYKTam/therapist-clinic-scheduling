import assert from "node:assert/strict";
import test from "node:test";
import { assignLanes, hourRange, leaveBlocks, formatMinutes, toMinutes } from "../app/clinic/grid-layout.ts";
import { buildCards } from "../app/clinic/card-state.ts";

const item = (key, from, to) => ({ key, start: toMinutes(from), end: toMinutes(to) });

test("a lone session takes the full column", () => {
  assert.deepEqual(assignLanes([item("a", "09:00", "10:00")]).get("a"), { lane: 0, lanes: 1 });
});

test("overlapping sessions sit side by side", () => {
  const lanes = assignLanes([item("a", "09:00", "10:00"), item("b", "09:30", "10:30")]);
  assert.deepEqual(lanes.get("a"), { lane: 0, lanes: 2 });
  assert.deepEqual(lanes.get("b"), { lane: 1, lanes: 2 });
});

test("back-to-back sessions do not overlap", () => {
  const lanes = assignLanes([item("a", "09:00", "10:00"), item("b", "10:00", "11:00")]);
  assert.deepEqual(lanes.get("a"), { lane: 0, lanes: 1 });
  assert.deepEqual(lanes.get("b"), { lane: 0, lanes: 1 });
});

test("three sessions at once get three lanes; a later one reuses a free lane", () => {
  const lanes = assignLanes([
    item("a", "10:00", "11:00"),
    item("b", "10:00", "11:00"),
    item("c", "10:00", "11:30"),
    item("d", "11:00", "12:00"),
  ]);
  assert.deepEqual(new Set(["a", "b", "c"].map((k) => lanes.get(k).lane)), new Set([0, 1, 2]));
  for (const key of ["a", "b", "c", "d"]) assert.equal(lanes.get(key).lanes, 3);
  assert.notEqual(lanes.get("d").lane, lanes.get("c").lane);
});

test("separate clusters keep their own lane counts", () => {
  const lanes = assignLanes([
    item("a", "09:00", "10:00"),
    item("b", "09:00", "10:00"),
    item("c", "13:00", "14:00"),
  ]);
  assert.equal(lanes.get("a").lanes, 2);
  assert.deepEqual(lanes.get("c"), { lane: 0, lanes: 1 });
});

test("a chain of overlaps shares one lane count within the cluster", () => {
  const lanes = assignLanes([item("a", "09:00", "10:00"), item("b", "09:30", "10:30"), item("c", "10:00", "11:00")]);
  assert.equal(lanes.get("c").lane, 0);
  assert.equal(lanes.get("a").lanes, 2);
  assert.equal(lanes.get("c").lanes, 2);
});

test("hour range follows opening hours and widens for sessions outside them", () => {
  assert.deepEqual(hourRange("09:00", "17:00", []), { firstHour: 9, lastHour: 17 });
  assert.deepEqual(hourRange("09:00", "17:00", [{ time: "08:30", minutes: 60 }, { time: "16:30", minutes: 60 }]), { firstHour: 8, lastHour: 18 });
  assert.equal(formatMinutes(9 * 60 + 5), "09:05");
});

test("leave blocks are clipped to the day and the range", () => {
  const leave = [{ therapist: "t1", startDate: "2026-10-26", startTime: "13:00", endDate: "2026-10-28", endTime: "11:00" }];
  const range = [9 * 60, 17 * 60];
  assert.deepEqual(leaveBlocks(leave, "t1", "2026-10-26", ...range), [{ start: 780, end: 1020 }]);
  assert.deepEqual(leaveBlocks(leave, "t1", "2026-10-27", ...range), [{ start: 540, end: 1020 }]);
  assert.deepEqual(leaveBlocks(leave, "t1", "2026-10-28", ...range), [{ start: 540, end: 660 }]);
  assert.deepEqual(leaveBlocks(leave, "t1", "2026-10-29", ...range), []);
  assert.deepEqual(leaveBlocks(leave, "t2", "2026-10-27", ...range), []);
});

const s = (id, extra = {}) => ({ id, client: "c", therapist: "t1", date: "2026-10-27", time: "09:00", minutes: 60, location: "clinic", room: "r1", ...extra });
const base = { changes: [], conflictIds: new Set(), issueIds: new Set(), historicalIds: new Set(), started: () => false, ghostTherapistMoves: true };
const kinds = (cards) => cards.map((c) => `${c.key}:${c.kind}:${c.pills.join("+")}`);

test("card states: committed, conflict, past and historical", () => {
  const sessions = [s("a"), s("b"), s("c"), s("d")];
  const cards = buildCards({
    ...base, saved: sessions, candidate: sessions,
    conflictIds: new Set(["b"]), historicalIds: new Set(["d"]),
    started: (x) => x.id === "c" || x.id === "d",
  });
  assert.deepEqual(kinds(cards), ["a:committed:", "b:conflict:Conflict", "c:past:Past", "d:past:Past+On leave"]);
});

test("card states: staged add, move, cancel and reassign", () => {
  const saved = [s("a"), s("b"), s("c")];
  const candidate = [s("a", { time: "11:00" }), s("c", { therapist: "t2" }), s("n")];
  const changes = [
    { kind: "reschedule", sessionId: "a" },
    { kind: "cancel", sessionId: "b" },
    { kind: "assign", sessionId: "c" },
    { kind: "add", session: s("n") },
  ];
  const cards = buildCards({ ...base, saved, candidate, changes });
  assert.deepEqual(
    cards.map((c) => [c.key, c.kind, c.pills.join("+")]),
    [
      ["a", "staged", "Draft"],
      ["a:from", "moving", "Moving"],
      ["c", "staged", "Draft"],
      ["c:from", "moving", "Moving"],
      ["n", "staged", "Draft"],
      ["b:cancel", "cancelled", "Draft: cancel"],
    ],
  );
});

test("a reassign shows a Moving ghost only when therapists get their own columns", () => {
  const saved = [s("c")];
  const candidate = [s("c", { therapist: "t2" })];
  const changes = [{ kind: "assign", sessionId: "c" }];
  assert.equal(buildCards({ ...base, saved, candidate, changes, ghostTherapistMoves: false }).length, 1);
  assert.equal(buildCards({ ...base, saved, candidate, changes }).length, 2);
});

test("a staged session with a remaining draft issue shows Draft and Conflict", () => {
  const saved = [s("a")];
  const cards = buildCards({
    ...base, saved, candidate: [s("a", { time: "10:00" })],
    changes: [{ kind: "reschedule", sessionId: "a" }], issueIds: new Set(["a"]),
  });
  assert.deepEqual(cards[0].pills, ["Draft", "Conflict"]);
});

import { layoutColumn, hiddenSummary } from "../app/clinic/grid-collapse.ts";

test("clusters of up to three lanes are not collapsed", () => {
  const { placed, overflows } = layoutColumn([item("a", "10:00", "11:00"), item("b", "10:00", "11:00"), item("c", "10:00", "11:00")]);
  assert.equal(overflows.length, 0);
  assert.equal(placed.size, 3);
  assert.equal(placed.get("c").lanes, 3);
});

test("a five-way cluster shows two cards and one overflow of three", () => {
  const items = ["a", "b", "c", "d", "e"].map((k) => item(k, "10:00", "11:00"));
  items.push(item("z", "13:00", "14:00"));
  const { placed, overflows } = layoutColumn(items);
  assert.deepEqual([...placed.keys()].sort(), ["a", "b", "z"]);
  assert.deepEqual(placed.get("a"), { lane: 0, lanes: 3 });
  assert.deepEqual(placed.get("b"), { lane: 1, lanes: 3 });
  assert.deepEqual(placed.get("z"), { lane: 0, lanes: 1 });
  assert.equal(overflows.length, 1);
  assert.deepEqual(overflows[0].keys.sort(), ["c", "d", "e"]);
  assert.equal(overflows[0].lane, 2);
  assert.equal(overflows[0].lanes, 3);
  assert.equal(overflows[0].start, 600);
  assert.equal(overflows[0].end, 660);
});

test("hidden summary counts conflicts and drafts", () => {
  assert.equal(hiddenSummary([{ kind: "committed", pills: [] }, { kind: "committed", pills: [] }]), "+2 more");
  assert.equal(
    hiddenSummary([{ kind: "conflict", pills: ["Conflict"] }, { kind: "committed", pills: [] }, { kind: "committed", pills: [] }]),
    "+3 more · 1 conflict",
  );
  assert.equal(
    hiddenSummary([{ kind: "staged", pills: ["Draft"] }, { kind: "staged", pills: ["Draft", "Conflict"] }, { kind: "moving", pills: ["Moving"] }]),
    "+3 more · 1 conflict · 3 draft",
  );
});

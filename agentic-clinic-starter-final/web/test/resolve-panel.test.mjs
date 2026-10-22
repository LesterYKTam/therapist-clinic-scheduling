import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOptionCards,
  changeText,
  leaveSummaryLine,
  openConflicts,
  previewChange,
  roomsFreeFrom,
  roomsFreeLabel,
  therapistsAtSession,
  whenLine,
} from "../app/clinic/resolve-model.ts";
import { buildCards } from "../app/clinic/card-state.ts";

const config = { timezone: "America/Toronto", open: "09:00", close: "17:00" };
const therapists = [
  { id: "t1", name: "Morgan Testerson" },
  { id: "t2", name: "Taylor Testerson" },
  { id: "t3", name: "Casey Testerson" },
];
const clients = [
  { id: "c1", name: "Alex Sampleton", pod: "a" },
  { id: "c2", name: "Bailey Sampleton", pod: "a" },
  { id: "c3", name: "Zed Other", pod: "b" },
];
const rooms = [
  { id: "r1", name: "Room 1" },
  { id: "r2", name: "Room 2" },
  { id: "r3", name: "Room 3" },
];
const session = (id, client, therapist, time, extra = {}) => ({
  id,
  client,
  therapist,
  date: "2030-10-29",
  time,
  minutes: 60,
  location: "clinic",
  room: "r1",
  ...extra,
});
const leave = (therapist, startDate, endDate, id = `${therapist}${startDate}`) => ({
  id,
  therapist,
  startDate,
  startTime: "09:00",
  endDate,
  endTime: "17:00",
});

test("leave summary names the one therapist and the dates", () => {
  const conflicts = [
    { sessionId: "s1", session: session("s1", "c1", "t1", "09:00"), leaves: [leave("t1", "2030-10-29", "2030-10-30")] },
    { sessionId: "s2", session: session("s2", "c2", "t1", "11:00"), leaves: [leave("t1", "2030-10-29", "2030-10-30")] },
  ];
  assert.equal(leaveSummaryLine(conflicts, therapists), "Morgan Testerson is on leave Tue, Oct 29 – Wed, Oct 30");
});

test("leave summary: a one-day leave shows one date; several therapists give a count; none gives nothing", () => {
  const one = [{ sessionId: "s1", session: session("s1", "c1", "t1", "09:00"), leaves: [leave("t1", "2030-10-29", "2030-10-29")] }];
  assert.equal(leaveSummaryLine(one, therapists), "Morgan Testerson is on leave Tue, Oct 29");
  const two = [
    ...one,
    { sessionId: "s2", session: session("s2", "c2", "t2", "09:00"), leaves: [leave("t2", "2030-10-29", "2030-10-29")] },
  ];
  assert.equal(leaveSummaryLine(two, therapists), "2 therapists on leave");
  assert.equal(leaveSummaryLine([], therapists), "");
});

test("therapists at the hour: on leave, with a client's first name, or free", () => {
  const target = session("s1", "c1", "t1", "09:00");
  const sessions = [target, session("s2", "c2", "t2", "09:30")];
  const result = therapistsAtSession(
    target,
    therapists,
    sessions,
    clients,
    [leave("t1", "2030-10-29", "2030-10-30")],
    config,
  );
  assert.deepEqual(
    result.map((item) => [item.id, item.state]),
    [["t1", "on leave"], ["t2", "with Bailey"], ["t3", "free"]],
  );
});

test("therapists at the hour: back-to-back sessions and the session itself do not block", () => {
  const target = session("s1", "c1", "t1", "10:00");
  const sessions = [target, session("s2", "c2", "t2", "09:00"), session("s3", "c2", "t3", "11:00")];
  const result = therapistsAtSession(target, therapists, sessions, clients, [], config);
  assert.deepEqual(result.map((item) => item.state), ["free", "free", "free"]);
});

test("open conflicts: this pod only, earliest first, and drops those the draft already handles", () => {
  const conflicts = [
    { sessionId: "s2", session: session("s2", "c2", "t1", "11:00") },
    { sessionId: "s1", session: session("s1", "c1", "t1", "09:00") },
    { sessionId: "sx", session: session("sx", "c3", "t1", "09:00") },
  ];
  assert.deepEqual(openConflicts(conflicts, clients, "a", undefined, []).map((c) => c.sessionId), ["s1", "s2"]);
  const draft = { changes: [{ kind: "assign", sessionId: "s1", therapist: "t2" }] };
  assert.deepEqual(openConflicts(conflicts, clients, "a", draft, []).map((c) => c.sessionId), ["s2"]);
  // Still flagged by the draft: stays open.
  assert.deepEqual(openConflicts(conflicts, clients, "a", draft, ["s1"]).map((c) => c.sessionId), ["s1", "s2"]);
});

test("option cards follow the engine's options exactly, then Cancel as the last resort", () => {
  const target = session("s1", "c1", "t1", "09:00");
  const engine = [
    { therapist: "t3", rank: 3, suggested: true },
    { therapist: "t2", rank: 2, suggested: false },
  ];
  const cards = buildOptionCards(target, engine, therapists, clients, rooms);
  assert.deepEqual(cards.map((card) => card.key), ["assign:t3", "assign:t2", "cancel"]);
  assert.deepEqual(cards.map((card) => card.tag), ["Suggested", "", "Last resort"]);
  assert.deepEqual(cards.map((card) => card.rank), ["3rd-ranked therapist", "2nd-ranked therapist", "Client misses this session"]);
  assert.equal(cards[0].free, "Free 09:00 – 10:00");
  assert.equal(cards[0].room, "Stays in Room 1");
  assert.equal(cards[2].room, "Room 1 is freed");
  const home = buildOptionCards(session("h", "c1", "t1", "09:00", { location: "home", room: null }), engine, therapists, clients, rooms);
  assert.deepEqual([home[0].room, home[2].room], ["Home visit", "Home visit"]);
  assert.deepEqual(cards[0].change, { kind: "assign", sessionId: "s1", therapist: "t3" });
  assert.deepEqual(cards[2].change, { kind: "cancel", sessionId: "s1" });
});

test("no workable options leaves only Cancel; times are never changed", () => {
  const cards = buildOptionCards(session("s1", "c1", "t1", "09:00"), [], therapists, clients, rooms);
  assert.deepEqual(cards.map((card) => card.key), ["cancel"]);
  for (const card of cards) assert.equal("date" in card.change || "time" in card.change, false);
});

test("a selection that is not one of the offered cards previews nothing", () => {
  const cards = buildOptionCards(session("s1", "c1", "t1", "09:00"), [{ therapist: "t2", rank: 2 }], therapists, clients, rooms);
  assert.deepEqual(previewChange(cards, "assign:t2"), { kind: "assign", sessionId: "s1", therapist: "t2" });
  assert.equal(previewChange(cards, "assign:t3"), null);
  assert.equal(previewChange(cards, null), null);
});

test("when line and rooms-free label", () => {
  assert.equal(whenLine(session("s1", "c1", "t1", "09:00"), rooms), "Tue, Oct 29 · 09:00 – 10:00 · Room 1");
  assert.equal(whenLine(session("s1", "c1", "t1", "09:00", { location: "home", room: null }), rooms), "Tue, Oct 29 · 09:00 – 10:00 · Home visit");
  assert.equal(roomsFreeLabel(["r1", "r3"], rooms), "Rooms 1, 3");
  assert.equal(roomsFreeLabel([], rooms), "None free");
  const many = Array.from({ length: 12 }, (_, i) => ({ id: "x" + i, name: "Room " + (i + 1) }));
  assert.equal(roomsFreeLabel(many.map((r) => r.id), many), "Rooms " + many.map((_, i) => i + 1).join(", "));
  assert.equal(roomsFreeLabel(undefined, rooms), "Not available");
});

test("draft change text", () => {
  const target = session("s1", "c1", "t1", "09:00");
  assert.equal(changeText({ kind: "assign", sessionId: "s1", therapist: "t2" }, target, clients, therapists, rooms), "Alex Sampleton → Taylor T., 09:00, Room 1");
  assert.equal(changeText({ kind: "cancel", sessionId: "s1" }, target, clients, therapists, rooms), "Cancel Alex Sampleton, 09:00");
});

const base = (extra = {}) => ({
  candidate: [session("s1", "c1", "t1", "09:00"), session("s2", "c2", "t2", "09:00")],
  saved: [session("s1", "c1", "t1", "09:00"), session("s2", "c2", "t2", "09:00")],
  changes: [],
  conflictIds: new Set(["s1"]),
  issueIds: new Set(),
  historicalIds: new Set(),
  started: () => false,
  ghostTherapistMoves: true,
  ...extra,
});

test("preview overlay: an assign shows a Preview card with the new therapist and a Moving ghost", () => {
  const cards = buildCards(base({ preview: { kind: "assign", sessionId: "s1", therapist: "t3" } }));
  const shown = cards.find((card) => card.key === "s1");
  assert.equal(shown.kind, "staged");
  assert.equal(shown.preview, true);
  assert.deepEqual(shown.pills, ["Preview"]);
  assert.equal(shown.session.therapist, "t3");
  const ghost = cards.find((card) => card.key === "s1:from");
  assert.equal(ghost.kind, "moving");
  assert.equal(ghost.session.therapist, "t1");
  // Only the previewed session changes.
  assert.equal(cards.find((card) => card.key === "s2").kind, "committed");
});

test("preview overlay: a cancel shows a Preview: cancel card; no preview leaves the conflict card", () => {
  const cards = buildCards(base({ preview: { kind: "cancel", sessionId: "s1" } }));
  const shown = cards.find((card) => card.session.id === "s1");
  assert.equal(shown.kind, "cancelled");
  assert.equal(shown.preview, true);
  assert.deepEqual(shown.pills, ["Preview: cancel"]);
  const plain = buildCards(base());
  assert.equal(plain.find((card) => card.key === "s1").kind, "conflict");
  assert.equal(plain.some((card) => card.preview), false);
});

test("the selected conflict card is marked", () => {
  const cards = buildCards(base({ selectedId: "s1" }));
  assert.equal(cards.find((card) => card.key === "s1").selected, true);
  assert.equal(cards.find((card) => card.key === "s2").selected, undefined);
});

test("rooms free from a clinic-wide session list: overlaps block, touching and home visits do not, own room is free", () => {
  const target = session("s1", "c1", "t1", "09:00");
  const all = [
    target,
    session("o1", "c3", "t2", "09:30", { room: "r2" }),
    session("o2", "c3", "t2", "10:00", { room: "r3" }),
    session("o3", "c3", "t3", "09:00", { location: "home", room: null }),
  ];
  assert.deepEqual(roomsFreeFrom(target, all, rooms, config), ["r1", "r3"]);
  assert.deepEqual(roomsFreeFrom(target, all, [...rooms, { id: "r4", name: "Room 4", active: false }], config), ["r1", "r3"]);
});

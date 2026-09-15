# Sprint 3 — Whole-workflow UX review

Status: Candidate complete; awaiting Business Owner feedback/acceptance.
Scope: UX-001–005, including the owner-requested calendar, normal setup, role labels and manual-conflict workflow (D-P026, D-B005).

## Open the prototype
http://127.0.0.1:3001

Start or restart from this folder:

```powershell
node prototype-server.mjs
```

The existing S2 demo remains separate at port 3000. The prototype server serves four allowlisted static assets and rejects writes; the browser imports only prototype modules. No SQLite connection, local storage, notification delivery or production schedule mutation is used. Reset walkthrough or reload restores the sample. Tests use separate state and temporary databases.

## Review the everyday flow first
1. Begin with the weekly calendar. People are labelled Client or Therapist. Click a session for details.
2. Select Set up weekly session. Choose an existing client, an assigned therapist, first occurrence, time, duration, and Clinic/room or Home.
3. Preview and explicitly save. The first sample occurrence appears in the calendar. Home reserves no room and uses the full booked duration.
4. Review Shared rooms, including adding an unused room and blocking removal of a booked room.

## Then review leave handling
1. Reset, choose Report leave, and select a walkthrough scenario.
2. Find affected sessions and compare original and proposed changes.
3. Choose alternative: all conflict-free combinations within the bounded sample domain are listed, with the recommendation highlighted and all free rooms selectable.
4. Ignore the suggestion and choose Edit freely in calendar. The draft calendar has a persistent conflict list on the right. Click a session or conflict item, change its therapist/time/location or cancel it, or use Add session. Every saved edit recalculates the complete list, including other sessions affected by the change. The former manual-change modal is removed.
5. Resolve every issue, including any bumped/reopened session. Preview is available while unresolved, but commit is blocked.
6. Confirm review and commit the sample. The calendar changes in memory and client/therapist notification tasks appear. Marking informed only changes the mock task.
7. Alternative: abandon; the committed sample calendar stays unchanged and no tasks are created.

## Scenario map
| Scenario | Review focus | Production traceability |
|---|---|---|
| Normal calendar/setup | Standing commitment, preview, first sample occurrence | UX-005; Q-015 production setup discovery |
| One-day absence | Worklist, home duration, alternatives, manual changes | US-002–008 |
| Scheduling clash & cascade | Visible bumped client, individual decision, parent/child link | US-004/005 |
| Weekly cap & cascade | Capacity restriction and explicit displaced-session decision | US-004/005 |
| Two-week leave, two therapists | Larger batch with consistent workflow | US-002/003/005 |
| No affected sessions | Empty result and return to calendar | US-002/003 |
| No valid replacement | Cancellation remains explicit | US-004/005 |
| Room taken before commit | Atomic failure, reopened issue, corrected commit | US-006/007 |
| Shared rooms | Shared inventory, booked-room removal block | US-009/007 |

## Verification
22 automated checks passed (`node --test`), including 12 prototype workflow tests and 10 preserved baseline tests. Browser walked all six populated scenarios to notifications; tested empty state, normal clinic setup, 90-minute home setup, full alternatives list, unavailable/over-cap manual alerts, blocked commit, abandon, room add/block/remove, keyboard activation/dialog dismissal and reset. Calendar, issue review and alternatives layouts inspected. No known ordinary defects found in the approved prototype scope.

## Explicit limits
This is an interactive UX prototype, not a completed scheduling engine. All workable options means the complete bounded sample domain shown in the dialog: three assigned therapists, five sample start times on the issue date, and the active sample rooms; manual editing allows other dates/times within the two-week sample. Normal weekly setup creates only the first sample occurrence. Production recurrence, availability, policy and setup questions remain in Q-001–009/Q-015. Scenario assumptions are expandable on screen. D-B005 is resolved: all outstanding conflicts must be resolved before commit; no exception bypass.

## Review decision
Review the entire calendar → normal setup → leave → decisions → commit/abandon → notifications experience together. Provide APPROVE / CHANGE / REJECT / EXPERIMENT or screen-specific feedback. UX acceptance does not certify production scheduling correctness or retrospectively accept S2. No further production implementation is authorized.

## Calendar editing revision (D-P027)
The draft calendar is the free-editing workspace. Add, move, cancel or restore a draft session in its side editor. Suggestions remain accessible but are optional. The conflict list updates after every saved edit, includes affected previously unaffected sessions, and clears conflicts as their causes are removed. The committed calendar is separately accessible and unchanged until commit.

Additional verification: tests cover new-session overlay, conflicts on both overlapping sessions, dynamic clearing after cancellation, safe abandonment, and atomic commit with additions. Browser verified conflict count sequence 3 → 2 → 1 → 3 → 1 → 0, then added a valid session, previewed it as a new session and committed to notification tasks. Generic non-submit buttons were corrected after a cancellation-confirmation issue was discovered (BUG-001); browser retest passed. Prototype opened on draft calendar with its initial three leave conflicts for review.

## Conflict resolver popup revision (D-P028)
The leave workflow now opens Conflict resolver directly. Calendar is left and live conflicts right. Clicking a conflict opens all bounded sample suggestions; Close suggestions returns to the same calendar without changing the draft. Selecting an option updates the draft and list while staying in the resolver. Calendar events open the free editor independently.

Terra verification: syntax checks passed; 22/22 tests passed; browser confirmed initial count 3, popup close preserves count 3, calendar event opens editor, and choosing an option changes the session and decreases count to 2. No defects found or additional code changes needed.

## UX-006 — Unified Calendar (D-P030)
The main Calendar now includes the draft editor and right conflict panel whenever a batch is active. The separate Conflict resolver destination is removed. Top and sidebar alert buttons show the live outstanding conflict count and open Calendar from other pages. Draft labels, suggestions, free editing and commit safeguards are retained.
Terra verification: syntax passed; 22/22 tests passed; browser report leave opened Calendar with three conflicts; alert from Shared rooms returned to Calendar/right list; closing suggestions kept count three; applying a suggestion updated the event and both alert/list counts to two. No production data changes. Owner acceptance remains pending.

## UX-007–009 — Calendar, Setup and Reports
Larger persistent status indicator: Schedule conflicts with count, or green No conflicts. Calendar Add session has one-off/weekly choice, preview and explicit save; active batches save into draft and retain weekly marker through commit. Weekly demo creates only the first occurrence.
Setup contains shared rooms, sample staff/clients and maximum hours, with referenced-record removal guards. Staff/client additions and hours are configuration UI only; assignment fixtures and scripted solver are unchanged, explicitly labelled.
Reports selects staff and month, lists sorted committed sessions and minutes, excludes drafts, and offers browser Print/save PDF with print CSS. September sample data populated; other months honestly empty. No messages sent.
Validation: Terra syntax check and 25/25 tests passed (including recurring draft marker through commit). Initial browser walkthrough verified Add modal, Setup, populated September/empty October reports and clean console. Final dynamic month-selector and active-draft modal corrections passed syntax/tests; browser recheck was unavailable after reload. Print stylesheet inspected; no exported PDF visual verification claimed. Owner review pending.

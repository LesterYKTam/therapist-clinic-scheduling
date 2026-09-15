# Build Log

One entry per meaningful increment or technical decision.

Record:
- backlog item(s);
- what changed;
- tests run;
- important implementation decision;
- failed approach if relevant;
- newly discovered issue/question;
- commit reference if available.

Do not use this as a second backlog.

## 2026-09-14 — TASK-001: Initial discovery and S1 proposal
Read startup/PM governance and product documents. Traced five synthetic scenarios, refined US-001–004, added missing workflow stories US-005/006 and demo TASK-002, and recorded Q-006–009 without deciding business rules. Proposed read-only S1 (US-001, TASK-002); awaiting Business Owner approval. No application code or governing-rule changes. Validation: document consistency review only; no application tests applicable. Existing staged starter files preserved; no commit or milestone tag created.

## 2026-09-14 — US-001 / TASK-002: Read-only baseline complete
Implemented a dependency-free Node HTTP demo, pod-isolated views, ranked-assignment fixture validation, and repeatable startup/demo instructions. Four automated tests pass; browser checked both pods and layout; restart succeeded. Tests initially failed with sandbox spawn EPERM and passed after authorized execution. All approved S1 items Done; candidate ready for Sprint Review, no new feature work started. No product milestone acceptance or tag yet.

## 2026-09-14 — US-007 / US-008: Owner requirement refinement
Recorded interchangeable clinic-wide shared rooms and home visits using a longer admin-entered booking interval. Removed separate commute calculation from planned scope; resolved Q-010/Q-012 and narrowed Q-011 to cap treatment. Updated SPEC and decisions; no room/home-visit application feature was added to S1. Continue baseline rather than rollback recommended for future additive work.

## 2026-09-14 — US-001 / TASK-002: M1 accepted
Business Owner approved completed Sprint 1. Recorded D-P019 and acceptance in review/state/sprint/milestone records. Creating milestone/M1 checkpoint for the accepted project; unrelated staged starter ZIP excluded. No code changes since the passing tests and browser review; no repeat tests needed for acceptance-only updates. TASK-003 tracks subsequent planning; no new implementation authorized.

## TASK-003 — Room/home-session planning refinement
Recorded D-B003: 15 initially configured rooms; inventory editable in the system; full home-session booked duration follows normal overlap and weekly-cap rules. Resolved Q-011 and added US-009 without duplicating US-007 reservation behavior. Scenario: removing a room that already holds a future committed session risks silently invalidating that booking. Added Q-013 and recommend blocking removal until bookings are reassigned. No application code changed; M1 remains the approved checkpoint and S2 has not been authorized.

## TASK-003 / US-009 — Removal rule resolved; S2 proposed
Recorded owner approval as D-B004 and resolved Q-013. Traced adding a shared room, blocked removal of a booked room, cross-pod room collisions, and home visits without rooms. Split baseline location representation into US-010 while preserving full scheduling integration in US-007/008. Prepared SPRINT_2_PROPOSAL.md with Ready Gate, dependencies, demos, persistence checks and explicit synthetic-clock limitation. Awaiting approval; documentation only, no application tests needed or S2 implementation started.

## US-009 / US-010 — Sprint 2 complete
Implemented persistent SQLite room inventory, transaction-protected removal guards, location-aware sample sessions and clinic-wide overlap validation. Ten tests passed; browser verified add/block/remove, pod isolation, 90-minute home visit, layout and persistence across live restart. Demo returned to 15 active rooms; inactive test room preserved. Updated DEMO and SPRINT_2_REVIEW. Node SQLite experimental-binding warning recorded in D-T001. No further feature work; awaiting owner acceptance.

## PROCESS-001 — Owner communication preference
Explicit request authorizes stage start/end announcements. Updated PM charter and D-P021; text fallback disclosed because no speech tool was available. Implementation/testing ends and browser/documentation stage transitions announced.

## PROCESS-001 — Stage announcement correction
Owner prefers text-only start banners in the exact requested format, with no end announcements. Recorded D-P022 and updated charter/backlog/resume state. Final documentation whitespace check corrected; no behavioral code changes.

## TASK-004 — UX-first backlog reorganization
Owner agreed to whole-workflow UI/UX-first delivery. Recorded D-P023; reordered existing items into Next (UX-001–004), Later (production US-002–008), and Preserved completed work, retaining all prior IDs/statuses and criteria. Proposed a single connected S3 prototype with scripted scenarios, explicit simulation boundaries and full-journey review. Updated sprint/state/questions; no application code changed. Continue from preserved work recommended; no rollback or S2 acceptance inferred. Validation: backlog ID/required-field and documentation consistency checks; no application tests needed.

## PROCESS-001 — Timestamped stage starts
Owner requested a timestamp in each start banner. Recorded D-P024 and updated PM charter, backlog acceptance criteria and product resume instructions. Use actual local date/time in America/Toronto; no stage-end announcements. Documentation-only change.

## TASK-004 / UX-001/003/005 — Mid-review owner UX feedback
Owner expands prototype to calendar-first normal scheduling, role-labelled names, all workable alternatives and a manual conflict-producing path. Recorded D-P026, Q-014/Q-015 and UX-005; refined UX-003. Continuing authorized UX work while exception-commit policy awaits clarification. Production invariants not silently changed.

## UX-001–005 — Complete Sprint 3 prototype
Built isolated static/browser UX demo on port 3001: calendar, normal weekly setup preview, session details, role labels, leave scenarios, linked issue review, full bounded conflict-free alternatives, manual conflict alerts, commit guard, atomic stale-room scenario, cancellation, abandonment, notification tasks and shared rooms. User feedback expanded scope under D-P026 and clarified all-issues-before-commit under D-B005. No existing app/database changes from prototype actions.
Validation: 19 tests passed. Browser traversed six populated scenarios to notifications plus empty state, normal clinic/home setup, manual cap warning and blocked commit, abandon, room controls, keyboard and reset. Inspected calendar/review/option layouts. Corrections ensured current draft choices influence later suggestions and all draft decisions revalidate before commit. SPRINT_3_REVIEW.md documents exact sample limitations and production mapping. Feature work stopped; whole-workflow owner review pending.

## UX-003 — Calendar editing feedback
Owner requests replacing manual form with editable calendar and a live side conflict list. Recorded D-P027; UX-003 reopened for revision. Prototype additions and cancellations stay draft; existing committed data remains unchanged. Will verify conflict creation, clearing, added-session commit and abandon.

## UX-003 / BUG-001 — Calendar editing revision verified
Replaced manual-change modal with editable draft calendar and persistent side conflict list under D-P027. Add/cancel/reschedule operations update the full draft overlay and detect new conflicts on other sessions; commit applies additions atomically and abandon preserves committed state. Twenty-two tests pass. Browser verified conflict count changes, clearing, new-session preview and successful commit. Found and fixed non-save form buttons triggering submission; explicit type=button preserves cancellation confirmation. BUG-001 Done. Updated review/state/backlog; owner review pending.

## UX-003 — Conflict resolver popup interaction
Implementing D-P028: left calendar/right live conflict list, suggestions on conflict click, close without draft mutations, accepted option stays in resolver. Leave-report entry now opens the resolver directly for nonempty batches; empty state retained.

## PROCESS-002 — Lower-cost agent delegation
Owner requests lower-cost agents for most work. Recorded D-P029 and PM charter policy. Assigned remaining D-P028 resolver verification to a focused Terra worker while Main PM maintains governance records. Current parent remains Astra; no account/model-picker setting changed. Official model guidance consulted for qualitative Terra/Luna cost positioning; no Codex billing savings promised.

## UX-003 / D-P028 — Delegated resolver verification complete
Terra worker confirmed syntax and 22/22 tests plus browser behavior: report leave opens resolver, conflict click shows suggestions, close leaves draft unchanged, calendar event opens free editor, accepting an option stays in resolver and reduces count 3→2. No defects found and no worker code changes. UX-003 Done; owner review pending. Main PM updated authoritative records without repeating verification.

## UX-006 — Unified calendar revision started
Owner requests merging resolver into main Calendar with a global conflict-count alert opening its right conflict panel. Recorded D-P030 and UX-006 before implementation. Continue current candidate; no rollback needed. Focused Terra worker owns implementation and verification; PM owns records and final review. Production work and milestone acceptance remain deferred.

## UX-006 — Unified Calendar verified
Terra updated prototype/ui.mjs and prototype/style.css: one Calendar destination, draft editor/right conflicts, accessible global live-count alerts. Syntax and 22 tests passed. Browser confirmed alert navigation from Shared rooms, right list, popup close unchanged and apply updating calendar/count 3→2. PM inspected routing/count integration and updated authoritative status to Done. Whole-workflow owner review pending; M1 remains approved checkpoint. No production code/data changes from this revision.

## UX-007/008 — Calendar and Setup revision
Owner requests larger schedule-conflict indicator including green empty state, Calendar-owned creation and infrequent Setup. Recorded D-P031 and backlog before delegated implementation. UX-009 reporting scope clarification requested; independent work proceeds.

## UX-007–009 — Delivered for owner review
Terra implemented Calendar creation/status, Setup and Reports in prototype files. PM requested corrections for dynamic report months and active-batch recurring creation; completed with 25 passing tests and clean syntax. Initial browser walkthrough passed; final recheck unavailable after browser reload, documented in review. Configuration/recurrence simulation boundaries retained. D-P032/034 capture report and recurrence clarification; D-P033 and PROCESS-003 capture candid recommendations. No production authorization or milestone acceptance inferred.

## UX-007/008 — Owner reiterates exact navigation
Owner confirms Calendar Add session must open a popup containing recurrence; no Set up schedule or Shared rooms left navigation; rooms belong in Setup. Terra assigned bounded served-asset and interaction verification because prior revision claims this behavior. No new workflow or production scope introduced.

## UX-007/008 — Navigation verification result
Terra confirmed served JS matches disk, no-store headers, no separate schedule-setup/shared-room menu, Rooms inside Setup, and Add session dialog with weekly checkbox on normal and active-draft paths. Fifteen prototype tests passed. No code change required. Browser visual automation unavailable; existing user tab was not reloaded. Parent restarted demo server at localhost:3001 (session 89466) after worker stopped its temporary verification server. Refresh loads current UI and resets temporary browser state.

## D-P035 / TASK-005 — UX accepted, development planning
Owner accepts UX and directs development transition. Recording M2 checkpoint, excluding pre-existing staged parent ZIP. Terra preparing conditional S4 plan; PM asks clinic calendar boundaries and recurrence decisions. No code changes or production assumptions authorized by milestone alone.

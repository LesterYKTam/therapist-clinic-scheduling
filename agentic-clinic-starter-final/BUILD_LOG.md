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

## Development planning paused — usage limit
M2 committed ca38a96 and annotated milestone/M2; unrelated staged ZIP excluded. D-P036 records configurable defaults authorized by owner. Terra planning worker hit usage limit before returning its proposal. No expensive replacement spawned; no implementation started. Resume TASK-005 by inspecting any partial SPRINT_4_PROPOSAL.md, completing minimum ready scope and remaining rule decisions, then presenting concrete S4 plan. Usage reset time not independently verified.

## TASK-005 — Development planning resumed
Usage check allows ordinary use (5% five-hour, 47% weekly used). Terra assigned focused update of saved S4 plan and proposed backlog; D-P036 removes obsolete defaults blockers. PM recommends one complete scheduling foundation sprint with internal test dependencies, then leave solver later. Owner asked about Setup changes invalidating booked sessions. No implementation begun.

## TASK-005 — Concrete S4 proposal prepared
Terra revised SPRINT_4_PROPOSAL.md; PM merged US-011–014/TASK-006 as DISCOVERED candidates, not approved implementation. Plan covers Setup through committed one-off/weekly Calendar and Reports, with shared validation and internal dependency checks. D-P036 defaults accepted; lifecycle guard answer pending. Direct selection among assigned therapists, preservation of past occurrences and no automatic holiday calendar are explicitly proposed for sprint approval, not silently resolved. Next gate: owner decision and S4 plan approval.

## D-P037 — S4 implementation begins
Owner approved concrete S4 and lifecycle guard. TASK-005 Done; US-011–014/TASK-006 IN_SPRINT. Terra assigned implementation with internal persistence/conflict tests before recurrence and reports. No further approval needed for routine approved work.

## S4 PM verification priorities
Review worker evidence for one-off and recurring writes against current persisted state; failed series changes must leave zero partial writes; shared room checks must span pods; DST/local calendar policy must be independent of browser timezone; history must survive settings/assignment changes. Review approved UI paths, restart persistence and printable reports. Existing S2 snapshot uses fixed demo clock and mandatory standing references, so migration must explicitly handle one-offs and configurable local time without corrupting preserved records.

## S4 progress and mandatory pause
Terra implemented shared scheduling/time validation, SQLite schema migration with backup, transaction revision checks, one-off/weekly occurrence maintenance, Setup existing-record controls and committed reports. PM rejected initial table/raw-JSON interface and required approved Calendar/modal/Setup controls; corrected. PM flagged timezone conversion cost, migration reread locking, past edit target and cancel-future one-off isolation; worker reports fixes and24 tests passing. Browser tested isolated memory-only port3003, not real database. Missing client-add UI and readable app formatting identified; worker interrupted during bounded follow-up when reliable usage check reached82% five-hour (60% weekly). AGENTS section20 mandates pause. Preserve partial files, no milestone commit or completion claim. Next: inspect current partial app, finish missing controls, verify complete sprint and update authoritative status. Existing staged parent ZIP remains unrelated.

## PROCESS-004 — Workflow and usage automation configured
Owner explicitly authorizes four-phase governance. Added WORKFLOW.md and updated AGENTS/PM charter/state/backlog. Preserved code and historical milestones; no development resumed. Created active thread heartbeat clinic-usage-guard-and-resume every30min, plus active-work checks every5min/before dispatch. Reset resume cannot bypass infrastructure approval or other owner blockers. Exact80% interlock is not guaranteed by periodic checks; no credit purchase/redemption. TASK-007 next.

## TASK-008 — Local configuration folder created
Created .local/dev.env, test.env, uat.env with blank values and local README; added ignore rules including general .env protection. git check-ignore confirms all four files excluded. ENVIRONMENTS.md documents proposed targets and concrete infrastructure readiness checks. No credentials collected, no services provisioned, no paid action. Infrastructure must be verified before autonomous development.

## TASK-009 — Local DEV setup started
Owner holds UAT and authorizes DEV setup. Terra assigned bounded infrastructure work; no business logic migration. Usage38%5h66%weekly at dispatch. Docker and Node available on PATH; PostgreSQL service/container status pending worker check. Existing prototype and partial/deleted legacy files preserved.

## TASK-009 — Foundation delivered, runtime prerequisite blocked
Terra created web/ Next.js TypeScript foundation, pinned dependencies/lock, PostgreSQL17 Compose DEV/TEST services with separate databases/credentials/volumes, secret generation/env loading and documented commands. Build passes; HTTP local landing responds with safe unavailable-database status (2.33s), no credentials exposed. Docker engine named pipe unavailable; Windows denied service start and Desktop launch did not establish engine. Actual PostgreSQL connection, runtime isolation and restart persistence remain unverified; infra:test correctly fails. No SQLite substitution, UAT provisioning or business logic migration. TASK-009 BLOCKED pending Docker Desktop Linux engine startup. Last usage worker reported56%5h69%weekly; avoid new substantial scope.

## TASK-009 — Owner reports Docker running; usage pause
2026-09-16 09:52 Toronto: owner confirms Docker Desktop running. Sandboxed docker version encounters named-pipe permission denied; retry with appropriate tool escalation after usage permits, do not conclude engine stopped. Fresh usage84% five-hour,73%weekly triggers mandatory hard stop. Five-hour resetsAt1789580886; weekly resetsAt1790002986. No database startup/verification performed this turn. Resume authorized TASK-009 only: infra:up, actual DEV health, isolated tests and persistence. UAT remains held and development-phase gate unchanged.

## Usage monitor — five-hour reset detected
2026-09-16 17:56 UTC: fresh five-hour usage0%, reset timestamp1789599394; weekly77%, reset timestamp1790002986. Five-hour reset confirmed, but automatic resume requires every relevant window<=70%. Remain paused for weekly allowance; no workers started and no development resumed. TASK-009 resume steps unchanged.

## TASK-009 — Usage reset and authorized verification resumed
2026-09-21 15:06 UTC: fresh usage five-hour5%, weekly1%; weekly reset advanced from1790002986 to1790608070. Automatic resume criteria satisfied. Assigned focused Terra verification worker; only existing local DEV scope resumed. UAT remains held, infrastructure exit approval still required before business development.

## TASK-009 — Local DEV runtime verified
2026-09-21: Terra verified Docker29.7.2 and PostgreSQL17 DEV/TEST healthy on separate5432/5433 services. Fixed Windows npm.cmd spawning in infra-smoke.mjs (shell enabled on Windows; spawn errors surfaced). Live isolated TEST smoke passed1/1; DEV database marker survived safe container restart; local Next.js landing rendered Connected to local PostgreSQL (clinic_dev). PM reviewed wrapper/test source. No UAT or business logic work. TASK-009 Done; infrastructure exit remains owner-gated.

## D-P039 — PostgreSQL development resumed
2026-09-21 11:21 Toronto: owner requests resume development after local foundation verification. Assigned focused Terra worker s4_postgres_delivery for approved S4 scope, actual PostgreSQL transactions and accepted UI. Usage33%/5% at dispatch. Updated heartbeat to remove obsolete infrastructure approval blocker. No new milestone acceptance inferred.

Owner answered future leave questions during S4: retained leave after abandon, one shared draft per pod, partial-day support (D-B006). Recorded without expanding current delivery worker scope.

## S4 PostgreSQL implementation checkpoint — conservation
Terra implemented PostgreSQL-only versioned state store, serialized migration/seed, transaction/revision guards, calendar API and basic connected UI, reports. PM review identified one-off cancel-future deleting peers, past target movement, and recurrence default wrongly used as maximum; worker reports fixes and regressions. Build passes and4/4 dedicated TEST tests pass. Full S4 incomplete: Setup people editing, calendar occurrence/future controls and browser verification remain. No new milestone. Worker stopped at73% five-hour/11%weekly conservation; resetsAt1790021270/1790608070. Resume authorized under D-P039 after usage reset, no new approval needed.

## Usage guard — hard stop threshold observed
2026-09-21 16:06 UTC: five-hour82%, weekly13%; resetsAt1790021270/1790608070. Upgraded conservation pause to HARD STOP. Project workers already completed; no interruption necessary, no unrelated work touched. Exact S4 checkpoint and remaining steps preserved in PRODUCT_STATE.md. No development performed. Await actual reset and all windows<=70% before automatic resume.

## S4 automatic resume after verified reset
2026-09-21 20:10 UTC: five-hour1%, weekly16%, resetsAt1790039456/1790608070. Limiting window reset confirmed. Resumed existing Terra s4_postgres_delivery to finish saved approved S4 controls and validation. UAT remains held; no unresolved leave rules inferred.

## S4 resumed delivery and browser findings — checkpoint
2026-09-21: Terra added people/cap/ranked Setup controls and occurrence/future editing;6/6 dedicated PG tests pass including reopen and simultaneous writes. Root browser available, contradicting worker surface limitation. PM rejected inline form/list in place of accepted calendar; worker implemented week/pod calendar/Add modal, room addition and working-day/week-start controls, detailed preview, configured timezone/date labels/recurrence defaults, validation-error modal retention. Latest build passes. PM verified synthetic preview/commit/reload and report60min plus prior empty month. Remaining browser scenarios, print verification, report client/role detail, and date input retention noted in PRODUCT_STATE. At77%5h28%weekly conservation, stopped further substantial work; no S4 completion claim.

## Usage guard — hard stop observed
2026-09-21 20:55 UTC: five-hour81%, weekly28%; resetsAt1790039456/1790608070. Project workers already completed; no interruption necessary. Saved S4 resume point unchanged. No development performed; wait for verified reset and both windows<=70%.

## S4 verification resumed after reset
2026-09-22 01:29 UTC fresh usage2%five-hour32%weekly resets1790058572/1790608070. Resumed existing Terra worker for report details/date-input review and fresh tests/build. PM independent acceptance review; UAT held, no leave rule assumptions.

## S4 report/date verification progress
2026-09-22 02:01 UTC heartbeat usage10%5h33%weekly. Worker reports report client/role detail and explicit ISO local-date helper complete; build and6/6 TEST pass. PM verified Home booking via AX setValue date entry Sep23 09:00 90min, preview correct and commit/calendar correct. Playwright fill alone did not persist date React state; avoid using it as proof of product defect. Remaining recurrence/Setup/print browser checks remain; no S4 completion claim.

## S4 print layout correction
PM source review found missing print CSS. Added print-only rules to hide navigation/report input controls, use page margins, repeat table headers and avoid splitting rows. Printed output still requires browser verification. Existing worker assigned remaining recurrence/Setup verification; no duplicated worker.

## S4 recurrence browser acceptance progress
2026-09-22 03:29 UTC usage45%5h38%weekly. Worker8/8 PostgreSQL tests pass (Setup persistence, cap rejection, atomic future edit and past protection added). PM browser verified weeklySep24-Oct8 materializes three previewed occurrences and commits; single Sep24 occurrence changed09:00 to11:00 via preview/commit. Default recurrence end anchors week start instead of selected date; assigned bounded correction and preview role labels. Remaining Setup/print/future UI checks still pending.

## S4 acceptance continuation
2026-09-22 21:32 UTC fresh usage3%5h42%weekly; no workers were live. Assigned focused Terra s4_acceptance_finish to pending recurrence-default/role fixes and verification. Local DEV was stopped; sandbox Next launch failed EPERM, authorized escalated npm run dev reached Ready (session47546). Root browser recovery from old connection-error tab failed; remaining UI checks not claimed passed.

## Owner-requested pause
2026-09-22: owner says stop a while. All project workers already completed; paused usage-guard automation and all further work. Latest worker evidence8/8 TEST and build pass; preview Back to edit fixed. Root browser opened existing Sep24 series edit modal only; no further schedule change committed this turn. Remaining future edit/cancel, Setup and print browser checks saved. Resume only on explicit owner request, not usage reset.

## D-P040 — Owner resumes development and updates model allocation
2026-09-22 18:13 Toronto: owner requested model update and development resume. Fresh usage 52% five-hour, 50% weekly; within normal band. Updated PM/workflow/model state and resumed S4 verification from saved browser checks. UAT remains held. No milestone acceptance inferred.

## S4 owner-resumed acceptance checkpoint
2026-09-22: Browser verified future-series edit/cancel, Setup blocker and persistence, added staff/client/ranking, and committed September report. Latest PostgreSQL TEST8/8 and production build passed before walkthrough. US-011/012/013 and TASK-006 Done; US-014 still needs rendered print/save-PDF verification, so S4 is not Done. No milestone approval inferred.

## Usage conservation — 2026-09-23 00:52 UTC
Fresh five-hour usage 71%, weekly 53%, resetsAt 2026-09-23 02:02 UTC and 2026-09-28 15:07 UTC. No project workers running. No substantial new work will start while over 70%. S4 remains at US-014 print artifact verification; UAT held; Q-005/Q-006 owner answers pending. No reset credit used.

## Usage reset and S4 report export resumed — 2026-09-23 02:24 UTC
Fresh five-hour usage0%, weekly53%, five-hour reset timestamp advanced to1790148240; normal work may resume. One focused GPT-6 Sol worker assigned US-014 downloadable PDF report and verification to close the browser print-preview gap. UAT remains held. No credits redeemed.

## Sprint 4 internal completion — 2026-09-23
Focused Sol worker delivered authoritative committed-data PDF export with bundled open-license Unicode font. TEST suite9/9 and build passed; rendered report checked visually and browser Download PDF emitted a download event. PM reviewed route/store/response/font provenance. US-014 marked Done, making US-011–014 and TASK-006 internally complete. No milestone approval/tag inferred. Next production leave/conflict scope gated by open Q-005/Q-006 decisions; UAT still held.

## D-B007 — Auto-resolve workflow design recorded
Owner approved configurable cascade depth and explicit proposal-to-draft flow with live and on-demand conflict checks. Updated decision/spec/backlog only; no new workflow implementation. Leave-edit and duration-change questions remain pending. UAT held.

## D-B008 / S5 — Leave registration and outstanding conflict foundation
Owner confirmed input-before-editing workflow and explicitly requested development resumption. Updated decision/spec/backlog and implemented S5 US-002/003 in the PostgreSQL DEV app: leave persists separately, clinic-local partial-day overlap produces deduplicated session conflicts, Calendar/global indicator display committed-schedule issues, and Recheck conflicts reloads latest state. Legacy S4 state gains an empty leaves array on read; existing sessions remain committed after leave. New direct schedule commits are blocked while leave conflicts remain, pending the shared draft resolver. Isolated TEST 11/11 and production build pass. Browser verified synthetic Sep23 partial leave affecting one committed Home session, persistent issue count after reload, and Setup navigation while leave remains outstanding. Restarted primary DEV at localhost:3000; 127.0.0.1 causes blocked Next dev resources. No UAT or milestone tag.

## S6 TASK-010 — Saved cascade limit
Added clinic-wide Setup choice 0/1/2, default 1, with server validation and compatibility for old S4 state. No resolver behavior is claimed yet. Isolated TEST 12/12 and production build pass; browser saved synthetic DEV value 2, reloaded, and confirmed it persisted while the leave issue remained. Local DEV remains at localhost:3000. Next: shared pod draft and explicit Auto resolve under US-004–006; Q-005/Q-003 answer branches pending.

## S6 — Shared draft storage foundation
Added PostgreSQL-backed one-per-pod unfinished draft records, idempotent begin and explicit discard. Discard keeps committed sessions and leave issues; Setup cannot smuggle changes into drafts. Concurrent begin attempts produce only one durable draft. API routes exist; no user-facing draft editor or Auto resolve is claimed. Isolated TEST 13/13 and production build pass. Local DEV restored on localhost:3000. Next: stage edits and validate draft conflicts, then bounded proposal and commit.

## S6 — Manual draft staging and atomic commit foundation
Added staged therapist assignment/cancellation for future sessions, candidate conflict diagnostics, zero-issue atomic commit, and Calendar controls for staging/commit/discard. The committed badge remains based on committed leave conflicts until the schedule is actually committed. The acting browser stays in Calendar after its draft edit. Isolated PostgreSQL TEST 15/15 and production build pass. Browser staged a synthetic replacement, confirmed the committed session and conflict badge did not change, then discarded and confirmed leave persisted. Auto resolve, cascades, draft add/reschedule and notification tasks are still outstanding.

## S6 — Ranked direct alternatives and D-B009
Added safe direct therapist choice enumeration against the current shared draft. The Calendar's Workable options dialog shows all valid direct assigned therapists and highlights the highest-ranked one; selecting an option stages it, while closing leaves the draft untouched. TEST 16/16, production build and a browser scenario with two safe alternatives pass. Owner resolved duration changes during rescheduling and the same-pod leave-edit block; pod-scoped access is logged separately as US-015 because the local trusted-admin baseline has no sign-in identity.

## S6 — Draft reschedule with editable duration
Added durable reschedule draft changes, merge-safe therapist reassignment on top of a staged move, and Calendar controls for date/time/duration/location/room. The candidate remains separate from committed records and cannot be published while any draft issue remains. PostgreSQL TEST 17/17 and production build pass. Browser staged a longer synthetic Home visit, confirmed the original committed session and badge remained, then discarded the draft.

## S6 — Direct-only batch proposal foundation
Added a pure multi-issue, pod-scoped direct assignment proposal as the first resolver pass. It does not alter the committed or shared draft state and reports unresolved items. It is not wired to the Auto resolve UI until bounded cascading and review/apply behavior are complete. TEST 18/18 pass.

## S6 — Bounded pure resolver search
Added side-effect-free 0/1/2 displacement search for supported first-ranked leave conflicts, with second-ranked cascade, third-ranked no-cascade fallback, loop prevention and unresolved reasons. A synthetic depth-2 chain verifies no committed mutation. TEST 19/19 and production build pass. No Auto resolve UI or draft application is claimed yet.

## S6 — Reviewable resolver, draft editing, notifications and leave maintenance
Implemented durable one-run Auto resolve proposal with revisioned Apply/Discard suggestions, causal displacement review, and no committed mutation until zero-issue draft commit. Added one-off/weekly draft Add session, notification worklist details and Mark handled, conflict-item option popup, and Calendar event selection into the shared draft. Direct scheduling routes now reject writes in a pod with an open draft. Recorded leave can be amended or withdrawn after the pod draft is closed; the same-pod draft blocks both actions. Browser verified conflict popup, reversible draft event selection/discard, and leave-edit controls. Isolated PostgreSQL TEST 24/24 and production build pass. Historical conflict treatment and Q-016 production access remain owner decisions; UAT held. D-P041 permits continued work to actual weekly allowance exhaustion.

## S6 — Multiple-leave acceptance and calendar layout
Added an end-to-end two-staff-leave test: one explicit Auto resolve preview proposes both changes, leaves and committed sessions stay unchanged until Apply and one atomic Commit, and six recipient tasks are created. Additional checks cover discarding suggestions while retaining earlier manual edits, third-ranked non-cascading fallback, cross-pod scheduling independence, and Home full-duration weekly caps. Setup now permits deactivating a room used only by historical reservations while preserving report labels; future room reservations still block deactivation with role-labelled booking details. Calendar keeps conflicts to the right of the week grid at the current desktop viewport; visual browser check passed. Add session defaults to the next working opening slot when today's opening time has passed. Historical conflicts are view-only pending Q-017. Isolated TEST 30/30 and production build pass. UAT held.

## S6 — Historical cascade protection
BUG-003 closes a path where weekly-cap relief could displace an already-started session earlier in the same week. The bounded solver now filters historical candidates and refuses them again before staging. A fixed-clock regression verifies that a future leave remains unresolved when the only cap relief would rewrite history. Isolated PostgreSQL TEST 32/32 and production build pass. Browser also confirmed historical conflicts are view-only and a zero-change Auto resolve proposal can be discarded without altering committed schedules or leave. Q-017 historical commit policy and Q-016 production pod access remain pending owner decisions; UAT held.

## S6 — Stale draft time guard
BUG-004 adds a current-time check inside shared draft commit. A change staged while future cannot be published once its source session has started or its destination time has passed. The atomic rejection retains the original committed booking and the unfinished draft; an isolated persisted-draft regression verifies that behavior. PostgreSQL TEST 33/33 and production build pass. Q-017 and Q-016 remain open; UAT held.

## S6 — Direct creation time guard
BUG-005 rejects direct one-off and weekly creation when the requested start is already in the past. Both preview and commit enforce the rule; existing historical sessions still load. An isolated TEST checks rejection leaves revision and sessions unchanged. PostgreSQL TEST 34/34 and production build pass. UAT held.

## S6 — Notification worklist context
BUG-006 adds client and therapist names with role labels to each task's before/after booking details. This display-only change helps an admin match a recipient to the affected appointment. Production build passes; existing notification state and 34 scheduling checks are unchanged. UAT held.

## S6 — Inactive staff in historical reports
BUG-007 exposes inactive therapists in the monthly report selector with an Inactive label. The committed-only server report already supports them. Production build passes; no synthetic DEV staff was changed for this UI check. UAT held.

## S6 — Admin revision after applied suggestions
An isolated acceptance scenario applies Auto resolve and then manually replaces its suggested assignment with a rescheduled 90-minute Home visit assigned to a different ranked therapist. Nothing changes in the committed schedule or task count before the final commit; the final booking matches the admin's edit and adds recipient tasks. Full PostgreSQL TEST 35/35 passes; no new product rule is assumed. UAT held.

## S6 — Pod-scoped conflict badge
BUG-008 ties the conflict badge and local-admin pod label to the selected Calendar pod. Browser switching verified Maple's one historical issue, Cedar's green No conflicts state, and restoration of Maple. The production build passes. This is a local UI correction, not production identity enforcement; Q-016 remains open. UAT held.

## S6 — Server-side cross-pod edit protection
BUG-009 prevents the legacy direct edit path from transferring an existing booking into another pod by changing both client and therapist. This closes a bypass where only the original pod's draft/conflicts were checked. Preview and commit reject the transfer without changing the original booking or the destination draft. Full isolated PostgreSQL TEST 36/36 and production build pass; Q-016 still gates trusted admin identity. UAT held.

## S6 — Timezone change guard
BUG-010 prevents Setup from changing the clinic timezone while any pod has an unfinished shared schedule draft. Reinterpreting staged wall-clock appointment times could silently change their meaning. An isolated PostgreSQL regression verifies that the timezone, revision and draft remain unchanged after rejection. Full TEST 37/37 and production build pass. UAT held.

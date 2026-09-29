# Product State

Product: Therapist Clinic Scheduling
Main interface: Main PM Agent
Current phase: Autonomous development; Sprint 5 leave/conflict foundation internally complete; Sprint 6 draft resolution in progress
Current approved milestone: M2 (milestone/M2), accepted UX baseline
Current implementation sprint: S6 shared draft and resolver; TASK-010 Done, US-004–006 implemented pending final acceptance
Current UX demo: http://127.0.0.1:3001 (node prototype-server.mjs)
Local DEV foundation: http://localhost:3000 (Next.js/PostgreSQL; legacy S2 source preserved)

## Owner pause and resumption
Owner requested stop a while on 2026-09-22; all project workers completed and heartbeat was paused. Owner explicitly requested updated model choices and development resumption later on 2026-09-22 (D-P040). The owner pause is lifted. Preserve current files and existing local services.

## Next action (current)

Continue S6 acceptance and independent usability fixes. Notification tasks now include before/after booking details and a pod-scoped Mark handled action; the Calendar conflict item opens the option dialog. Run targeted browser acceptance and keep the TEST/build checks green. Historical conflict commit policy and production identity/room authority are pending owner answers; do not infer them. UAT remains held. D-P041 directs work until weekly allowance exhaustion.

## Prior next-action notes (historical)
Sprint 4 US-011–014 and TASK-006 remain Done internally. D-B008 resolves the leave-input versus schedule-draft boundary, and the owner explicitly resumed development. Sprint 5 US-002/003 durable leave and outstanding conflicts are Done internally: 11/11 PostgreSQL TEST checks and production build pass; browser verified a partial-day leave, persistent conflict indicator/list and continued Setup navigation. Direct schedule commits are blocked while leave conflicts remain; the shared draft resolver is required next. Q-005 leave amendment and Q-003 moved-session duration remain open for their affected behavior. No new owner milestone acceptance or tag has been inferred. UAT remains held. Preserve synthetic DEV data, historical source and unrelated staged ZIP.
Sprint 6 TASK-010 persists clinic-wide cascade depth 0/1/2 (default 1) in Setup and PostgreSQL. Latest isolated TEST 12/12 and production build pass; browser verified value 2 survives reload while leave/conflict remains. US-004–006 shared draft, Auto resolve and atomic commit are the next substantial work. Owner questions on leave amendment and moved-session duration are pending asynchronously; continue independent work. No new owner milestone acceptance or tag has been inferred. UAT held. Local DEV is http://localhost:3000.

Usage observation: 2026-09-23 12:22 UTC five-hour 47%, weekly 64%, resetsAt 1790178651/1790608070. No project worker remains active. Local DEV is available at localhost:3000.
## Resume point
25 tests pass. Browser verified populated scenarios through notifications, normal setup/calendar, role labels, bounded full alternative lists, editable draft calendar with live side conflict list, add/cancel/reschedule, blocked commit, abandon, rooms, keyboard and reset. D-B005: all outstanding issues resolved before commit. Q-001–009/Q-015 remain for production; Q-014 resolved. Existing SQLite app preserved; prototype uses temporary browser state only. S2 not retrospectively accepted.

## Communication
Post stage starts only: "======     [YYYY-MM-DD HH:mm America/Toronto] Sprint 3 Implementation started     ======" using actual current time and applicable stage. No stage-end announcements.

## Agent allocation
D-P040: Sol is the default Main PM and substantial delivery/verification model; Luna handles small bounded tasks. Astra is exceptional. Main PM retains decision/backlog/review responsibility.


























## 2026-09-22 18:18 Toronto — owner-resumed acceptance checkpoint
D-P040 model policy is recorded; usage guard ACTIVE. US-011, US-012, US-013 and TASK-006 have passed the saved PostgreSQL tests/build plus PM browser scenarios and are Done. US-014 and S4 remain IN_SPRINT pending rendered print/save-PDF verification. Browser verified future-series edits/cancellation, Setup blockers/persistence/added people and ranking, and committed September report (225 minutes). Synthetic DEV data only. Future leave/cascade work remains gated by important Q-005/Q-006 decisions; owner questions asked asynchronously. UAT remains held.

## 2026-09-23 — next-workflow design discussion
Owner approved clinic-wide cascade depth 0/1/2 (default 1), live conflict checks plus manual Recheck conflicts, explicit Auto resolve preview of all impacted/modified/unresolved sessions, apply/discard suggestions in the shared draft, free manual editing afterward, and final Commit schedule or Discard draft. D-B007, SPEC and US-004/005/006 acceptance criteria updated. No application code was changed for this workflow. Q-005 leave edits and Q-003 draft duration changes still need owner answers before their affected implementation. No worker dispatched; UAT held.

## 2026-09-23 — Sprint 5 implementation
The owner confirmed leave/Setup inputs are saved before schedule editing; an unfinished schedule draft keeps its admin in Calendar editing mode. D-B008 and SPEC updated, with no clinic-wide admin lock. S5 US-002/003 adds PostgreSQL leave persistence, clinic-local partial-day intervals, deduplicated derived conflicts, a Calendar right list and global badge, and Recheck conflicts. Direct schedule commits are prevented while outstanding leave conflicts exist. TEST 11/11 and build pass. The local DEV site is http://localhost:3000; Next.js dev resources were blocked at 127.0.0.1, so use localhost for interactive testing. Browser verified partial leave and surviving conflict after reload, plus Setup navigation. Continue to shared draft and Auto resolve; leave amendment and moved-duration decisions remain open. No milestone acceptance/tag; UAT held.

## 2026-09-23 — Sprint 6 initial checkpoint
TASK-010 Done: cascade depth setting 0/1/2 default 1 persisted; old S4 state reads with default, invalid setting rejects. TEST 12/12 and build pass. Browser saved depth 2 in DEV Setup, reloaded, and confirmed it persisted with leave conflict intact. Shared pod draft, Auto resolve, manual editing and final commit are still not implemented. Continue US-004–006 independently of Q-005/Q-003 branches. Usage last observed five-hour41%, weekly63% at 11:59 UTC; check fresh before dispatch.

## 2026-09-23 12:22 UTC — shared draft storage checkpoint
Owner asked whether work was running or waiting. No worker was active between turns; the 30-minute heartbeat is a periodic usage/progress check, not uninterrupted execution. Owner answers to Q-005/Q-003 are pending but do not block independent work. Implemented one durable unfinished draft per pod in PostgreSQL, idempotent begin, discard that retains recorded leave and committed sessions, and Setup protection against modifying drafts. API actions exist but the Calendar does not yet use them. TEST 13/13 and production build pass. Primary DEV restarted at localhost:3000. Next concrete step: stage Calendar edits in the shared draft, derive draft conflicts, then proposal/commit. Usage 47% five-hour, 64% weekly; check again before substantial dispatch.

## 2026-09-23 12:40 UTC — manual shared draft checkpoint
Calendar can stage therapist reassignment or cancellation of a future committed session into the pod's shared PostgreSQL draft. The right side displays proposed changes and live draft issues. Commit requires zero draft issues and revalidates the full candidate atomically; discard leaves the recorded leave and committed calendar intact. The acting browser stays in Calendar after staging, without a global lock on other browsers. Isolated TEST 15/15 and production build pass; browser confirmed the committed conflict indicator stays nonzero while a resolving change is only staged, then discard restores the leave conflict. US-004–006 remain incomplete: Auto resolve/cascade, full manual draft add/reschedule, notification tasks and broader acceptance still need work. Q-005 leave amendment and Q-003 moved-duration questions remain pending; independent work continues. UAT held. No new owner milestone acceptance or tag.

## 2026-09-23 12:47 UTC — owner answers and direct safe options
D-B009 resolves Q-003 and Q-005: admin may explicitly change duration while rescheduling; edits/withdrawals of a pod's leave are blocked during its shared draft. Admins manage only their pod; clinic-wide shared room checks remain. US-015/Q-016 track server-trusted pod identity and shared-room inventory authority because the current single trusted local-admin DEV can switch pods and is not a production access boundary. The Calendar has a Workable options dialog with every currently safe directly assigned therapist, rank and Suggested highlight. This is not the full Auto resolve or cascade. Isolated TEST 16/16 and production build pass; browser verified two synthetic direct options without saving a change. Remaining S6: bounded batch proposal, full manual draft add/reschedule (including duration), notifications and acceptance. UAT remains held.

## Usage conservation and exact resume point — 2026-09-23 12:48 UTC
Fresh Codex usage: five-hour 71% used, weekly 68% used (resetsAt 1790178651/1790608070). Per AGENTS.md, no new substantial task starts above 70%. No project worker is running. The safe direct-options dialog, manual draft staging/commit/discard and D-B009 decision updates are saved and verified. Resume substantial S6 work only after a fresh usage check permits it: next implement the explicit bounded-cascade Auto resolve proposal, then full Calendar draft add/reschedule with editable duration, notification tasks, pod access after Q-016, and acceptance tests. Do not infer approval for UAT, pod identity or room-inventory authority. The existing 30-minute heartbeat monitors usage; it is not a continuous development worker.

## 2026-09-23 15:55 UTC — automatic usage resumption and duration draft checkpoint
The five-hour window actually reset at 15:50:51 UTC; fresh usage was 0% five-hour and 68% weekly, with usage as the only blocker. Development resumed under D-P040. Added a draft reschedule decision for an existing future session, allowing date, time, assigned therapist, duration, Clinic/shared room or Home. The full candidate is conflict-checked and stays separate from committed data until explicit zero-issue commit. Calendar has a stage form; browser verified a synthetic Sep24 Home visit moved to 13:00 for 120 minutes while the committed session and Sep23 leave conflict remained unchanged, then discarded the draft. Browser also confirmed Setup and Reports were disabled only in the editing browser and restored after discard. Isolated PostgreSQL TEST 17/17 and production build pass. Current usage 7% five-hour, 70% weekly; do not start another substantial task once weekly exceeds 70%. Next: bounded batch Auto resolve proposal, then draft add-session and notification tasks; pod identity/access remains gated by Q-016. UAT held.

## 2026-09-23 16:28 UTC — direct-only batch proposal foundation
While fresh usage was 10% five-hour and 70% weekly (normal threshold), implemented a side-effect-free pod-scoped first pass over all current draft leave issues. It proposes the highest-ranked conflict-free direct therapist assignment for each supported issue, carries cause/rank metadata, and lists unresolved issues without mutating state. This is intentionally labelled direct-only and is not exposed as Auto resolve until the bounded cascade and full proposal review/apply rules are implemented. TEST 18/18 pass. No separate worker is running. Continue the active S6 resolver only while fresh usage remains at or below 70%; at over 70% conserve and do not start another substantial increment. UAT remains held.

## 2026-09-23 16:32 UTC — bounded solver policy checkpoint and weekly conservation
Implemented a pure side-effect-free resolver search for therapist-leave issues when the affected session uses its first-ranked therapist. It tries the second-ranked therapist with clinic-configured depth 0/1/2, where depth counts distinct other sessions displaced, and then tries the third-ranked therapist without cascading. Search rejects new leave, client/therapist/room overlap, weekly-cap and shape issues, avoids revisiting displaced sessions, and lists proposed changes and unresolved stop reasons without altering the shared draft or committed calendar. The synthetic two-displacement scenario remains unresolved at depths 0/1 and resolves with three proposed assignments at depth 2. TEST 19/19 and production build pass. This policy is not yet exposed as Auto resolve: server-side one-run/versioned preview, full impacted causal links, review/apply/discard UI and notification tasks remain. Fresh usage is 14% five-hour and 71% weekly (weekly resetsAt 1790608070); per AGENTS.md, no new substantial task starts while over 70%. No project worker is running. Next exact step after the weekly reset and fresh <=70% check: review bounded search edge cases and wire versioned explicit Auto resolve preview/apply/discard to the shared draft. UAT held; pod identity Q-016 remains separate.

## 2026-09-23 — S6 active checkpoint (D-P041)
The owner directed development to continue until weekly usage actually prevents work; the earlier 70/80% conservation thresholds are waived for this run, without redeeming or buying credits. S6 now has a durable one-run Auto resolve proposal with versioned preview/apply/discard, a changed/impacted and unresolved review, manually staged one-off and weekly Add session, editable draft assignments/reschedules/cancellations, atomic zero-conflict commit, and generated notification tasks. Browser verified the proposal and staged Add session remain uncommitted, with Discard preserving recorded leave. Latest isolated PostgreSQL TEST 23/23 and production build pass. Usage at the last check: 33% five-hour and 77% weekly. Historical leave conflicts currently block future commits even after their session has started; the owner has been asked how to handle historical issues. Q-016 production sign-in and shared-room inventory authority also await owner answers. Continue independent S6 acceptance and worklist polish; UAT stays held.

## 2026-09-24 02:45 UTC — S6 integration checkpoint
D-P041 still applies; fresh usage is 63% five-hour and 82% weekly (weekly reset timestamp 1790608070), with ordinary usage allowed. S6 now has 29 passing isolated PostgreSQL tests and a passing production build. The two-leave scenario produces one reviewable proposal and atomic commit; third-ranked fallback remains non-cascading. Notification tasks include before/after details and can be marked handled. Leave amendment/withdrawal is available only when the same pod has no shared draft. Calendar conflict items open the options dialog; an open pod draft routes session clicks into shared editing. Direct writes cannot bypass the draft, and another pod may continue scheduling while the first has leave conflicts. BUG-002 historical room deactivation is fixed and tested. US-004, US-007 and US-008 are Done internally; US-005/006 remain pending final acceptance and the historical-conflict owner decision. Q-016 production pod identity/room inventory authority remains open. UAT held.

## 2026-09-24 — continuing under D-P041
Current isolated PostgreSQL TEST 30/30 and production build pass. Added a two-leave full Auto resolve/commit scenario, suggestion-only discard preserving prior manual draft edits, other-pod scheduling independence, Home full-duration weekly-cap checks, and third-ranked no-cascade check. Browser visually confirmed Calendar left/conflicts right at the current desktop width, and confirmed past conflicts are view-only and Add session defaults to the next working opening slot. BUG-002 historical room removal is fixed; Setup blockers identify client and therapist roles. Q-017 historical conflict behavior and Q-016 production pod identity/room authority remain owner decisions; UAT held. Fresh weekly usage was 85% with ordinary work still allowed; continue approved work to the actual limit without redeeming credits.

## 2026-09-24 — pre-limit continuation checkpoint
Latest isolated TEST 31/31 and production build pass. Staff monthly reports are proven to ignore unfinished draft edits and reflect only committed changes. Notification tasks capture the room name as it was at commit, even if Setup later renames the room. The Calendar now defaults Add session to the next working opening slot after today's opening time and chooses a therapist assigned to the selected client; visual browser check confirmed the date/time at the local DEV site. The conflict panel stays beside the calendar at the current desktop viewport. Q-017 and Q-016 remain pending owner answers, with independent approved work continuing. Fresh Codex usage was 88% five-hour and 86% weekly; the usage automation was updated to resume after a verified five-hour reset if that window stops work before the weekly allowance does. No credits redeemed; UAT held.

## 2026-09-24 03:01 UTC — historical conflict browser acceptance
Local DEV returned HTTP 200 with no open drafts. The past Sep 23 synthetic leave conflict remains visible in Calendar. Opening it correctly shows the session as view-only. Auto resolve produced a reviewable zero-change proposal with the historical issue and a clear stop reason; Apply was disabled, while Discard draft restored the unchanged committed calendar and recorded leave. This confirms the affected UI is safe while Q-017 is pending, but it does not resolve the long-term commit policy. Fresh usage: 94% five-hour, 87% weekly, ordinary work still allowed. The five-hour window resets at 2026-09-24 07:11:29 UTC; weekly resets at 2026-09-28 15:07:50 UTC. Continue until an actual allowance limit or owner blocker, then resume only after a verified reset. No credits redeemed; UAT held.

## 2026-09-24 — historical cascade safety fix
BUG-003 Done: bounded weekly-cap cascade now filters out sessions that have already started and defensively refuses any historical displacement candidate. A regression scenario with a future leave, a capped replacement therapist, and an earlier booking in the same week confirms that no historical session is moved. Isolated PostgreSQL TEST 32/32 and production build pass. No production rule was inferred for Q-017; that decision and Q-016 remain pending. Continue independent S6 work while allowance permits; UAT held.

## Exact next-work checkpoint at 98% five-hour / 88% weekly
The local DEV server is healthy on localhost:3000 and contains no open shared draft after the browser acceptance. Continue approved S6 acceptance by auditing future-only manual/automatic draft edits, notification recipient details, and conflict panel behavior; fix ordinary defects under a backlog BUG before claiming Sprint Done. Await the owner's answers for Q-017 historical conflict commit policy and Q-016 server-trusted admin pod identity/shared room authority before implementing their affected behavior. Do not provision UAT. D-P041 keeps the autonomous run active toward actual weekly exhaustion; if the five-hour window runs out first, save the observed reset time and resume after a fresh reset check through the active heartbeat. Never redeem or buy credits.

## 2026-09-24 — commit-time temporal guard
BUG-004 Done: a draft staged while a session was in the future can no longer commit after that session has started. The server checks every staged change against current time inside the atomic transaction and rejects a moved session that would land in the past. The failed commit preserves both committed schedule and draft for correction/discard. Isolated PostgreSQL TEST 33/33 and production build pass. Q-017/Q-016 are still awaiting owner decisions; the active heartbeat will verify usage reset before continuation. UAT held.

## 2026-09-24 12:36 UTC onward — five-hour reset and direct booking guard
The five-hour window actually reset; fresh usage was 1% five-hour, 88% weekly, and ordinary usage allowed. Autonomous development resumed under D-P041 without redeeming credits. BUG-005 now rejects new direct one-off and weekly requests with past start times in both preview and atomic commit while preserving readable historical records. Isolated PostgreSQL TEST 34/34 and production build pass. Continue S6 independent acceptance and defect work; Q-017 and Q-016 still gate their affected decisions, and UAT remains held.

## 2026-09-24 — recurring Add session browser acceptance
On local DEV, Calendar Add session displayed an assigned therapist and a future opening slot. Checking Repeat weekly exposed the required end date defaulted to 12 weeks later. Staging created 12 visible uncommitted occurrences and 12 proposed changes while the committed schedule conflict indicator remained unchanged. The existing historical leave issue stayed in the draft's right-side issue list and disabled Commit. Discard removed all 12 proposed occurrences and restored Setup/Reports navigation; the recorded leave remained. This was a synthetic DEV-only reversible check, with no committed schedule change.

## 2026-09-24 — notification detail usability
BUG-006 Done: pending notification tasks now show both the client and therapist names with roles in their before/after appointment details, so staff follow-up identifies the correct session. This is a display-only change using the stored recipient and booking snapshots; production build passes. The 34 isolated scheduling tests remain green from the prior code checkpoint.

## 2026-09-24 — historical staff report access
BUG-007 Done: Reports now lists inactive therapists with an Inactive label as well as active staff. The report service already reads committed sessions for any existing therapist, so historical schedules remain accessible after staff deactivation. Production build passes; the browser confirmed the report selector renders all currently configured staff. No DEV staff was deactivated merely to test the label. UAT held.

## 2026-09-24 — manual revision after Auto resolve acceptance
Added an isolated end-to-end S6 check in which the admin applies an Auto resolve suggestion, then moves that session to a different ranked therapist, time, duration and Home location before one final commit. The committed booking and notification count stay unchanged during draft editing; the final commit publishes only the admin's final choice and creates recipient tasks. Full isolated PostgreSQL TEST 35/35 passes. The latest production build passed after the preceding UI changes. Q-017 and Q-016 remain owner decisions; UAT held.

## 2026-09-24 — pod-scoped conflict indicator
BUG-008 Done: the local Calendar's selected pod now also drives the top conflict count and sidebar pod label. Browser acceptance showed Maple pod with one issue and an amber badge, Cedar pod with no issues and a green No conflicts badge, then restored Maple. This removes a misleading cross-pod count from the local demo; it is not server-trusted production access control, which still depends on Q-016. Production build passes, isolated TEST 35/35 passed at the last full run, and UAT is held.

## 2026-09-24 — direct edit pod-boundary guard
BUG-009 Done: direct editing of an existing booking can no longer transfer it to a client in another pod. Before this guard, the older edit route checked the original pod for an open draft and could change the destination pod's committed schedule despite that pod's draft. An isolated PostgreSQL scenario keeps the original booking and destination draft untouched after both preview and commit reject the transfer. Full TEST 36/36 and production build pass. This enforces a schedule invariant but does not implement production admin authentication; Q-016 remains open. Q-017 historical conflict policy also remains open; UAT held.

## 2026-09-24 — timezone change during a draft
BUG-010 Done: Setup rejects a clinic timezone change while any pod has an unfinished shared schedule draft. A timezone change could otherwise reinterpret staged appointment times before commit. An isolated PostgreSQL regression confirms that the setting, revision, and draft stay unchanged when Cedar has even an empty draft. Full TEST 37/37 and production build pass. Q-016 and Q-017 remain owner decisions; UAT held.

## 2026-09-28 — development resumed after verified allowance reset

Fresh Codex usage showed five-hour 1%, weekly 0%, ordinary work allowed. Docker Desktop and both PostgreSQL 17 containers were restarted; the first test attempt ran while PostgreSQL was still starting, then a healthy rerun passed 37/37 isolated tests. The production build passes and local DEV is serving HTTP 200 at localhost:3000. Owner resolved Q-016 through D-B010: equal-rights admins, config-page pod membership before pod access, any admin may reassign membership, and all admins may manage shared room inventory. US-015 remains unimplemented pending server-trusted authentication/access work; the local browser pod switcher is only a demo control. Q-017 historical-conflict commit treatment still awaits the owner; S6 final acceptance and UAT remain held.

## 2026-09-28 — admin identity foundation checkpoint

D-B011 selects clinic-managed admin accounts. Better Auth 1.7.6 with PostgreSQL-backed sessions, disabled public sign-up, an admin-only account/pod config page, a protected pod-assignment API, and a sign-in page are now present. `podId` is server-owned in the auth schema. The same synthetic TEST admin session sees a changed pod assignment on its next request; unauthenticated config redirects and pod updates return 401. Local DEV and TEST auth tables were migrated separately, with no real admin created. Explicit ignored `CLINIC_DEMO_MODE=1` keeps the existing local demo; a temporary production-mode instance returned setup/503 for the scheduling page and all read/write/report routes, then was stopped. DEV remains HTTP 200 on localhost:3000. Isolated PostgreSQL TEST 38/38 and production build pass. US-015 is IN_SPRINT: pod-scoped clinic data and mutation enforcement still need integration and two-admin acceptance. Q-017 still awaits an owner answer. UAT remains held.

## 2026-09-28 — pod-scoped read and reassignment checkpoint

Non-demo clinic JSON GET now validates a Better Auth session, requires an assigned pod, returns only that pod's people/bookings/leave/draft/notifications and shared room inventory, and rejects cross-pod staff report queries. Cross-pod room issue references are anonymized in the pod projection. A scheduling transaction rechecks the actor's current pod under `FOR SHARE`; a reassignment blocks a subsequent stale-pod write. The isolated access checks cover rejected public sign-up, live session reassignment, unassigned read rejection, cross-pod report rejection and pod response filtering. Full PostgreSQL TEST 40/40 and production build pass. Local DEV remains in explicit synthetic demo mode and serves HTTP 200 at localhost:3000. In non-demo mode the main page, writes and PDF remain closed pending per-action authorization and full two-admin acceptance. Q-017 is still unanswered; UAT remains held. Latest usage observed: 51% five-hour, 8% weekly, ordinary work allowed. Exact next work: authorize every clinic POST action against the current assigned pod inside its transaction, return pod-scoped action responses, then protect Setup and PDF before enabling the authenticated page. Do not expose the demo selector as identity or provision UAT.

## 2026-09-28 14:17 UTC — clinic action authorization foundation

Added a pure server-side clinic action authorizer and an isolated passing test for cross-pod direct edits, leave, draft actions and unassigned admins. It explicitly keeps Setup closed. This helper is not yet wired to non-demo POST; that route remains 503, so production writes are still fail-closed. Next wire authenticated POST to this policy with actor-bound transaction checks and pod-scoped responses, then secure Setup/PDF and run full PostgreSQL/build and two-admin scenarios. Q-017 and UAT gates remain unchanged. Fresh usage: 58% five-hour, 9% weekly, ordinary work allowed.

## 2026-09-28 — authenticated scheduling integration checkpoint

Non-demo POST now verifies the current Better Auth admin pod and action target, uses actor-bound transactions, and returns only pod-scoped state. Setup merges only that pod's people with clinic-wide shared rooms/config while retaining other pods' records. PDF reports require the staff member to belong to the assigned pod. The server-rendered scheduling page requires sign-in and assignment, then receives only a pod projection; safe therapist options are computed against the full server schedule. Two synthetic admin sessions, tampered pod IDs, unassigned reads/writes, reassignment during an open draft, shared-room Setup and foreign-record preservation pass isolated checks. A separate TEST-backed production-mode HTTP instance served the correct pod-specific page and JSON to both synthetic admins, then was stopped; localhost:3000 remains the explicit demo. BUG-011 closes new leave recording while that pod's shared draft exists. Latest full isolated PostgreSQL suite before BUG-011 was 42/42 and production build passed; rerun both after this change. First-admin bootstrap choice and final interactive access acceptance remain; no real admin account created and UAT held. Q-017 historical-conflict policy remains open.

## 2026-09-29 - authenticated access acceptance

After BUG-011, the isolated PostgreSQL suite passed 42/42 and the production build passed. A TEST-backed production-mode HTTP smoke passed with two synthetic admin sessions. An interactive check signed in as the synthetic Maple admin and verified pod-scoped Calendar, Setup, Reports, and admin configuration; an own-pod PDF generated successfully, then the admin signed out. The temporary production-mode server on port 3001 is stopped, and the synthetic TEST-only UI admin and its ignored credential file were removed. Local DEV on port 3000 remains the explicit demo. US-015 still needs the owner's first-admin bootstrap choice and final deployment/UAT acceptance; do not create a real admin or provision UAT yet. Q-017 historical-conflict policy remains open and gates its affected S6 acceptance. Fresh usage was 2% five-hour and 16% weekly, ordinary use allowed. Continue independent access audit and regression work; preserve these owner gates.

## 2026-09-28 local — owner-requested pause and agent handoff

The owner explicitly requested that development stop and a handoff be left for another agent. This overrides the earlier D-P041 autonomous continuation until the owner explicitly resumes. No subagents are active. The exact verified state, resume steps, open decisions and workspace safety notes are in `HANDOFF.md`. The project automation is paused; do not use usage reset as a resume signal. No real admin has been created and UAT remains held. Fresh usage at pause: 4% five-hour, 16% weekly, ordinary use allowed; usage did not cause the pause.

## 2026-09-28 — Claude takeover (D-P042)

The owner handed development to Claude Code and lifted the handoff pause. The Main PM is Opus 5.5, with Sonnet 5.5 `discovery`, `developer` and `qa` workers. Step 1 is a baseline verification (infrastructure, isolated tests, build) and a scope reconciliation of SPEC/DECISIONS against the backlog and code, with no code changes. The US-015 access audit follows. Still awaiting the owner: Q-017, first-admin bootstrap, and a safety-snapshot commit of the uncommitted S4–S6 work. D-P043 sets the usage guard: stop at 70% of the 5-hour or weekly limit. Usage at takeover was 6% of the 5-hour limit and 8% of the weekly limit. UAT held.

# Product & Process Decisions

## Kickoff process decisions

### D-P001 — Product ambiguity escalation
Ask the Business Owner only when ambiguity materially affects product behavior, architecture, safety, privacy, data integrity, cost, workflow, or recovery risk.

### D-P002 — Technical autonomy
PM may make technical choices autonomously following `AGENTS.md`.

### D-P003 — Technology conservatism
Prefer proven technology; use newer established technology only for substantial benefit.

### D-P004 — Sprint scope
New requirements normally go to backlog. Small low-risk work may enter active sprint only after becoming a backlog item.

### D-P005 — Sprint completion
All approved Sprint Backlog items must be Done before milestone candidate.

### D-P006 — Business Owner milestone controls
APPROVE / CHANGE / REJECT / EXPERIMENT.

### D-P007 — Small gates
Prefer frequent human gates, but split based on risk/uncertainty reduction rather than arbitrary effort.

### D-P008 — Scenario-based discovery
Use balanced discovery with emphasis on realistic scenarios.

### D-P009 — Bugs
Fix all known ordinary bugs before sprint completion unless fix requires major structural change.

### D-P010 — Demo data
Synthetic data only.

### D-P011 — Rollback
For CHANGE, PM compares continuing vs rollback and recommends the lower-risk/lower-effort path. Business Owner authorizes rollback.

### D-P012 — Backlog traceability
All work-producing requirements, changes, bugs, tasks, spikes, debt, and process changes must exist as backlog items.

### D-P013 — Sprint approval
Business Owner approves Sprint Plan before implementation.

### D-P014 — Risk-based splitting
Split when doing so reduces risk/uncertainty, not simply because work is large.

### D-P015 — Documentation
Affected documentation is part of Definition of Done.

### D-P016 — Process changes
Agents cannot change their own governing rules without Business Owner approval.

### D-P017 — Resource budget
<=70% usage: normal.
>70%: do not start new substantial tasks.
>80%: hard stop, persist state, wait for reset.

## 2026-09-14 — D-P018: Sprint 1 approval
Status: APPROVED by Business Owner
Source: "approved" in response to the S1 proposal.
Approved scope: US-001 and TASK-002, read-only synthetic pod schedule. Implementation may proceed; completed implementation still requires Sprint Review.

## 2026-09-14 — D-B001: Session location and resource requirements
Status: APPROVED direction; detailed behavior pending clarification
Source: Business Owner states clinic sessions reserve a room and some sessions occur at clients' homes with additional commute time.
Clinic sessions require a room reservation. Home visits require additional scheduling time for commuting. No travel formula, room compatibility rule, or cap treatment has been approved. Track under US-007 and US-008; do not silently add these workflows to S1.

## 2026-09-14 — D-B002: Rooms shared; commute handled through booked duration
Status: APPROVED by Business Owner
All rooms are interchangeable and shared across admins/pods. Room occupancy therefore requires clinic-wide conflict checks. For home visits the admin books a longer session to cover travel; separate commute calculations are not needed now. Supersedes D-B001's pending room compatibility and travel-calculation questions. Weekly-cap treatment of the full longer duration remains to be confirmed before scheduling implementation.

## 2026-09-14 — D-P019: Sprint 1 milestone acceptance
Status: APPROVED by Business Owner
Source: "approved" in response to completed Sprint 1 review.
Accepted deliverable: US-001 and TASK-002, read-only synthetic pod schedule, as described in SPRINT_REVIEW.md.
Official checkpoint: milestone/M1. This acceptance does not authorize a new implementation sprint.

## D-B003 — Configurable room inventory and ordinary home-session duration
Status: APPROVED by Business Owner
Source: Owner specifies 15 rooms initially, configurable in the system, and home visits treated like normal sessions with extra duration handled by the admin.
Initial inventory is 15 interchangeable rooms shared clinic-wide. The system must allow changing room inventory. Home visits use the full admin-booked duration under normal session overlap and weekly-hours rules, without separate travel calculation or commute accounting. Resolves Q-011. Behavior when removing an already-booked room requires clarification before implementation.

## D-B004 — Protect bookings when removing rooms
Status: APPROVED by Business Owner
Source: Owner answered "yes" to blocking room removal while future sessions reserve it.
Reject removal while future committed bookings still use the room. Show the blocking bookings without moving or cancelling them. The bookings must be moved before removal can succeed; inventory changes do not trigger automatic rescheduling.

## D-P020 — Sprint 2 implementation approval
Status: APPROVED by Business Owner
Source: "approve" in response to SPRINT_2_PROPOSAL.md.
Scope: US-009 and US-010 as proposed. TASK-003 planning complete. Completed S2 still requires milestone review; M1 remains the accepted product checkpoint.

## D-P021 — Sprint stage announcements
Status: APPROVED by explicit Business Owner request
Announce each sprint stage at its start and end; spoken delivery preferred. Recorded as PROCESS-001 and in PM_AGENT.md. This session has no available speech-generation/playback tool; text fallback disclosed.

## D-T001 — S2 persistent shared inventory
PM technical decision: use SQLite transactions via Node's built-in node:sqlite API, storing the small synthetic clinic snapshot as one record. BEGIN IMMEDIATE reads/checks/writes current state together; removed rooms remain as inactive records to preserve historical references. No new dependencies. SQLite itself is established; Node 24.13.0 labels this binding experimental, recorded as a runtime limitation for this local prototype. Validate on this runtime before upgrades. Full batch concurrency and production storage design remain deferred.

## D-P022 — Stage start banner format
Status: APPROVED by explicit Business Owner correction
Text posts are sufficient. Announce only stage starts using "======     Sprint 2 Implementation started     ======" with the applicable sprint number and stage. Do not announce stage endings. Supersedes D-P021's audio preference and start/end requirement; PROCESS-001 and PM_AGENT.md updated.

## D-P023 — UX-first delivery and whole-workflow review
Status: APPROVED by Business Owner
Source: Owner agreed to UI/UX-first development and requested backlog reorganization.
Prioritize a connected interactive prototype of the complete clinic workflow before further production scheduling logic. Review one coherent end-to-end experience; do not use isolated feature screens as milestone substitutes. Synthetic decisions and simulated results must be visibly distinguished from implemented production behavior. Existing implementation is retained. Product ambiguities still require explicit decisions before production implementation.
S2 implementation remains Done but not milestone-accepted; the owner's direction is a delivery-plan change, not retrospective acceptance or rejection. Continue from current work rather than rollback: the baseline and room work can inform the prototype without discarding tested code. No rollback is needed or authorized. This request authorizes backlog/planning changes; the prototype sprint plan still requires approval before implementation.

## D-P024 — Timestamp stage-start banners
Status: APPROVED by explicit Business Owner request
Include local date and 24-hour time in each start banner, using America/Toronto (the session timezone). Format: "======     [YYYY-MM-DD HH:mm America/Toronto] Sprint N Stage started     ======". Read the actual current time when posting; do not reuse an earlier timestamp. Start-only behavior remains unchanged. Updated PROCESS-001 and PM charter.

## D-P025 — Sprint 3 prototype approval
Status: APPROVED by Business Owner
Source: "lets go" in response to the ready Sprint 3 proposal.
Authorize UX-001–004 as one complete interactive prototype. All production logic remains deferred as described in SPRINT_3_PROPOSAL.md; existing S2 acceptance is not inferred.

## D-P026 — Owner expands Sprint 3 UX review scope
Status: APPROVED direction from explicit owner feedback during prototype review
Add normal schedule setup, prefer calendar presentation, and label each person's role wherever names appear. Alternative selection must show all workable (no new conflict) options for the sample scenario, highlighting the recommendation. A separate manual path permits cancellation, rescheduling and selecting assigned therapists despite unavailability or weekly-cap excess, showing resulting conflicts. Whether exceptions may be committed remains Q-014; do not silently override production invariants.
This explicitly amends the approved prototype scope. Normal schedule setup supersedes SPEC's previous exclusion for this prototype; detailed production setup rules still need discovery.

## D-B005 — Manual changes create issues, never commit exceptions
Status: APPROVED by Business Owner
Source: "admin must resolve all outstanding issues before commit".
Manual assignment/rescheduling may create draft conflicts, which must be surfaced as outstanding issues. Commit remains blocked until every issue is resolved. There is no exception bypass for leave, overlap, room availability or weekly-cap constraints. Resolves Q-014.

## D-P027 — Calendar-based free editing with live conflict panel
Status: APPROVED by explicit owner feedback
Replace the manual-change modal workflow with an editable draft calendar and persistent side list of conflicts. Admin may ignore suggestions, add/cancel/reschedule sessions directly and see the list update after each edit. Suggestions remain optional; all outstanding issues still block commit (D-B005). Amend UX-003 within S3; preserve prototype isolation.

## D-P028 — Conflict resolver with suggestions on item click
Status: APPROVED by explicit owner feedback
Rename the draft calendar workspace Conflict resolver. Calendar remains left, live conflict list right. Clicking a conflict opens suggestions for that session; selecting an option updates the draft and conflict list. Closing the popup changes nothing and leaves the admin free to edit the calendar. Keep commit blocked until all issues resolve. Refines UX-003 under the existing prototype scope.

## D-P029 — Cost-conscious agent delegation
Status: APPROVED direction from explicit Business Owner request
Owner requests lower-cost agents for most work. PM will delegate bounded implementation/testing/UI checks to GPT-5.6 Terra by default and small well-defined documentation/cleanup tasks to GPT-5.6 Luna when appropriate. Keep Astra participation brief and focused on PM/product decisions and difficult review; avoid duplicate investigation and large inherited contexts. Use one worker at a time unless independent parallel work is justified. Retain all approval gates and tests. This is task delegation, not a claim that the current parent model or account billing settings changed. Exact Codex savings are not inferred from API prices.

## D-P030 — One calendar for scheduling and conflict resolution
Status: APPROVED by explicit Business Owner direction
Merge Conflict resolver into the main Calendar. A visible alert icon with the outstanding conflict count opens Calendar with conflict items on the right. Preserve suggestion popups, free calendar editing, live conflict updates, draft/committed distinction and zero-outstanding-issues commit guard. Continue the current S3 prototype instead of rollback: this reuses the existing calendar/editor and avoids rebuilding accepted interactions. This is UX revision authorization, not milestone acceptance or production authorization.

## D-P031 — Calendar session creation and infrequent Setup
Status: APPROVED by explicit owner feedback
Enlarge schedule-conflict indicator, use “Schedule conflicts” for nonzero count and a visible green “No conflicts” state at zero. Calendar owns Add session; remove separate Set up schedule navigation while retaining weekly-session capability within calendar creation. Introduce Setup for infrequent room, staff, client and staff maximum-hours configuration. Prototype screens only; production personnel rules remain to be refined. Continue current candidate rather than rollback. “Add a report session” needs clarification; do not invent report scope.

## D-P032 — Staff schedule Reports
Status: APPROVED by explicit owner clarification
Reports is a page to generate shareable reports, for example one staff member's schedule for a selected month (October). Prototype provides staff/month selection, schedule preview and print/save-to-PDF; it sends no messages. Use committed sample sessions, label synthetic data and show honest empty-month results. Broader report types remain future discovery.

## D-P033 — Candid PM recommendations
Status: APPROVED by explicit owner request
Owner requests pushback when PM has a better idea or disagrees. State concrete tradeoffs and recommendations. Applied recommendation: consolidate session creation in Calendar while retaining one-off and weekly choices; reports default to committed schedules to avoid sharing tentative changes.

## D-P034 — Recurring creation and committed-only reports confirmed
Status: APPROVED by explicit owner confirmation
Add session must support recurring sessions. Reports use committed schedules only. Weekly prototype first-occurrence limitation stays visible; production recurrence remains Q-015.

## D-P035 — UX milestone accepted; development planning authorized
Status: APPROVED by Business Owner
Source: “looks good, i think we can move to developement phase”.
Accept S3 UX-001–009 as the UI/workflow baseline, milestone M2. Authorize transition to development planning behind the approved UI. This does not resolve outstanding production rules or retroactively accept S2 as a separate milestone. New implementation sprint requires a concrete ready plan under PM charter; collect only blocking rules for its scope. Preserve existing implementation in checkpoint, explicitly distinguish prototype from operational behavior.

## D-P036 — Configurable calendar and recurrence defaults
Status: APPROVED delegation of defaults by Business Owner
Source: “all those should be config able, u can assign a reasonable default value”, replying to clinic boundaries and recurrence questions.
Make timezone, working days/hours, weekly-cap week start and recurrence defaults configurable. PM initial defaults: America/Toronto; Monday–Friday 09:00–17:00; Monday week start; weekly recurrence with editable required end date defaulting to 12 weeks. Offer this occurrence or this-and-future editing. This settles initial settings, not all historical reconfiguration/holiday/series exception behavior. PM recommends impact review instead of silently altering existing bookings when settings change; detail in development plan. Leave persistence, cascade semantics and other unrelated questions remain open.

## D-P037 — Sprint 4 implementation approved
Status: APPROVED by Business Owner
Source: “approved” in response to concrete SPRINT_4_PROPOSAL.md and lifecycle recommendation.
Authorize US-011–014 and TASK-006 as one complete sprint: persistent configurable Setup, one-off/weekly Calendar sessions, transaction-time core conflict validation and committed monthly reports. Block Setup/person/assignment/cap changes that invalidate bookings, list blockers, never silently alter sessions. Approve plan's direct choice among three assigned therapists, past-occurrence preservation, this/this-and-future edits and no automatic holiday calendar. D-P036 defaults apply. Leave/cascades/drafts/notifications remain deferred. S4 completion requires whole-sprint review; M2 stays accepted checkpoint.

## D-P038 — Four-phase workflow and usage auto-resume
Status: APPROVED by explicit owner instruction, 2026-09-16
Adopt WORKFLOW.md: UI mocks without operational logic; owner-discussed infrastructure/structure; near-autonomous development of the complete approved requirements with only consequential escalations; final review then normal Scrum iterations. Supersedes repeated internal sprint approval stops during phase3. Preserve M2 and partial S4; return to infrastructure approval before further development. Configure periodic usage guard, hard-stop >80% and automatic post-reset resume of authorized work only. No automatic paid capacity or reset-credit use. Historical milestone tags preserved.

## D-I001 — Infrastructure priorities from owner
Status: REQUIREMENTS recorded; stack selection pending discussion
Finished product should deploy easily on Synology NAS, use mainstream technology, support free/very-low-cost online hosting, and run on Azure and AWS. Embedded database without a separate DB service is preferred, not mandatory. Evaluate portable single-app container plus SQLite with durable local storage, and document free-host persistence tradeoff before stack approval. Ask NAS model/DSM to verify compatibility. No hosting purchase/deployment authorized.

## D-I002 — Managed cloud and one database engine everywhere
Status: Owner constraints approved; provider/stack selection under discussion
Owner requires managed cloud services and rejects different database engines by environment. Supersedes proposed SQLite NAS / PostgreSQL cloud split (never approved). NAS model DS916+. Evaluate Vercel plus Neon, with PostgreSQL for development, automated integration tests, NAS and cloud; separate databases/credentials per environment, same schema/migrations and compatible major version. Embedded DB preference yields to engine consistency if PostgreSQL chosen. No provider provisioning authorized yet.

## D-I003 — Proposed local DEV/test and hosted UAT
Status: Owner-proposed environment direction; final infrastructure approval pending
Use local PC for rapid DEV/test; Vercel plus Neon Free for synthetic UAT/demo; defer production hosting selection. Keep PostgreSQL engine/version/schema/migrations consistent with separate environment databases/credentials. Vercel plan eligibility must reflect business UAT use, not assume Hobby permitted just because non-production. UAT database disposable synthetic data only, no production dependency. No provisioning or paid purchase authorized by this discussion.

## D-I004 — Local-only config and environment readiness
Owner authorizes Git-ignored project config folder; .local created and verified. DEV, isolated PostgreSQL tests and protected Vercel/Neon UAT must be established and verified before autonomous development. Environment loading/provisioning remains pending; no provider purchase authorization inferred.

## D-I005 — Local DEV setup authorized; UAT deferred
Owner requests holding UAT setup and proceeding with local DEV. Authorize local Next.js/TypeScript infrastructure and PostgreSQL development foundation with isolated test database, preserving accepted prototype and partial legacy work. No business logic migration or cloud provisioning in this task. UAT is no longer a blocker for local infrastructure completion; full development phase transition follows verified local foundation and recorded remaining decisions.

## D-P039 — Owner authorizes development resumption
Status: APPROVED by explicit owner instruction, 2026-09-21
Source: resume the development, following verified local Next.js/TypeScript/PostgreSQL DEV and TEST foundation and PM status explanation. Resume approved S4 normal scheduling scope on this foundation, preserving accepted M2 UX and partial legacy source. UAT remains held. Continue internally without routine sprint gates under D-P038; significant unresolved leave/cascade rules still require owner decisions. This is development authorization, not acceptance of incomplete S4 or a new completed-product milestone.

## D-B006 — Leave retention, shared drafts and partial-day support
Status: APPROVED by explicit owner answers, 2026-09-21
Keep reported leave recorded when schedule draft changes are abandoned; remaining affected sessions still require resolution. Each pod has one shared unfinished draft visible to its admins. Support partial-day leave as well as whole-day leave; do not implement whole-day-only assumptions. Date/time intervals use configured clinic timezone and overlap with session intervals. Detailed leave-edit refresh/cascade decisions remain open.

## D-P040 — Resume development with updated model choices
Status: APPROVED by explicit owner instruction, 2026-09-22

Owner lifts the temporary pause and requests development resume. Use GPT-6 Sol for Main PM and substantial implementation/verification at medium reasoning by default, GPT-6 Luna for small bounded tasks, and Astra only for exceptional difficult work. Supersedes the Terra-first allocation in D-P029. Retain the existing usage guard, scope, gates, and UAT hold. Model selection does not imply a billing change or measured savings.

## D-B007 — Configurable cascade and explicit auto-resolve draft workflow
Status: APPROVED DESIGN by owner discussion, 2026-09-23; implementation may proceed under owner development resumption

The clinic-wide Setup setting permits cascade depth 0, 1 or 2, default 1; depth counts other sessions displaced in one chain. Third-therapist fallback remains non-cascading. Calendar conflicts update live after draft edits, and a Recheck conflicts button reruns validation on demand. Auto resolve is explicit, inspects all outstanding conflicts, proposes safe supported resolutions up to configured depth and lists every impacted/modified session plus unresolved items and explanations. Suggestions are reviewed before being applied to the shared draft. Admin may discard just the suggestions, apply and continue manually edit, then Commit schedule only when all conflicts are gone. Discard draft abandons all uncommitted schedule changes while recorded leave and its unresolved issues remain (D-B006). Commit always revalidates latest shared state, including clinic-wide rooms. No silent committed-schedule changes or automatic session cancellations.

## D-B008 — Record inputs before an exclusive schedule-editing session
Status: APPROVED by owner discussion and explicit development resumption, 2026-09-23

Recording leave and saving Setup changes are independent committed inputs, not uncommitted schedule edits. Recording a second leave recomputes the current outstanding conflict set without duplicating issues. An admin may leave those conflicts outstanding while doing other work. Auto resolve should normally be run after the admin has recorded all expected inputs. As soon as that admin has uncommitted schedule changes, they remain in the Calendar editing session: keep editing (including Recheck conflicts), Commit schedule, or Discard schedule changes. Other admins are not globally locked out; relevant changes they make while a shared pod draft exists cause its issues to refresh, and commit revalidates the latest state. Discarding schedule changes never discards recorded leave or saved Setup records. The committed-schedule conflict indicator must remain truthful while a draft merely proposes a fix. Auto resolve is one run within an unchanged editing session; a fresh relevant input invalidates a pending proposal rather than silently applying stale changes. Exact leave amendment and moved-session-duration rules remain open for their affected work.

## D-B009 — Pod-scoped admins, leave edits, and rescheduled duration
Status: APPROVED by explicit owner answers, 2026-09-23

Admins manage people, leave and schedules only within their own pod. Rooms remain shared across pods and room occupancy must still be checked clinic-wide. An admin may explicitly change an existing session's duration when rescheduling it; the full new interval must pass all scheduling checks. While a pod has an open shared schedule draft, edits or withdrawals of that pod's recorded leave are blocked until commit or discard. This resolves Q-003 and Q-005. Who can change clinic-wide room inventory and how admin pod identity is established remain separate access-design questions.

## D-P041 — Continue development through the weekly usage allowance
Status: APPROVED by explicit owner instruction, 2026-09-23

For the current autonomous development run, continue approved work past the earlier 70% conservation and 80% hard-stop thresholds until the weekly Codex allowance actually prevents further work. Check fresh usage during work, save an exact checkpoint at the limit, and resume after the relevant reset if approved work remains. Never purchase or redeem credits automatically. This is a usage-policy exception, not authorization for UAT, production access assumptions, or new product scope.

## D-B010 — Admin pod assignment and shared configuration
Status: APPROVED by explicit owner answers, 2026-09-28

All admins have the same administrative rights; there is no separate clinic-owner role. Pod membership is assigned on a config page before an admin can access pod-specific work. Any admin may change pod members on that page at any time. An admin's ordinary people, leave, schedule, draft, report and notification access is limited to the pod currently assigned to that admin (D-B009), while room inventory is shared clinic-wide and any admin may manage it. The server must read the current assignment from trusted storage for each request; a browser pod selector or submitted pod ID cannot grant access. Reassignment must take effect on subsequent requests without changing committed records or an open draft. Authentication/provider details remain a separate deployment choice.

## D-B011 — Clinic-managed admin identity
Status: APPROVED by explicit owner answer, 2026-09-28

Use clinic-managed admin accounts for production sign-in, with server-validated sessions before applying D-B010 pod membership. Do not rely on the local DEV pod selector or a client-supplied role/identity. The first-account bootstrap method remains an implementation decision awaiting the owner's answer.

## D-P042 — Claude agent team replaces the Codex allocation
Status: APPROVED by explicit owner instruction, 2026-09-28

The owner handed the project from Codex to Claude Code and requested a Codex-like agent structure. The owner is Product Owner / Business Owner. Claude Opus 5.5 is the Main PM: owner communication, backlog and decision ownership, Ready Gate, sprint planning, review of worker evidence, and final acceptance. Claude Sonnet 5.5 workers, defined in `../.claude/agents/`, do the delegated work: `discovery` (read-only scenario discovery and scope reconciliation; proposes items), `developer` (one Ready backlog item at a time, with tests; no governance-doc edits or git writes), and `qa` (independent verification and audits; no code changes). Workers receive focused handoffs, not conversation history; the PM checks their evidence before any status transition. This supersedes the Sol/Luna/Astra allocation in D-P040 and PM_AGENT.md. The owner lifts the 2026-09-28 handoff pause. Gates, scope, UAT hold and open owner questions (Q-017, first-admin bootstrap) are unchanged.

## D-P043 — Claude usage guard at 70%
Status: APPROVED by explicit owner instruction, 2026-09-28

As with Codex, stop running at 70% of either the Claude plan's 5-hour limit or its weekly limit. The PM reads live usage with the desktop app's usage tool (`get_usage`). It checks before every worker dispatch and at every checkpoint, and when a worker returns. If either window is above 70%, dispatch no new work. Let any running worker finish its current step, then record the exact resume point, usage and reset times in PRODUCT_STATE.md, and stop. If usage cannot be read, treat it as unknown, not zero, and do not dispatch substantial work. Never buy credits or consume extra usage. The account has extra usage enabled, and the 70% stop is intended to keep work well clear of it. Resume only when the owner resumes, or after a verified reset brings every window to 70% or below, if the owner has enabled automatic resumption. D-P041 is inactive. The Codex `clinic-usage-guard-and-resume` heartbeat does not apply.

## D-B012 — Historical leave conflicts are non-blocking alerts
Status: APPROVED by explicit owner answer, 2026-09-28 (resolves Q-017)

A committed session that has already started while a recorded leave overlaps it becomes a historical alert. It stays visible and is never silently changed or erased, but it no longer blocks schedule-draft commits or direct scheduling in its pod. The original committed booking and the leave record are both preserved. Future (not yet started) leave conflicts still block commit under SPEC §4 rule 8.

## D-B013 — First admin via one-time local CLI
Status: APPROVED by explicit owner answer, 2026-09-28

The first real admin account is created with a one-time local command-line bootstrap. The password is entered at an interactive prompt and never in command arguments, Git, logs or docs, as ACCESS_SETUP.md proposes. The owner runs the password prompt; agents never handle the real password.

## D-P044 — Automatic resumption after a usage reset
Status: APPROVED by explicit owner answer, 2026-09-28

When work stops only because of the D-P043 70% usage guard, the PM resumes on its own after the limiting window has reset and every window is at or below 70%. To do this, the PM schedules a one-time resume task at the recorded reset time and rechecks live usage on waking. It never resumes past an owner gate, a pending blocking owner question, or an explicit owner pause.

## D-P045 — Architecture review before finishing development
Status: APPROVED by explicit owner answer, 2026-09-28

Review the existing code now. Propose a major structural change only if something is seriously wrong. Otherwise finish development first and do the cleanup pass before UAT.

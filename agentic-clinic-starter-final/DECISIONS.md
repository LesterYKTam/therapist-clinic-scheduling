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

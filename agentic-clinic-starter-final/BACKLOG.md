# Product Backlog — UX-first delivery

Authority: D-P023. Existing IDs and completed work retained.
Status: DISCOVERED / READY / IN_SPRINT / BLOCKED / DONE / REJECTED / ICEBOX
Priority: P0 / P1 / P2 / P3
Discovery class: BLOCKING / ADJACENT / TANGENTIAL

## Delivery order
1. **Now: complete interactive UX prototype** — UX-001–006, S3 candidate with owner-requested calendar revision. Review the entire clinic journey together.
2. **After UX approval: implement the production workflows behind the approved screens** — US-002–008, refined with review findings and resolved business questions. Their existing acceptance criteria still apply.
3. **Preserved baseline and delivery history** — completed S0/S1/S2 items below. S1 is accepted as M1; S2 is implemented, not yet milestone-accepted.

Prototype completion does not complete production stories. Prototype stories below are implemented and awaiting whole-workflow owner review. Production questions remain unresolved except where explicit decisions are recorded.

## Next — Whole-workflow UX prototype

### UX-001
Type: STORY
Title: Establish the complete clinic workspace and schedule journey
Description: Provide the shared navigation, schedule overview, session details, rooms and home-visit views that orient an admin before and after disruption handling.
Source / reason: D-P023; SPEC; US-001/007/008/009/010
Acceptance criteria:
- A connected clickable shell includes schedule, leave/batch review, room inventory and notification worklist destinations.
- Synthetic schedule shows pod context, client, ranked therapists, duration, clinic room or Home; shared rooms start at 15.
- Room management mock states include add, unused-room removal and a booked-room removal block.
- A persistent prototype label identifies simulated behavior; mock actions do not write to the existing SQLite store.
- Consistent navigation permits completing the whole journey without dead-end placeholder buttons.
Priority: P0
Status: DONE
Sprint: S3
Dependencies: Existing specification and approved room/home decisions; no new production backend
Discovery class: ADJACENT
Ready Gate: PASS for prototype only; desktop-first using the current app context.

### UX-002
Type: STORY
Title: Prototype leave reporting and issue triage
Description: Let the admin report a synthetic absence and understand every affected session before deciding changes.
Source / reason: D-P023; US-002/003
Acceptance criteria:
- From schedule, enter one or several therapists and date ranges; submit into a simulated batch.
- Show affected-session count, unresolved count, original therapist/time/location and the cause of each issue.
- Include one-day absence, multi-week/multiple-therapist and no-affected-session sample states.
- Preserve a visible distinction between the committed sample schedule and the proposed batch throughout review.
- Calendar and leave-lifecycle assumptions link to the relevant open questions instead of becoming implicit approved rules.
Priority: P0
Status: DONE
Sprint: S3
Dependencies: UX-001; labelled scenario fixtures for Q-001/004/005/008/009
Discovery class: ADJACENT
Ready Gate: PASS for simulated workflow; production US-002/003 remain blocked.

### UX-003
Type: STORY
Title: Prototype decisions, cascades and conflict recovery
Description: Make the difficult parts of reassignment understandable through a connected issue-review experience.
Source / reason: D-P023; US-004/005/007/008
Acceptance criteria:
- Show original/proposed therapist, time and room/Home with a clear reason for each recommendation. All person names carry a role label.
- Alternative selection lists all conflict-free options within the bounded sample scenario, highlighting the suggested option. Manual path opens the editable draft calendar. Admin can ignore suggestions, add/cancel/reschedule sessions and select assigned therapists; a persistent right-side conflict list updates after each edit. The workspace is the main Calendar (D-P030 supersedes the separate Conflict resolver destination); clicking a conflict opens suggestions, and closing them makes no changes and returns to calendar editing. New conflicts and affected sessions are visible; all outstanding issues block commit (D-B005/D-P027).
- Demonstrate a second-therapist cascade with visible parent/child issues and individual decisions; include weekly-cap relief and a third-therapist fallback without further cascade.
- Demonstrate a shared-room conflict, no-valid-option state and invalid override feedback.
- Changing an earlier decision visibly refreshes or reopens a dependent issue; counts stay consistent.
- Do not imply a general solver exists; alternatives and outcomes are scripted and marked as prototype behavior. Preserve no-room and full-duration treatment of home visits.
Priority: P0
Status: DONE
Sprint: S3
Dependencies: UX-002; labelled scenario assumptions for Q-002/003/006/007
Discovery class: ADJACENT
Ready Gate: PASS for scripted UX states; production resolution rules remain unresolved where recorded.

### UX-004
Type: STORY
Title: Complete and review the whole prototype journey
Description: Finish the batch-to-notification experience and deliver one coherent owner walkthrough, including exceptions and an easy reset.
Source / reason: D-P023; US-006 and whole-workflow review feedback
Acceptance criteria:
- Preview all decisions and affected people before explicit simulated commit; unresolved issues visibly prevent commit.
- Successful simulated commit updates only prototype state and shows client/therapist notification tasks; sends no messages.
- Abandon returns to the unchanged starting sample schedule with no notification tasks.
- Include a scripted room-conflict-at-commit state that preserves the sample schedule and guides the admin back to review.
- Provide deterministic scenario reset and a walkthrough from schedule through leave, issues, decisions, commit/abandon and notifications.
- Owner reviews all UX-001–004 together; document feedback, open assumptions and mappings to production stories. No production story marked Done from prototype evidence.
Priority: P0
Status: DONE
Sprint: S3
Dependencies: UX-001/002/003
Discovery class: ADJACENT
Ready Gate: PASS for simulation; full sprint review required before further production implementation is planned.

## Later — Production workflows behind approved UX

Priority remains P0 for product importance; sequence is after the prototype review, not current implementation authorization. Resolve linked questions and refine against approved screens before each Ready Gate.


### US-002
Type: STORY
Title: Report therapist leave
Status: DONE
Priority: P0
Sprint: S5
Dependencies: US-001
Discovery class: ADJACENT
Source / reason: Initial specification

Description: Admin records whole- or partial-day therapist leave as an independent durable input. Multiple leaves can be registered before any schedule draft begins.

Acceptance criteria: Accept only active pod therapists and valid clinic-local intervals; persist each leave without altering committed sessions; reject invalid/duplicate input; count only session intervals that overlap leave. Repeated leave entries must not duplicate session conflicts. Recording leave must not create an uncommitted schedule draft or prevent other work. D-B009 permits leave amendment/withdrawal after that pod's shared draft is closed; both are blocked while it is open. Ready Gate: PASS for durable leave recording under D-B006/D-B008 and D-P036 calendar policy. Amendment/withdrawal were added during S6 and pass isolated integration checks.

### US-003
Type: STORY
Title: See affected sessions
Status: DONE
Priority: P0
Sprint: S5
Dependencies: US-002
Discovery class: ADJACENT
Source / reason: Initial specification

Description: Admin sees all session instances affected by reported leave.

Acceptance criteria: Show one issue per affected committed session, total unresolved count, original session details and every causal absence; duplicate or overlapping leave reports do not duplicate session issues. A second leave refreshes the outstanding set. Pod view excludes other pods; clinic-wide committed conflict indicator remains nonzero until committed schedule fixes resolve issues. S5 delivers durable read-only issue visibility; draft-specific issue refresh follows in US-005. Ready Gate: PASS after US-002.

### US-015
Type: STORY
Title: Enforce pod-scoped admin access
Description: An admin can manage only their own pod's people, leave, sessions and shared schedule draft, while room collision checks still span all pods.
Source / reason: Owner answers D-B009/D-B010/D-B011; current local DEV uses one trusted administrator context and a freely selectable pod.
Acceptance criteria: Establish server-trusted admin identity and current pod assignment; provide a config page where any admin can change pod membership; require assignment before pod-specific access; reject cross-pod reads and mutations; prevent another pod's client, therapist, leave or draft from appearing in the admin's management views; continue clinic-wide room collision checks while reducing cross-pod overlap messages to anonymous room/time blockers; allow any admin to manage shared room inventory; apply reassignment on subsequent requests without changing committed records or open drafts; verify two-admin cross-pod, reassignment and tampered pod-ID scenarios.
Priority: P0
Status: IN_SPRINT — clinic-managed accounts, protected config page, signed-in scheduling, pod-scoped JSON/PDF/writes/Setup, two-admin and reassignment checks, and production HTTP smoke pass; first-admin bootstrap choice and final interactive acceptance remain
Sprint: Unassigned
Dependencies: D-B010/D-B011; first-account bootstrap answer and production authentication integration.
Discovery class: BLOCKING

### US-004
Type: STORY
Title: View proposed resolution
Status: DONE — S6 bounded preview/review, depth 0/1/2, causal chain, third-rank fallback and unresolved reasons pass isolated checks
Priority: P0
Sprint: 6
Dependencies: US-003
Discovery class: ADJACENT
Source / reason: Initial specification

Description: Propose valid resolutions against current draft decisions using ranked assignments and the specified cascading procedure.

Acceptance criteria: Enforce assigned therapists, pod, leave, non-overlap, and weekly caps; try second with clinic-wide configurable cascade depth 0, 1, or 2 (default 1) before third without cascading; count depth as other sessions displaced in one chain; stop safely and explain when the limit is reached. On explicit Auto resolve, inspect every outstanding issue and propose valid changes only for supported conflict types; list all changed/impacted sessions and unresolved items with reasons. Never alter the committed schedule. Ready Gate: cascade-depth decision resolved by D-B007; remaining leave/edit questions still apply.

### US-005
Type: STORY
Title: Decide and refresh batch issues
Description: Admin accepts a proposal, chooses another valid therapist/time, or cancels; dependent issues refresh or reopen visibly.
Source / reason: SPEC sections 4–6; S0 scenarios C2–C4
Acceptance criteria: Each affected session requires an explicit decision; bumps show causal links; decisions use current draft state; manual edits update conflicts live, and a separate Recheck conflicts control reruns validation against the latest shared state. Auto resolve shows the full proposal before it may be applied to the shared draft. Admin may apply or discard just those suggestions, then continue manual edits on top of applied changes. All outstanding conflicts must be resolved before commit (D-B005); stale dependent decisions reopen; committed schedule remains unchanged.
Priority: P0
Status: IN_SPRINT — manual draft and proposal review implemented; final historical-conflict policy Q-017 pending
Sprint: 6
Dependencies: US-004; Q-017 historical conflict policy; prior Q-001/002/003/006/007/008 decisions tracked in DECISIONS.md
Discovery class: BLOCKING

### US-006
Type: STORY
Title: Commit or abandon a batch
Description: Publish a completely resolved batch through explicit admin commit, or discard its draft changes.
Source / reason: SPEC section 6; S0 scenario C5
Acceptance criteria: Unresolved issues prevent commit; commit revalidates the latest shared room and pod state and publishes all decisions together, creating notification tasks for affected clients and therapists. Discard draft abandons all uncommitted schedule changes, including applied auto-resolve suggestions, but recorded leave remains and its outstanding issues persist (D-B006). Discard suggestions only rejects the current auto-resolve proposal. Failed commit cannot partially publish changes.
Priority: P0
Status: IN_SPRINT — atomic commit/discard and notification tasks implemented; final historical-conflict policy Q-017 pending
Sprint: 6
Dependencies: US-005; Q-017 historical conflict policy; Q-004/005/009 resolved by D-B006/D-B009
Discovery class: BLOCKING

### US-007
Type: STORY
Title: Reserve a room for clinic sessions
Description: A clinic session reserves an appropriate available room for its session interval; home visits do not reserve clinic rooms.
Source / reason: Business Owner direction 2026-09-14, D-B001
Acceptance criteria: Clinic session proposals and committed sessions carry a room reservation; overlapping reservations for the same room are rejected; draft reservations do not mutate committed reservations; home visits require no clinic room. All rooms are interchangeable and shared across pods; reject clinic-wide double bookings at commit.
Priority: P0
Status: DONE — S6 integration tests cover clinic-wide draft collision, atomic rejection, historical room references and future-reserved room protection
Sprint: S6 integration
Dependencies: US-005, US-006 for draft/commit integration; US-009 inventory; room-selection refinement
Discovery class: ADJACENT
Ready Gate: PASS under D-B003/D-B004 and the validated shared draft/commit path. Q-010 resolved.

### US-008
Type: STORY
Title: Represent home visits using admin-booked duration
Description: Admin accounts for commute by booking a longer session. Home visits reserve therapist time but no clinic room.
Source / reason: Business Owner clarification 2026-09-14, D-B002
Acceptance criteria: Distinguish clinic and home locations; use the full admin-entered interval for therapist overlap checks; home visits do not reserve a clinic room; do not calculate travel time or add separate commute fields; preserve draft/commit separation. The full booked duration counts toward weekly hours caps, just like a normal session (D-B003).
Priority: P0
Status: DONE — S6 integration tests cover room-free Home drafts, full-duration weekly caps and duration-aware rescheduling
Sprint: S6 integration
Dependencies: US-005, US-006 for scheduling integration
Discovery class: ADJACENT
Ready Gate: PASS under D-B002/D-B003 and the validated shared draft/commit path. No separate travel calculation planned.

## Preserved — Completed baseline and history

### US-001
Type: STORY
Title: View pod schedule
Status: DONE
Priority: P0
Sprint: S1
Dependencies: None
Discovery class: ADJACENT
Source / reason: Initial specification

Description:
As an admin, I want to view therapists, clients, assignments, and standing sessions in my pod so I can understand the current schedule.

Acceptance criteria:
- Admin can inspect one pod's therapists, weekly caps, clients, ranked assignments, standing sessions, and dated committed sessions.
- Other pods' records are excluded from the selected pod view.
- Each synthetic client has exactly three distinct assigned therapists in the same pod; invalid fixture assignments are rejected with an explanation.
- Standing templates and dated occurrences are visibly distinguishable; session date/time, duration, client, and therapist are shown.
- Inspection does not mutate the committed schedule.
- Deterministic synthetic data and a repeatable demo cover two pods and clients with multiple weekly sessions.

Ready Gate: PASS for read-only synthetic baseline; no operational scheduling or office-hours assumptions required. Approved for S1 on 2026-09-14.

### US-009
Type: STORY
Title: Manage shared clinic room inventory
Description: Admin can change the clinic-wide inventory of interchangeable rooms, initially 15.
Source / reason: Business Owner clarification, D-B003
Acceptance criteria:
- Initial setup provides 15 individually identifiable shared rooms.
- Room inventory can be changed through the system, rather than a hard-coded constant.
- All admins use the same inventory; changes do not create pod-specific duplicate room pools.
- Inventory changes preserve existing committed session bookings; no silent deletion, cancellation, or movement of sessions.
- Removing a room with future committed bookings is rejected with the blocking reservations shown; no session is moved or cancelled (D-B004).
- Adding rooms or removing unused rooms updates the shared inventory and survives application restart.
- Historical reservation references remain readable after a room leaves active inventory; removal checks and updates use the latest shared state.
Priority: P0
Status: DONE
Sprint: S2
Dependencies: US-010 for supplied committed reservation references; Q-013 resolved. Full draft/commit integration stays in US-007.
Discovery class: ADJACENT
Ready Gate: PASS for inventory management against supplied synthetic committed reservations. Operational calendar configuration remains deferred; S2 uses a documented fixed demo clock.

### US-010
Type: STORY
Title: Show clinic rooms and home visits in the baseline schedule
Description: Extend the existing read-only schedule with location and supplied committed room reservations, providing a safe foundation for shared inventory management.
Source / reason: Risk-reducing split from US-007/008 under TASK-003; D-B002–004
Acceptance criteria:
- Clinic sample sessions show a valid shared room; home sample sessions show Home and reserve no room.
- Home visits display the full booked duration with no separate travel fields or calculations.
- Supplied committed reservations reject overlapping use of one room across pods; distinct rooms can host simultaneous sessions.
- Pod schedule views retain client/therapist isolation; shared-room occupancy can show busy intervals without exposing other pods' client details.
- Viewing does not mutate committed sessions; existing ranked-assignment validation still passes.
Priority: P0
Status: DONE
Sprint: S2
Dependencies: US-001 (Done)
Discovery class: ADJACENT
Ready Gate: PASS for supplied synthetic occurrences only. Calendar expansion, reassignment, weekly-cap calculation and editable session workflows remain in existing stories.

### TASK-001
Type: TASK
Title: Run initial scenario discovery and prepare S1
Description: Trace realistic disruption scenarios, refine existing stories, record unresolved rules, and propose a gated first increment.
Source / reason: Approved S0 and prompts/01-discovery-sprint.md
Acceptance criteria: Scenario findings, question links, candidate readiness, demo, risks, and deferred scope recorded; no application implementation.
Priority: P0
Status: DONE
Sprint: S0
Dependencies: None
Discovery class: ADJACENT
Evidence: DISCOVERY_S0.md, OPEN_QUESTIONS.md, SPRINT.md.

### TASK-002
Type: TASK
Title: Repeatable synthetic baseline demo
Description: Provide deterministic fixture loading and documented commands to verify and demonstrate the read-only pod view.
Source / reason: AGENTS sections 16–17; S0 planning
Acceptance criteria: Fresh setup and demo commands documented; only synthetic data used; checks cover pod isolation, valid ranked assignments, template/occurrence distinction, and unchanged schedule after viewing.
Priority: P0
Status: DONE
Sprint: S1
Dependencies: US-001
Discovery class: ADJACENT
Ready Gate: PASS; included as supporting work in candidate S1.

### TASK-003
Type: TASK
Title: Prepare the next sprint after M1
Description: Refine shared-room and home-session scenarios and select ready work for the next owner-approved sprint.
Source / reason: M1 acceptance; US-007/008 and D-B002
Acceptance criteria: Deduplicated scenario findings, explicit unresolved questions, Ready Gate results, dependencies, demo scenarios, risks and a concrete sprint proposal recorded; owner approval obtained before implementation.
Priority: P0
Status: DONE
Sprint: Planning only; no implementation sprint
Dependencies: US-007/008/009 refinement; Q-013
Discovery class: ADJACENT

### PROCESS-001
Type: PROCESS
Title: Post sprint stage start announcements
Description: Post each stage start using the exact owner-requested banner format; no stage-end announcements.
Source / reason: Explicit owner request during Sprint 2
Acceptance criteria: Preference recorded in PM charter; subsequent starts use "======     [YYYY-MM-DD HH:mm America/Toronto] Sprint 2 Implementation started     ======" with the applicable sprint and stage; text only is sufficient; no stage-end posts.
Priority: P1
Status: DONE
Sprint: S2 communication only; no product scope change
Dependencies: None
Discovery class: ADJACENT

## Planning and process

### TASK-004
Type: TASK
Title: Reorganize delivery around whole-workflow UX review
Description: Reorder the backlog, preserve existing work and traceability, and propose one complete prototype sprint before production logic resumes.
Source / reason: Explicit owner request; D-P023
Acceptance criteria: Existing IDs/status evidence retained; prototype stories separated from production; connected demo and review gate defined; sprint/product state and questions updated; continue-versus-rollback recommendation recorded.
Priority: P0
Status: DONE
Sprint: Planning only
Dependencies: None
Discovery class: ADJACENT
Evidence: BACKLOG.md, SPRINT_3_PROPOSAL.md, PRODUCT_STATE.md, D-P023.

### UX-005
Type: STORY
Title: Prototype normal weekly schedule setup in a calendar
Description: Provide the everyday workflow of adding a weekly session for an existing synthetic client, alongside leave handling.
Source / reason: Explicit owner feedback; D-P026
Acceptance criteria: Calendar is the main schedule view; admin can select existing client, assigned therapist, day/time/duration, clinic room or Home, see validation and preview, and explicitly save into prototype state. Distinguish weekly standing commitment from its sample dated occurrence. Label each person's role. No writes to existing app data. Mark sample recurrence horizon and Q-015 assumptions.
Priority: P0
Status: DONE
Sprint: S3, owner-amended scope
Dependencies: UX-001
Discovery class: ADJACENT


### BUG-001
Type: BUG
Title: Non-save controls inside calendar form submit accidentally
Description: Browser verification found Cancel session also submitted its parent form, replacing its confirmation dialog.
Source / reason: UX-003 calendar revision browser walkthrough
Acceptance criteria: Generic action buttons explicitly use type=button; only explicit submit controls save forms; calendar cancellation dialog remains visible until confirmed.
Priority: P0
Status: DONE
Sprint: S3
Dependencies: UX-003
Discovery class: BLOCKING


### BUG-002
Type: BUG
Title: Historical room reservation blocks inventory deactivation
Description: Setup currently treats a past room reservation as a future blocker, although D-B004 permits removing a room once no future committed booking uses it. Historical reservation references must stay readable.
Source / reason: S6 integration review against D-B004 and US-009
Acceptance criteria: An inactive room remains referenced by historical sessions/reports; deactivation is rejected with booking details when a future committed session reserves it; no session is moved or cancelled.
Priority: P0
Status: DONE — isolated TEST preserves a historical room reference and blocks future-reserved room deactivation
Sprint: S6 integration
Dependencies: US-009; D-B004
Discovery class: BLOCKING

### BUG-003
Type: BUG
Title: Weekly-cap cascade could move an already-started session
Description: A future leave resolution can exceed a therapist's weekly cap because of an earlier session in the same week. The cascade must not reassign that historical session to make room.
Source / reason: S6 bounded solver review after historical-conflict browser acceptance
Acceptance criteria: Auto resolve considers only not-yet-started sessions as displacement targets; a historical session remains unchanged when it is the only possible weekly-cap relief; isolated regression and production build pass.
Priority: P0
Status: DONE — historical displacement is filtered and defended in the search; isolated TEST 32/32 and production build pass
Sprint: S6 integration
Dependencies: US-004; historical sessions remain view-only
Discovery class: BLOCKING

### BUG-004
Type: BUG
Title: Old shared draft could commit after a session starts
Description: A future session can become historical while its draft remains open. Commit must recheck time before applying any staged addition, assignment, cancellation, or reschedule.
Source / reason: S6 lifecycle review after BUG-003
Acceptance criteria: The atomic commit rejects a draft touching a session that has started or moving one into the past; failed commit preserves the committed schedule and shared draft for correction; isolated regression and production build pass.
Priority: P0
Status: DONE — commit-time guard rejects the stale temporal change; isolated TEST 33/33 and production build pass
Sprint: S6 integration
Dependencies: US-005/006; historical sessions remain view-only
Discovery class: BLOCKING

### BUG-005
Type: BUG
Title: Direct booking API accepted sessions starting in the past
Description: Historical committed records must remain readable, but new direct one-off and weekly requests must not create historical bookings through either preview or commit.
Source / reason: S6 server boundary review after BUG-004
Acceptance criteria: Preview and atomic commit reject past start times for direct one-off and weekly creation; rejection leaves the schedule/revision untouched; historical records remain readable; isolated regression and production build pass.
Priority: P0
Status: DONE — direct creation guards added; isolated TEST 34/34 and production build pass
Sprint: S6 integration
Dependencies: US-012; historical session lifecycle
Discovery class: BLOCKING

### BUG-006
Type: BUG
Title: Notification worklist omitted the session people
Description: A therapist notification task showed its recipient and time but not which client's appointment changed, making follow-up ambiguous for admins.
Source / reason: S6 notification worklist review
Acceptance criteria: Each before/after booking line identifies the client and therapist with role labels alongside date, time, duration and location; existing pending/handled behavior remains unchanged; production build passes.
Priority: P1
Status: DONE — both roles appear in each booking detail; production build passes
Sprint: S6 integration
Dependencies: US-006 notification tasks
Discovery class: ADJACENT

### BUG-007
Type: BUG
Title: Reports selector hid inactive therapists
Description: The committed monthly report service supports former/inactive therapists, but the page offered only active staff, hiding historical schedules after deactivation.
Source / reason: S6 report lifecycle review
Acceptance criteria: Staff monthly report selector includes active and inactive therapists, marks inactive options clearly, and keeps committed-only report behavior; production build passes.
Priority: P1
Status: DONE — inactive therapist options are available and labelled; production build passes
Sprint: S6 integration
Dependencies: US-014 report page; staff lifecycle
Discovery class: ADJACENT

### BUG-008
Type: BUG
Title: Conflict badge counted another pod's issues
Description: A clinic-wide badge could show a warning while the selected pod's Calendar conflict list was empty, making the alert appear broken and exposing another pod's issue count in the local UI.
Source / reason: S6 pod-scoped Calendar browser acceptance
Acceptance criteria: The badge, sidebar pod label and Calendar conflict list track the same selected pod; a zero-issue pod shows the green No conflicts state even when another pod has an issue; no claim of server-side production access enforcement is made.
Priority: P1
Status: DONE — controlled pod selection keeps badge and list in sync; browser verified Maple warning, Cedar green, then restored Maple; production build passes
Sprint: S6 integration
Dependencies: US-003; Q-016 remains for trusted production identity
Discovery class: ADJACENT

### BUG-009
Type: BUG
Title: Direct edit could transfer a booking across pods
Description: A direct edit identified the original booking's pod for draft/conflict checks but could replace its client and therapist with another pod's people. That could alter the destination pod's committed schedule despite an open destination draft.
Source / reason: S6 server-side pod-boundary audit
Acceptance criteria: Existing booking edits reject a client in another pod in preview and atomic commit; same-pod edits remain supported; rejection preserves both the original booking and the destination pod's draft; isolated regression and production build pass.
Priority: P0
Status: DONE — server rejects cross-pod booking transfers; isolated TEST 36/36 and production build pass
Sprint: S6 integration
Dependencies: US-005/006; Q-016 remains for trusted admin identity
Discovery class: BLOCKING

### BUG-010
Type: BUG
Title: Timezone change could reinterpret open schedule drafts
Description: The clinic timezone applies to every appointment, but Setup allowed it to change while another pod had an unfinished draft. That could change the real instants represented by its staged wall-clock times before commit.
Source / reason: S6 shared-state integrity review
Acceptance criteria: Reject clinic timezone changes while any pod has a shared draft; leave the revision, timezone and draft unchanged; preserve existing Setup behavior for unrelated settings; isolated regression and production build pass.
Priority: P0
Status: DONE — transactional Setup guard added; isolated TEST 37/37 and production build pass
Sprint: S6 integration
Dependencies: US-005/006 shared draft; clinic-wide timezone setting
Discovery class: BLOCKING

### BUG-011
Type: BUG
Title: New leave could be recorded during a shared pod draft
Description: A second admin could record new therapist leave in a pod while that pod had unfinished schedule changes, changing the underlying conflict set during draft editing.
Source / reason: US-015 authenticated multi-admin workflow audit; owner rule that an open schedule draft permits only schedule editing, commit or discard
Acceptance criteria: Transactionally reject new leave for the affected pod while its shared draft exists; preserve the prior leave and draft; keep other pods independent; isolated PostgreSQL regression and production build pass.
Priority: P0
Status: DONE — record-leave now checks the pod draft inside its transaction; isolated regression passes
Sprint: S6 access integration
Dependencies: US-002, US-005, US-015
Discovery class: BLOCKING

### PROCESS-002
Type: PROCESS
Title: Use lower-cost agents for routine delivery
Description: Apply the owner's cost preference through focused delegation while preserving PM accountability and existing gates.
Source / reason: Explicit owner request; D-P029
Acceptance criteria: Policy recorded; routine implementation/verification delegated to suitable lower-cost models with bounded context; parent-model status represented accurately; no billing/settings change claimed.
Priority: P1
Status: DONE
Sprint: S3 process preference
Dependencies: None
Discovery class: ADJACENT
Evidence: PM_AGENT.md; Terra worker resolver_verify assigned D-P028 verification.

### UX-006
Type: CHANGE
Title: Merge conflict resolution into the main calendar
Description: Use one Calendar for everyday scheduling and draft conflict resolution, reachable through a global conflict-count alert.
Source / reason: Explicit owner feedback; D-P030
Acceptance criteria:
- Main Calendar contains the existing draft editing and conflict-resolution experience; no separate Conflict resolver destination remains.
- Top-level alert icon includes an accessible outstanding issue count and opens Calendar with conflict items on the right.
- Conflict items open suggestions; closing preserves draft; applying updates calendar and count.
- Calendar editing updates conflicts live; navigation preserves draft state; commit remains blocked until all issues resolved.
- Normal calendar/setup, preview/commit, abandon and empty state remain usable; committed versus draft is clearly indicated.
Priority: P0
Status: DONE
Sprint: S3 owner-amended UX revision
Dependencies: UX-001, UX-003, UX-005
Discovery class: ADJACENT
Ready Gate: PASS; demo conflict alert from another page, popup close/apply, manual edits and commit/abandon.



### UX-007
Type: CHANGE
Title: Schedule status and Calendar-owned session creation
Description: Enlarge conflict indicator and consolidate session creation in Calendar.
Source / reason: Owner feedback; D-P031
Acceptance criteria: Nonzero indicator says Schedule conflicts and shows count; zero remains visible green No conflicts; accessible button opens Calendar. Remove Set up schedule navigation; Add session from Calendar retains existing weekly capability and preview/save, without bypassing active draft safeguards.
Priority: P0
Status: DONE
Sprint: S3 owner-amended
Dependencies: UX-005/006
Discovery class: ADJACENT

### UX-008
Type: CHANGE
Title: Infrequent clinic Setup workspace
Description: Group room inventory, staff, clients and staff maximum hours under Setup.
Source / reason: Owner feedback; D-P031
Acceptance criteria: Setup navigation/icon with Rooms, Staff, Clients sections; existing room behavior retained; synthetic staff/client management and max-hours configuration are reviewable with role labels and clear prototype scope. No production store changes or silent schedule mutation; unknown production management rules deferred.
Priority: P0
Status: DONE
Sprint: S3 owner-amended
Dependencies: UX-001/007
Discovery class: ADJACENT

### UX-009
Type: CHANGE
Title: Generate staff monthly schedule reports
Description: Reports page lets admin select staff and month and generate a shareable schedule report.
Source / reason: Owner clarification; D-P032
Acceptance criteria: Staff/month selection supports October and other months; generated preview contains role-labelled staff, period, dated sessions/times/durations/location and totals from committed synthetic schedule; clear empty result; print/save-to-PDF presentation omits app controls. No messages sent; draft changes excluded and scope labelled.
Priority: P1
Status: DONE
Sprint: S3 owner-amended
Dependencies: UX-001; committed sample schedule
Discovery class: ADJACENT

### PROCESS-003
Type: PROCESS
Title: Provide candid PM recommendations
Description: Raise disagreements and better alternatives with concrete tradeoffs.
Source / reason: Explicit owner request; D-P033
Acceptance criteria: Preference recorded in PM charter and applied during design discussion.
Priority: P1
Status: DONE
Sprint: S3 communication preference
Dependencies: None
Discovery class: ADJACENT


### TASK-005
Type: TASK
Title: Prepare operational development after UX acceptance
Description: Map approved UX to production work, identify minimum blocking business decisions and prepare a concrete development sprint.
Source / reason: Owner acceptance and development direction; D-P035
Acceptance criteria: M2 checkpoint recorded; ready first development slice and dependencies proposed; remaining rules explicitly unresolved; Terra handles bounded planning; PM owns status and gate.
Priority: P0
Status: DONE
Sprint: Development planning
Dependencies: UX-001–009 accepted; scope-specific rule answers
Discovery class: ADJACENT

## S4 approved development scope — D-P037

### US-011
Type: STORY  
Title: Persist configurable clinic setup  
Description: Save timezone, working days/hours, week start, rooms, therapists, clients, ranked in-pod assignments and weekly caps.  
Source / reason: D-P036; accepted Setup UX.  
Acceptance criteria: Configuration and active records survive restart; each client has exactly three distinct ranked in-pod therapists; invalid identity/assignment/cap data is rejected; a change that invalidates committed bookings is blocked and lists blockers, approved under D-P037.  
Priority: P0  
Status: DONE  
Sprint: S4  
Dependencies: Lifecycle decision; migration plan  
Discovery class: ADJACENT

### US-012
Type: STORY  
Title: Commit one-off normal sessions  
Description: Preview then atomically save a one-off Clinic/room or Home session.  
Source / reason: D-P035/D-P036; Calendar UX.  
Acceptance criteria: Committed records survive reload; transaction-time shared validation rejects invalid setup, client/therapist/room conflicts, outside-hours and weekly-cap breaches; Home reserves no room and full duration counts; no leave, draft or solver side effect occurs.  
Priority: P0  
Status: DONE  
Sprint: S4  
Dependencies: US-011; TASK-006  
Discovery class: ADJACENT

### US-013
Type: STORY  
Title: Commit bounded weekly session series  
Description: Materialize and maintain weekly committed occurrences using D-P036 defaults.  
Source / reason: D-P034/D-P036.  
Acceptance criteria: Required editable end date defaults to 12 weeks; all occurrences validate and save atomically; past occurrences stay unchanged; occurrence-only and this-and-future updates are atomic and reject conflicts; configured working days apply with no automatic holiday calendar.  
Priority: P0  
Status: DONE  
Sprint: S4  
Dependencies: US-011/012 persistence and conflict tests; TASK-006; lifecycle decision  
Discovery class: ADJACENT

### US-014
Type: STORY  
Title: Generate committed staff monthly reports  
Description: Produce a readable staff/month schedule from committed sessions.  
Source / reason: D-P032/D-P034.  
Acceptance criteria: Report lists local ordered committed sessions, duration, location/room and monthly total; empty months are explicit; newly committed one-offs and series occurrences appear after reload; printable/saveable layout is verified.  
Priority: P1  
Status: DONE  
Sprint: S4  
Dependencies: US-012; US-013 for recurrence content; TASK-006  
Discovery class: ADJACENT

### TASK-006
Type: TASK  
Title: Define shared calendar policy and verification fixtures  
Description: Implement one configurable local calendar/time calculation boundary and deterministic fixtures used by normal booking and reporting.  
Source / reason: D-P036.  
Acceptance criteria: Timezone, office hours, week start, overlap, date grouping, cap calculation and DST use one policy; tests cover configured defaults and transaction/stale-write behavior; migration/rollback is reviewable.  
Priority: P0  
Status: DONE  
Sprint: S4  
Dependencies: US-011 configuration  
Discovery class: ADJACENT

### TASK-010
Type: TASK
Title: Persist the clinic-wide automatic cascade limit
Description: Add the owner-approved 0/1/2 cascade depth setting with default 1 to Setup and the PostgreSQL scheduling policy without changing the resolver yet.
Source / reason: D-B007; prerequisite for US-004 Auto resolve
Acceptance criteria: Existing saved clinic state reads with depth 1; Setup offers exactly 0, 1 or 2; the selected value persists across reload; invalid values are rejected server-side; changing this setting does not mutate committed sessions or recorded leave. The resolver must read the saved value when implemented.
Priority: P0
Status: DONE
Sprint: S6
Dependencies: US-011 Setup persistence; D-B007
Discovery class: ADJACENT



### PROCESS-004
Type: PROCESS
Title: Four-phase delivery and usage auto-resume
Description: Replace per-sprint phase3 stops with owner-approved milestone workflow and periodic usage guard.
Source / reason: Explicit owner request; D-P038
Acceptance criteria: Governance and resume state updated; heartbeat configured; approval gates preserved; no automatic development before infrastructure approval.
Priority: P0
Status: DONE
Sprint: Workflow transition
Dependencies: None
Discovery class: ADJACENT

### TASK-007
Type: TASK
Title: Agree infrastructure and structure with owner
Description: Review stack, architecture, dev/test sites, CI, deployment/cost, data migration and rollback before resuming development.
Source / reason: D-P038 phase2
Acceptance criteria: Concrete options/tradeoffs discussed; owner-approved plan and verified foundation; approved full development scope and important open rules recorded.
Priority: P0
Status: READY
Sprint: Infrastructure milestone
Dependencies: Approved UI M2
Discovery class: ADJACENT

### TASK-008
Type: TASK
Title: Local-only environment configuration folder
Description: Create ignored credential/configuration placeholders and document environment readiness gates.
Source / reason: Explicit owner request during infrastructure discussion
Acceptance criteria: Folder exists; Git ignores files inside it; no credentials committed; DEV/test/UAT readiness and secret loading expectations documented.
Priority: P0
Status: DONE
Sprint: Infrastructure milestone
Dependencies: TASK-007
Discovery class: ADJACENT


### TASK-009
Type: TASK
Title: Establish local PostgreSQL DEV site
Description: Set up repeatable local Next.js/TypeScript app foundation with PostgreSQL and isolated tests, preserving existing work.
Source / reason: Explicit owner request; D-I005
Acceptance criteria: App starts and loads locally; actual PostgreSQL connection verified; isolated test database verified; secrets remain ignored; reproducible startup/shutdown and environment docs; no UAT provisioning or business logic expansion.
Priority: P0
Status: DONE
Sprint: Infrastructure milestone
Dependencies: Local Docker/runtime availability
Discovery class: ADJACENT




### PROCESS-005
Type: PROCESS
Title: Update model choices and resume approved development
Description: Replace the prior Terra-first allocation with Sol for Main PM and substantial work, Luna for bounded chores, and Astra for exceptional work; resume S4 verification under existing usage and scope gates.
Source / reason: Explicit owner request; D-P040
Acceptance criteria: Decision and operating documents updated; paused guard reactivated with owner pause removed; S4 verification resumes from saved point without UAT provisioning or duplicate work.
Priority: P1
Status: DONE
Sprint: S4 process
Dependencies: D-P039; saved S4 checkpoint
Discovery class: ADJACENT

### PROCESS-006
Type: PROCESS
Title: Claude agent team takeover and usage-guard replacement
Description: Replace the Codex Sol/Luna/Astra allocation with Claude Opus 5.5 as Main PM and Sonnet 5.5 discovery/developer/qa subagents. Replace the Codex usage meter and heartbeat, which Claude cannot read, with bounded increments and checkpointed resume points.
Source / reason: Explicit owner request, 2026-09-28; D-P042
Acceptance criteria: Agent definitions exist in `../.claude/agents/`; D-P042, PM_AGENT.md and PRODUCT_STATE.md record the structure; owner confirms or amends the usage-guard replacement before AGENTS.md §20 / WORKFLOW.md are edited.
Priority: P1
Status: DONE (owner set the 70% usage stop, D-P043)
Sprint: Takeover
Dependencies: D-P042
Discovery class: ADJACENT

## S7 — Takeover fixes and approved changes (Claude team, 2026-09-28)
The order below is the planned delivery order. The PM verifies each item and QA checks it independently before it is marked DONE.

### BUG-012
Type: BUG
Title: Scheduling engine is quadratic and unusable at clinic scale
Description: validateState and draftIssues compare every session with every other session across the clinic. podView computes workable options for every pod session on every request, and the resolver recomputes full validation inside nested loops. Measured: 720 sessions take about 1 s per validation (reproduced by the PM). 2,400 sessions take about 11 s per validation. At 2,400 sessions Auto resolve does not finish within 10 minutes, and a 360-session page load took about 55 s. All of this runs while the write lock is held on the whole clinic.
Source / reason: QA structural review, 2026-09-28; owner question D-P045
Acceptance criteria: Business behaviour unchanged, with every existing test passing unmodified. Overlap checks use per-therapist, per-client and per-room sorted buckets (or an equivalent), not all-pairs comparison. Validation checks future sessions plus touched ones; history cannot create new violations. Workable options are computed only for issue sessions, on demand. A repeatable scale test with 5 pods, 30 therapists, 100 clients, 15 rooms, 2,400 future sessions and one year of history meets: page state build under 1 s, full validation under 500 ms, and Auto resolve for a two-week leave affecting about 12 sessions under 5 s.
Priority: P0
Status: DONE (2026-09-29). All 43 web tests pass, including the new scale test, and the build passes. QA's independent differential over about 1,100 randomised cases found no behaviour change. At 2,400 sessions, validation takes about 35 ms and Auto resolve about 16 ms; at 12,800 sessions the page build takes about 39 ms. PM amendment: history is still validated, because it costs about 100 ms and preserves the existing past-overlap rule.
Sprint: S7
Dependencies: none
Discovery class: BLOCKING

### CHANGE-001
Type: CHANGE
Title: Historical leave conflicts become non-blocking alerts (D-B012)
Description: Started sessions overlapping recorded leave stay visible as historical alerts but do not block draft commits or direct scheduling.
Source / reason: D-B012 (Q-017)
Acceptance criteria: A historical overlap is shown as a distinct alert and does not count toward the blocking conflict total. Draft commit and direct commit succeed while only historical alerts remain. The booking and the leave record are unchanged. Future leave conflicts still block commit. Regression tests cover both the draft and the direct path.
Priority: P0
Status: DONE (2026-09-29). 47/47 tests and the build pass. QA code review and a DEV browser check passed: the Sep 23 conflict shows as a historical alert and the badge shows no conflicts.
Sprint: S7
Dependencies: BUG-012
Discovery class: BLOCKING

### CHANGE-002
Type: CHANGE
Title: Allow recording new leave during an open pod draft (D-B015)
Description: Reverse the BUG-011 block on new leave. Edits and withdrawals of existing leave stay blocked.
Source / reason: D-B015
Acceptance criteria: New leave saves while the pod draft exists. The draft's issue list includes the new conflicts. A pending Auto resolve proposal becomes stale and cannot be applied. Amending or withdrawing leave is still rejected during a draft. The BUG-011 test is updated to the approved rule.
Priority: P1
Status: DONE (2026-09-29). 51/51 tests and the build pass. QA reviewed the code and checked it in the DEV browser: new leave saves during a draft, amend and withdraw stay blocked, and DEV was restored afterwards.
Sprint: S7
Dependencies: BUG-012
Discovery class: BLOCKING

### BUG-013
Type: BUG
Title: A staged change for a now-started session can never be removed
Description: Once a staged session's start time passes, commit tells the admin to remove that change, but no action exists to remove it, and staging rejects past sessions. The only exit is discarding the whole draft.
Source / reason: Discovery scenario (b), confirmed by the PM at clinic-store.mjs stageDraftChange and commitDraft
Acceptance criteria: The admin can remove or revert any single staged change, including one whose session has started. After that, commit succeeds if no other issue remains. Other staged changes are preserved. Covered by a regression test.
Priority: P0
Status: DONE (2026-09-29). The Remove change action has pod checks. QA verified it in the browser, and the other staged changes and committed data are untouched.
Sprint: S7
Dependencies: BUG-012
Discovery class: BLOCKING

### BUG-014
Type: BUG
Title: Auto resolve proposal goes stale on unrelated writes and cannot be re-run
Description: Proposal staleness compares the clinic-wide revision, so any write anywhere invalidates the proposal, even marking a notification handled in another pod. The draft then allows no second Auto resolve run.
Source / reason: Discovery G6
Acceptance criteria: Only inputs relevant to the pod's proposal make it stale: that pod's sessions, leave, people or draft, or clinic-wide rooms and config. After a relevant change invalidates the proposal, the admin can run Auto resolve again within the same draft. Covered by tests.
Priority: P1
Status: DONE (2026-09-29). Staleness now uses a per-pod input fingerprint, and Auto resolve can re-run after a relevant input changes. QA confirmed the fingerprint is complete.
Sprint: S7
Dependencies: BUG-012
Discovery class: ADJACENT

### US-016
Type: STORY
Title: Auto resolve sessions held by a 2nd- or 3rd-ranked therapist (D-B014)
Description: Extend the resolver to leave-affected sessions whose holder is not the client's major therapist.
Source / reason: D-B014; Discovery G1
Acceptance criteria: The resolver tries the client's remaining ranked therapists in rank order, excluding the therapist on leave, under the same validity checks. The cascade applies only on the second-choice path, and the final fallback does not cascade. Stop reasons are explained. Tests cover a session held by the 2nd therapist and one held by the 3rd.
Priority: P1
Status: READY
Sprint: S7
Dependencies: BUG-012
Discovery class: BLOCKING

### CHANGE-003
Type: CHANGE
Title: Deterministic choice of which session to move to free a capped therapist (D-B017)
Description: Cap-relief displacement currently chooses by id order, which is effectively random.
Source / reason: D-B017; Discovery S2
Acceptance criteria: Prefer the candidate whose own relocation needs the fewest further displacements; break ties by the latest in the week. Results are deterministic across runs. Covered by a test.
Priority: P2
Status: READY
Sprint: S7
Dependencies: BUG-012, US-016
Discovery class: ADJACENT

### BUG-015
Type: BUG
Title: Authenticated users see only generic action errors
Description: In authenticated mode every POST failure is flattened to "Unable to complete this clinic action", so admins never learn about a room clash, a stale change or a past session. Demo mode shows the real messages.
Source / reason: QA review D4
Acceptance criteria: Business-rule validation messages reach the authenticated user. Internal or unexpected errors stay generic and are logged on the server. No data from other pods leaks through a message. Covered by tests.
Priority: P1
Status: READY
Sprint: S7
Dependencies: none
Discovery class: ADJACENT

### BUG-016
Type: BUG
Title: Demo mode has no production guard
Description: CLINIC_DEMO_MODE=1 bypasses authentication and returns the whole clinic. Nothing prevents it from being set in a production build.
Source / reason: QA review D3
Acceptance criteria: The app refuses to serve when NODE_ENV is production and demo mode is set, or demo mode is otherwise impossible outside local DEV/TEST. Documented. Covered by a test.
Priority: P1
Status: READY
Sprint: S7
Dependencies: none
Discovery class: ADJACENT

### CHANGE-004
Type: CHANGE
Title: Group notification tasks per person (D-B016)
Description: A commit creates one notification task per affected person, listing all of that person's changes.
Source / reason: D-B016
Acceptance criteria: One task per person per commit, containing before and after details for each affected session. Marking the task handled covers all its sessions. Existing tasks remain readable.
Priority: P2
Status: READY
Sprint: S7
Dependencies: BUG-012
Discovery class: ADJACENT

### TASK-011
Type: TASK
Title: Missing rule tests
Description: Add web tests for SPEC rule 1 (assigned therapists only), rule 6 (same pod), no client double-booking, office-hours limits, and the committed conflict indicator staying truthful during a draft (D-B008).
Source / reason: Discovery R1, R6, R9, D2
Acceptance criteria: Each rule has a web/test regression. All tests pass.
Priority: P2
Status: READY
Sprint: S7
Dependencies: none
Discovery class: ADJACENT

### DEBT-001
Type: DEBT
Title: Cleanup pass before UAT
Description: Items to clean up before UAT:
- A pg Pool is created per request, and migrate runs on every read.
- The .mjs modules are untyped (@ts-expect-error).
- The single 48 KB UI file.
- The dead legacy root code and the broken root npm start.
- Stale docs.
- The storage-model review: single jsonb row versus tables.
Source / reason: QA structural review; Discovery DOC1/DOC2; D-P045
Acceptance criteria: Planned as a separate owner-approved sprint after M3 review and before UAT.
Priority: P2
Status: BACKLOG
Sprint: post-M3
Dependencies: M3 review
Discovery class: ADJACENT

### BUG-017
Type: BUG
Title: Pod view redaction matches id substrings, not whole ids
Description: podView masks other pods' session ids and names inside text by substring match. A short foreign id (for example "s1") can also mask part of an own-pod id or text (for example "s10808"). Real ids are UUID-based, so production collisions are unlikely, but seed and demo ids are short. The pre-existing behaviour was kept unchanged by the BUG-012 rewrite.
Source / reason: Developer note during BUG-012
Acceptance criteria: Redaction matches whole id and name tokens only. Own-pod text and ids are never altered. Foreign ids and names are still masked. Covered by a test that uses short, colliding ids.
Priority: P3
Status: READY
Sprint: S7
Dependencies: BUG-012
Discovery class: TANGENTIAL

### BUG-018
Type: BUG
Title: Draft-added sessions get no server-computed options
Description: podView builds workableOptions only from committed pod sessions. A draft-added session whose issue is a room overlap with another pod's booking gets no served options, so the browser falls back to computing from the pod-only view. That view cannot see the other pod's booking, so it offers therapists who cannot clear the room clash. The flaw predates the BUG-012 rewrite and is not a regression.
Source / reason: QA verification of BUG-012 (repro: pod a draft-adds a session in room-1 overlapping pod b's booking)
Acceptance criteria: Served options cover every issue session in the pod's draft, including draft-added ones. Options for such a session match a full-state computation. Covered by a test.
Priority: P2
Status: READY
Sprint: S7
Dependencies: BUG-012
Discovery class: ADJACENT

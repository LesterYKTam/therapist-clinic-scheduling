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
Status: BLOCKED
Priority: P0
Sprint: Unassigned
Dependencies: US-001
Discovery class: ADJACENT
Source / reason: Initial specification

Description: Admin reports one or more therapist leave ranges in a batch belonging to their pod.

Acceptance criteria: Accept only pod therapists and valid date ranges; create one pod-owned draft batch; enumerate affected dated sessions; preserve the committed schedule. Ready Gate: BLOCKED by Q-001, Q-004, Q-005, Q-008, Q-009.

### US-003
Type: STORY
Title: See affected sessions
Status: BLOCKED
Priority: P0
Sprint: Unassigned
Dependencies: US-002
Discovery class: ADJACENT
Source / reason: Initial specification

Description: Admin sees all session instances affected by reported leave.

Acceptance criteria: Show one issue per affected session, total unresolved count, original session details, and causal absence; duplicate or overlapping leave reports do not duplicate session issues; exclude other pods. Ready Gate: BLOCKED by US-002 and its calendar/leave questions.

### US-004
Type: STORY
Title: View proposed resolution
Status: BLOCKED
Priority: P0
Sprint: Unassigned
Dependencies: US-003
Discovery class: ADJACENT
Source / reason: Initial specification

Description: Propose valid resolutions against current draft decisions using ranked assignments and the specified cascading procedure.

Acceptance criteria: Enforce assigned therapists, pod, leave, non-overlap, and weekly caps; try second with permitted cascading before third without cascading; expose each bump and cause; explain unavailable options; never apply proposals to the committed schedule. Ready Gate: BLOCKED by Q-001, Q-006, Q-007, Q-008.

### US-005
Type: STORY
Title: Decide and refresh batch issues
Description: Admin accepts a proposal, chooses another valid therapist/time, or cancels; dependent issues refresh or reopen visibly.
Source / reason: SPEC sections 4–6; S0 scenarios C2–C4
Acceptance criteria: Each affected session requires an explicit decision; bumps show causal links; decisions use current draft state; invalid overrides are rejected; stale dependent decisions reopen; committed schedule remains unchanged.
Priority: P0
Status: BLOCKED
Sprint: Unassigned
Dependencies: US-004; Q-001, Q-002, Q-003, Q-006, Q-007, Q-008
Discovery class: BLOCKING

### US-006
Type: STORY
Title: Commit or abandon a batch
Description: Publish a completely resolved batch through explicit admin commit, or discard its draft changes.
Source / reason: SPEC section 6; S0 scenario C5
Acceptance criteria: Unresolved issues prevent commit; commit publishes all decisions together and creates notification tasks for affected clients and therapists; abandon leaves schedule unchanged and creates no notifications; failed commit cannot partially publish changes.
Priority: P0
Status: BLOCKED
Sprint: Unassigned
Dependencies: US-005; Q-004, Q-005, Q-009
Discovery class: BLOCKING

### US-007
Type: STORY
Title: Reserve a room for clinic sessions
Description: A clinic session reserves an appropriate available room for its session interval; home visits do not reserve clinic rooms.
Source / reason: Business Owner direction 2026-09-14, D-B001
Acceptance criteria: Clinic session proposals and committed sessions carry a room reservation; overlapping reservations for the same room are rejected; draft reservations do not mutate committed reservations; home visits require no clinic room. All rooms are interchangeable and shared across pods; reject clinic-wide double bookings at commit.
Priority: P0
Status: BLOCKED
Sprint: Unassigned
Dependencies: US-005, US-006 for draft/commit integration; US-009 inventory; room-selection refinement
Discovery class: ADJACENT
Ready Gate: Initial inventory confirmed as 15 configurable rooms (D-B003); room-selection and concurrency scenarios still need refinement. Q-010 resolved.

### US-008
Type: STORY
Title: Represent home visits using admin-booked duration
Description: Admin accounts for commute by booking a longer session. Home visits reserve therapist time but no clinic room.
Source / reason: Business Owner clarification 2026-09-14, D-B002
Acceptance criteria: Distinguish clinic and home locations; use the full admin-entered interval for therapist overlap checks; home visits do not reserve a clinic room; do not calculate travel time or add separate commute fields; preserve draft/commit separation. The full booked duration counts toward weekly hours caps, just like a normal session (D-B003).
Priority: P0
Status: BLOCKED
Sprint: Unassigned
Dependencies: US-005, US-006 for scheduling integration
Discovery class: ADJACENT
Ready Gate: Business duration rule resolved; blocked by scheduling-integration dependencies. No separate travel calculation planned.

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
Status: IN_SPRINT
Sprint: Development planning
Dependencies: UX-001–009 accepted; scope-specific rule answers
Discovery class: ADJACENT

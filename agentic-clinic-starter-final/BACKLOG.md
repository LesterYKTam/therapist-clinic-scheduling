# Product Backlog

## Status
DISCOVERED / READY / IN_SPRINT / BLOCKED / DONE / REJECTED / ICEBOX

## Priority
P0 / P1 / P2 / P3

## Discovery class
BLOCKING / ADJACENT / TANGENTIAL

---

## EPIC-001 — Clinic / Pod Baseline

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

---

## EPIC-002 — Leave & Batch Creation

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

---

## EPIC-003 — Issue Review

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

---

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



### US-007
Type: STORY
Title: Reserve a room for clinic sessions
Description: A clinic session reserves an appropriate available room for its session interval; home visits do not reserve clinic rooms.
Source / reason: Business Owner direction 2026-09-14, D-B001
Acceptance criteria: Clinic session proposals and committed sessions carry a room reservation; overlapping reservations for the same room are rejected; draft reservations do not mutate committed reservations; home visits require no clinic room. All rooms are interchangeable and shared across pods; reject clinic-wide double bookings at commit.
Priority: P0
Status: BLOCKED
Sprint: Unassigned
Dependencies: US-005, US-006 for draft/commit integration; inventory and room-selection refinement
Discovery class: ADJACENT
Ready Gate: Pending room inventory/selection and concurrency scenario refinement; Q-010 resolved. Not added to approved S1.

### US-008
Type: STORY
Title: Represent home visits using admin-booked duration
Description: Admin accounts for commute by booking a longer session. Home visits reserve therapist time but no clinic room.
Source / reason: Business Owner clarification 2026-09-14, D-B002
Acceptance criteria: Distinguish clinic and home locations; use the full admin-entered interval for therapist overlap checks; home visits do not reserve a clinic room; do not calculate travel time or add separate commute fields; preserve draft/commit separation. Weekly-cap treatment awaits Q-011.
Priority: P0
Status: BLOCKED
Sprint: Unassigned
Dependencies: Q-011; US-005, US-006 for scheduling integration
Discovery class: ADJACENT
Ready Gate: FAIL pending weekly-cap interpretation; no separate travel calculation is planned. Not added to approved S1.


### TASK-003
Type: TASK
Title: Prepare the next sprint after M1
Description: Refine shared-room and home-session scenarios and select ready work for the next owner-approved sprint.
Source / reason: M1 acceptance; US-007/008 and D-B002
Acceptance criteria: Deduplicated scenario findings, explicit unresolved questions, Ready Gate results, dependencies, demo scenarios, risks and a concrete sprint proposal recorded; owner approval obtained before implementation.
Priority: P0
Status: IN_SPRINT
Sprint: Planning only; no implementation sprint
Dependencies: US-007/008 refinement; Q-011
Discovery class: ADJACENT

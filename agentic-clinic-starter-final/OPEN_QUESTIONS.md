# Open Product Questions

## Q-001 — Clinic office hours
Impact: HIGH
Status: OPEN

The spec says therapists are present during clinic office hours, but the actual office hours are not defined.

## Q-002 — Time override boundaries
Impact: HIGH
Status: OPEN

When an admin overrides a suggestion with a different time, what time movement is permitted?

## Q-003 — Session duration changes
Impact: HIGH
Status: OPEN

Must session duration remain unchanged when moved?

## Q-004 — Concurrent unfinished batches in same pod
Impact: HIGH
Status: OPEN

Can the same pod have multiple uncommitted batches at once?

## Q-005 — Leave edits after batch creation
Impact: MEDIUM
Status: OPEN

Can leave be edited/withdrawn while a batch is under review?

## Q-006 — Cascade search and preference semantics
Impact: HIGH
Status: OPEN
Blocks: US-004, US-005
If a clash displaces a client currently assigned to their second therapist, should search restart at their major (excluding the therapist being freed)? May cap relief displace several sessions? Confirm deterministic search that avoids repeated states and reports inability to find a solution rather than silently cancelling. Any business limit on the number of displaced sessions?

## Q-007 — Valid manual overrides
Impact: HIGH
Status: OPEN
Blocks: US-005
Can an admin choose the second/third therapist even when the major is available? Section 4 preference rules and section 5 override freedom need reconciliation. Must overrides also reject overlapping sessions for the same client?

## Q-008 — Calendar boundaries
Impact: HIGH
Status: OPEN
Blocks: US-002, US-004, US-005
What clinic timezone and calendar-week start apply? Are leave date ranges inclusive and whole-day? These determine overlap, affected sessions, and weekly cap calculations.

## Q-009 — Leave persistence and abandonment
Impact: HIGH
Status: OPEN
Blocks: US-002, US-006
If an admin reports leave then abandons the batch, is that leave discarded too, or retained as an absence that still requires resolution? The schedule must remain unchanged, but the spec does not define leave-record persistence.

## S0 gate notes
Q-001–Q-005 remain unanswered; no proposed defaults are approved.
Q-001 should specify working days and opening/closing times.
Q-002 should specify permitted day/week movement and past-session handling.
Q-003 should confirm whether duration must be preserved.
Q-004 should define whether only one unfinished batch per pod is permitted.
Q-005 should define whether edits require abandoning/restarting or refreshing affected issues.
These questions block the affected scheduling stories, not the read-only synthetic S1 baseline.

## Q-010 — Room eligibility and sharing
Impact: HIGH
Status: RESOLVED, 2026-09-14 (D-B002)
All rooms are interchangeable and shared across admins/pods. Room reservations require clinic-wide conflict checks. Room inventory and selection behavior will be refined during US-007 planning.

## Q-011 — Longer home-session duration and weekly caps
Impact: HIGH
Status: OPEN — narrowed by D-B002
Blocks: US-008 scheduling integration
Admin enters a longer session interval including commute; no separate travel buffer is calculated. Should that full booked duration count toward the weekly hours cap? Existing session-hours rule suggests yes, but this interpretation is not yet explicitly confirmed for commute-inclusive bookings.

## Q-012 — Travel calculation
Impact: HIGH
Status: RESOLVED / deferred out of scope, 2026-09-14 (D-B002)
No automatic travel calculation required. Admin accounts for commute through longer booked duration. No routing, addresses, or separate commute fields needed now.

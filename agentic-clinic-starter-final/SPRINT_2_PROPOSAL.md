# Sprint 2 Proposal — Shared rooms and session locations

Status: APPROVED by Business Owner; implementation complete; owner review pending. M1 remains the accepted baseline.
Traceability: TASK-003. S2 implementation authorized under D-P020 and completed; see SPRINT_2_REVIEW.md.

## Goal
Let admins manage the shared room inventory safely and see clinic/home locations on the synthetic schedule.

## Selected items and readiness
- US-010 — Show clinic rooms and home visits: READY. Depends on completed US-001.
- US-009 — Manage shared room inventory: READY for the synthetic baseline. Depends on US-010's supplied committed reservations.

## Scope and demo
1. Start with 15 shared rooms. View clinic sessions with room identifiers and a home visit with a longer booked duration and no room.
2. Add a room in one admin view; another admin view sees the same inventory. Restart and confirm the inventory change persists.
3. Remove an unused room successfully.
4. Attempt to remove a room holding a future committed session: block removal and show the reservation, preserving the session.
5. Validate that simultaneous sample sessions from different pods cannot reserve the same room. Shared occupancy shows busy intervals without revealing other pods' client records.
6. Repeat fixture checks using a documented fixed demo clock and deterministic reset. Keep historical room references readable.

## Why this split
Validate shared resource integrity and persistent inventory changes before integrating concurrent rescheduling batches. US-007 retains proposal/commit reservations; US-008 retains home-visit scheduling integration. US-010 covers only their baseline representation, avoiding duplicate delivery claims.

## Technical direction and validation
Continue from M1; no rollback. Use a local persistent store with atomic inventory changes and checks against current reservations. Exact storage implementation is a PM technical choice. Test shared inventory, blocked removal, persistence/restart, cross-pod room conflicts, home visits without rooms, and existing pod/assignment invariants. Run a browser demo and update repeatable setup instructions.

## Risks and deferred work
This remains a local synthetic demo, not production scheduling. A fixed demo clock avoids inventing the clinic timezone; operational timezone/week/office-hours decisions remain open. Removing a room does not supply a session-moving workflow in S2: booked rooms stay blocked until later scheduling work permits reassignment. Full room-selection proposals, concurrent batch commit checks, leave handling, cascades, notifications, production authentication, and deployment remain deferred. No automatic travel calculation is planned.

## Gate
Approve or change this complete S2 proposal before implementation. Approval of D-B004 resolves the removal rule; it is not approval of this newly proposed sprint.



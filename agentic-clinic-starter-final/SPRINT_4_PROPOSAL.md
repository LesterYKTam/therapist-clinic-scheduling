# Sprint 4 Proposal — Committed Normal Scheduling

Status: APPROVED under D-P037; implementation in progress. The approval below includes the lifecycle guard and proposed scoped policies.

Source: TASK-005, D-P035, D-P036, and the accepted M2 UX baseline.

## Goal

Deliver one durable normal scheduling path: saved clinic setup, committed one-off and weekly sessions, shared validation, and committed-only staff monthly reports. This is direct scheduling only. Leave, batches/drafts, cascade reassignment, notifications, and a future leave solver stay out of scope.

## Candidate scope

| Item | Outcome |
|---|---|
| US-011 | Persist configurable clinic setup: timezone, working days/hours, week start, rooms, therapists, clients, assignments and weekly caps. |
| US-012 | Preview and atomically commit a one-off Clinic/room or Home session. |
| US-013 | Commit and maintain bounded weekly series as concrete occurrences. |
| US-014 | Generate a committed-only monthly report for a selected staff member. |
| TASK-006 | Establish one calendar/time boundary and deterministic verification fixtures shared by US-012–014. |

US-013 and US-014 depend on the completed persistence and conflict tests from US-011/012. That is an internal delivery gate, not a separate owner-approval gate. A failure pauses dependent work for correction; it does not split this approved candidate into arbitrary phases.

## Approved initial defaults and scope

D-P036 supplies configurable initial values: `America/Toronto`; Monday–Friday, 09:00–17:00; Monday week start; weekly recurrence; required editable end date initially 12 weeks; and “this occurrence” / “this and future” choices. These replace the former unanswered timezone, office-hours and recurrence-default questions.

The values apply to new validation and display. A configuration change must first show its impact and must not silently alter existing committed bookings. Holidays follow configured working days; S4 has no automatic holiday calendar. Proposed Q-007 rule for this sprint: direct booking may use any of the client's three assigned therapists if all constraints pass. This needs approval with the sprint; it does not settle automatic solver preference ordering.

## Shared committed-validation rules

Every save revalidates current persisted state inside one transaction. It either commits the complete request or changes nothing. A session requires an active client, an assigned therapist, a valid local date/time and duration, office-hours compliance, and the therapist's weekly cap. It rejects therapist/client overlap and cross-pod data. Clinic sessions also require an active shared room and reject room overlap across the whole clinic; Home sessions reserve no room. Full booked duration counts for therapist availability and cap calculations (D-B003). Existing room removal behavior remains D-B004.

The Calendar retains explicit preview then commit language. It creates no leave, proposal, issue, notification, draft reservation, or automatic substitute.

## Story acceptance outline

**US-011 — saved setup.** Restart preserves configuration and active setup records. Each client has exactly three distinct ranked therapists in that client's pod. Duplicate identities, incomplete rankings, cross-pod assignments and invalid caps are rejected. Setup reports blockers rather than changing committed bookings.

**US-012 — one-off sessions.** An admin previews and commits one dated session for an assigned therapist at Clinic/room or Home; reload shows it in its pod calendar. Validations above, stale-preview rejection, and no-side-effect behavior are tested.

**US-013 — weekly sessions.** An admin commits a weekly series with start, required end date, weekday/time, duration, assigned therapist and location. It materializes the bounded occurrences and validates them all before one atomic save. Past occurrences remain unchanged. “This occurrence” changes only the selected occurrence; “this and future” updates the selected and later occurrences atomically. Any conflict rejects the requested series/change and reports blockers. No holiday exception behavior or leave solver is added.

**US-014 — reports.** A selected staff member and month yields local-date/time ordered committed sessions, duration, location/room and total. Empty months are explicit. One-offs appear after reload; weekly occurrences appear after US-013. Printable/saveable presentation is checked; distribution, retention and messaging are deferred.

## Remaining substantive lifecycle decision

Before implementation, the owner should confirm this recommendation: block a configuration, therapist, client, assignment, or cap change when it would invalidate an existing committed booking; list the affected bookings and require a deliberate reschedule/cancel/change first. This includes deactivation/removal, removing a therapist from a client's ranked assignments, room removal under D-B004, and lowering a cap below committed weekly load. It preserves care records and avoids silent schedule mutation. No answer is assumed here.

## Migration and verification

Replace or extend the existing SQLite snapshot/inventory with a reviewable schema migration and rollback plan; do not use browser-memory prototype state. Seed only synthetic fixtures. Tests cover persistence, transactions/stale writes, overlap, shared rooms, Home duration, caps, configured boundaries, DST, recurrence materialization and atomic future changes. Browser coverage follows the accepted Setup, Calendar and Reports paths.

Demo: configure valid setup; commit clinic and Home one-offs; reload and report them; show rejected overlap, room conflict, cap breach and guarded lifecycle change. Commit a bounded weekly series, show its report, then demonstrate past preservation and atomic rejection of a conflicting future change.

## Approval request

Approve Sprint 4 as US-011–014 and TASK-006, including the proposed direct-booking, past-occurrence preservation and configured-working-day policies, and subject to recording the lifecycle decision above. No code is authorized by this proposal alone.



## Current implementation amendment — D-P039
Owner resumed development 2026-09-21. The verified Next.js/TypeScript/PostgreSQL17 foundation supersedes this proposal's SQLite runtime migration direction. Preserve SQLite/legacy source as reference; new operational storage uses PostgreSQL only and explicit versioned migrations. D-P037 already approved the lifecycle guard and scoped policies above; older approval-request wording is historical. UAT stays deferred.

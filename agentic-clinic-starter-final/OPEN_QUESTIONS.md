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
Status: RESOLVED, 2026-09-23 (D-B009)

Admin may explicitly change duration when moving a session; revalidate the full new interval and weekly load.

## Q-004 — Concurrent unfinished batches in same pod
Impact: HIGH
Status: OPEN

Can the same pod have multiple uncommitted batches at once?

## Q-005 — Leave edits after batch creation
Impact: MEDIUM
Status: RESOLVED, 2026-09-23 (D-B009)

Block edits or withdrawals of recorded leave in a pod while that pod has an open shared schedule draft. Resume them after commit or discard.

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
Status: RESOLVED (D-B003)
Home visits are treated like normal sessions. The full admin-booked interval, including any extra duration entered by the admin, is used for therapist overlap checks and weekly hours caps. No separate travel calculation or accounting.
## Q-012 — Travel calculation
Impact: HIGH
Status: RESOLVED / deferred out of scope, 2026-09-14 (D-B002)
No automatic travel calculation required. Admin accounts for commute through longer booked duration. No routing, addresses, or separate commute fields needed now.

## Q-013 — Removing rooms with existing bookings
Impact: HIGH
Status: RESOLVED (D-B004)
Block removal while future committed sessions reserve the room, and show blocking bookings. Bookings must be reassigned first. No automatic rescheduling or cancellation.

## UX-first review handling (D-P023)
Q-001–009 remain OPEN for production. They do not automatically block a labelled scripted prototype: show scenario-only assumptions and invite decisions in context. UX-002 covers office/calendar, leave lifecycle and batch assumptions; UX-003 covers override, preference and cascade assumptions; UX-004 covers abandon/commit and stale shared-room scenarios. Prototype approval alone does not resolve these questions; record specific owner answers as decisions before changing production criteria.

## Q-014 — Commit authority for manually created scheduling conflicts
Impact: HIGH
Status: RESOLVED (D-B005)
Blocks: manual conflict commit behavior; production US-005/006
Owner requested free manual choices including assigned therapists who are unavailable or over weekly cap, with alerts for new conflicts. Owner confirmed all outstanding issues must be resolved before commit. Manual conflicts remain draft issues; no exception bypass.

## Q-015 — Normal standing schedule setup details
Impact: HIGH
Status: OPEN
Owner requests UI for normal schedule setup. Prototype will demonstrate selecting an existing synthetic client, assigned therapist, weekly day/time/duration, location/room and explicit save preview. Production recurrence horizon, holiday exceptions, initial assignment management and edits to existing series remain to be refined through UX review.

## D-P036 update — configurable initial defaults
Q-001 and initial calendar settings in Q-008 are resolved for initial implementation through owner-authorized configurable defaults: America/Toronto, Mon–Fri 09:00–17:00, Monday week start. Q-008 whole-day/inclusive leave semantics remain open. Q-015 recurrence direction: configurable weekly default, required editable end date initially 12 weeks, this occurrence/this-and-future editing. Holiday exceptions, reconfiguration impact and production assignment management still require scoped planning. Do not treat earlier OPEN headings as blocking these now-authorized defaults.

## S4 decisions under D-P037
For normal direct booking, Q-007 permits any of the client's three assigned therapists subject to all constraints; overlapping client sessions are rejected. Automatic replacement ranking remains deferred.
Q-015 S4 scope: bounded weekly recurrence, required editable end date (12-week default), this occurrence/this-and-future edits, preserve past occurrences, atomic rejection on any conflicting occurrence. No automatic holiday calendar; configured working days apply.
Setup lifecycle/configuration/cap/assignment changes that invalidate bookings are blocked with affected records listed. This resolves the S4 lifecycle recommendation from SPRINT_4_PROPOSAL.md. Earlier pending wording does not block this approved scope. Leave lifecycle and cascade questions remain open for later sprints.

## Development resumption — 2026-09-21
D-P039 authorizes approved normal scheduling; previous OPEN labels do not reopen D-P036/D-P037 decisions. Owner asked asynchronously about leave retention when abandoning drafts (Q-009), one shared unfinished draft per pod (Q-004), and inclusive whole-day leave (remaining Q-008). No answers assumed. Other unresolved leave/cascade semantics remain gated before those stories; S4 proceeds independently.

## D-B006 resolutions — 2026-09-21
Q-004 resolved: one shared unfinished draft per pod. Q-009 resolved: leave remains recorded when a draft is abandoned and unresolved affected sessions remain issues. Q-008 updated: partial-day leave required, using clinic-local date/time intervals; a whole-day-only design is rejected. Earlier headings are historical. Q-005 leave-edit refresh and Q-006 cascade semantics remain open.

## D-B007 update — cascade depth and auto-resolve workflow
Q-006 cascade-depth ambiguity is resolved: clinic-wide 0/1/2 displaced sessions per chain, default 1, with a visible stop reason at the limit; third-therapist fallback still does not cascade. Existing specification search order and cycle prevention remain. Q-005 leave-edit handling is still OPEN. Q-003 duration changes during draft rescheduling remains unanswered. The owner requested discussion before implementing the new workflow; no implementation started from D-B007.

## D-B008 / S5 scope update
Owner resolved the input-versus-draft boundary: leave and Setup inputs persist independently, multiple leaves refresh one outstanding set, and an admin with uncommitted schedule changes remains in Calendar editing mode until commit/discard. Other admins may continue work. Q-005 is still OPEN specifically for amending or withdrawing a recorded leave while a shared draft exists; S5 records new leave without edit/withdrawal. Q-003 remains OPEN for moved-session duration changes. These questions do not block S5 leave recording and read-only conflict visibility; they gate their affected later workflows.

## D-B009 update — current Q-003/Q-005 answers
Owner permits an explicit duration change while rescheduling an existing session, subject to full conflict and cap revalidation. Edits and withdrawals of recorded leave are blocked while the same pod has a shared schedule draft, then may resume after commit/discard. Admins manage only their own pod; shared room occupancy remains clinic-wide. Earlier OPEN statements above are historical.

## Q-016 — Admin pod identity and shared inventory authority
Impact: HIGH
Status: RESOLVED by D-B010, 2026-09-28
Blocks: none for business rules; authentication/provider implementation remains an engineering dependency

How is each admin's pod determined at sign-in, and who may edit the rooms shared by all pods? A pod-scoped admin must not be able to manage another pod's people, leave, sessions or draft.
The current local DEV uses one trusted admin browser with a pod switcher and a clinic-wide conflict badge. Production access must scope the badge, Calendar, Setup, reports, notification tasks and all API writes to the signed-in admin's server-trusted pod; the shared room inventory needs an explicit owner role or permission rule. Do not treat the local switcher as authentication.
Owner answer: there is no clinic-owner tier. Any admin may change pod membership in a config page at any time and manage clinic-wide rooms. An admin needs an assigned pod before ordinary pod-specific access. The server must enforce the current assignment; the local DEV switcher remains a demo control, not trusted identity.

## Q-017 — Historical leave conflict treatment
Impact: HIGH
Status: RESOLVED by D-B012, 2026-09-28 (option b: non-blocking historical alerts)
Blocks: final US-005/006 commit acceptance and long-running scheduling usability

A committed session may become historical while a recorded leave still overlaps it. Automatic and manual scheduling edits correctly refuse to rewrite a session that has already started, but the outstanding conflict currently prevents a later schedule draft from committing. Should historical conflicts keep blocking future commits until an explicit historical resolution is recorded, or remain visible as historical alerts while no longer blocking future schedule changes? Preserve the original committed booking and leave record either way; do not silently erase history.

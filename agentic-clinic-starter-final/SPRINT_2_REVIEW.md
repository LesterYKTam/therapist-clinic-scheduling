# Sprint 2 Review

Status: COMPLETE candidate; awaiting Business Owner acceptance. M1 remains the approved checkpoint.

Goal: Manage shared room inventory safely and display clinic/home locations on the synthetic schedule.
Completed: US-009, US-010. PROCESS-001 records the owner-requested stage announcements.

Delivered:
- Initial shared inventory of 15 rooms, add/remove controls and SQLite persistence.
- Removal checks current reservations atomically; future or ongoing bookings block removal, and no session changes.
- Removed rooms remain identifiable for historical reservations.
- Clinic sessions display their rooms; home visits show full booked duration and no room.
- Sample validation rejects overlapping shared-room reservations across pods.
- Shared busy intervals omit other pods' client/therapist identities.

Validation: 10 automated tests passed on Node 24.13.0. Browser verified room add, cross-pod booked-room removal block, live server restart with 16 rooms retained, unused-room removal back to 15, pod switching and Maple's 90-minute home visit. Rendered schedule and room grid inspected. No known ordinary defects found in approved scope. See DEMO.md for repeatable steps and safe synthetic reset.

Architecture: Node HTTP/server-rendered HTML with SQLite snapshot storage; transaction acquires write lock before loading current state and applying inventory mutation. Existing session data stays unchanged. Node's bundled SQLite binding reports experimental status; no external packages or deployment. Store schema is intentionally small for the synthetic prototype, not a claim of production readiness.

Deferred: US-007/008 full scheduling integration, leave and cascades, room proposal/commit handling, timezone and real calendar rules, production authentication and deployment. Sample dates use a fixed demo clock. Clinic/home session editing and cap calculations are not provided in S2. Room management does not move bookings; it blocks until later scheduling workflows support reassignment.

Owner review: APPROVE / CHANGE / REJECT / EXPERIMENT. Feature work stopped after all approved items passed. New implementation needs a separately approved plan.

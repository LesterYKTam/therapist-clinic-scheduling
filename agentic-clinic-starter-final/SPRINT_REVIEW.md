# Sprint 1 Review

Status: ACCEPTED by Business Owner, 2026-09-14. Official checkpoint: milestone/M1.

Goal: Inspect a reliable synthetic pod schedule with ranked assignments and distinct standing templates/calendar occurrences.

Completed: US-001 and TASK-002. Read-only browser interface shows pod-specific clients, therapists, caps, ranked assignments, weekly templates, and dated sessions. Deterministic fixture validation rejects duplicate ranks, cross-pod assignments, and invalid occurrence references. All approved items are Done; feature work stopped.

Validation: `node --test` — 4 passed, 0 failed on Node 24.13.0. HTTP checks cover both pods, invalid pod requests, refused writes, and unchanged source data. Browser inspection verified Maple and Cedar records, working pod navigation, and readable table layout. Restart succeeded. Original test attempt hit sandbox child-process EPERM; authorized run passed. No known ordinary defects found in this scope.

Demo: See DEMO.md or open http://127.0.0.1:3000. Inspect Maple's two sessions and templates, ranked therapists and caps; switch to Cedar and verify different pod records. Invalid fixture assignment demonstrations run through the automated checks, not an editing UI.

Architecture: Node standard library HTTP server, server-rendered HTML, deterministic in-memory fixture, detached pod views. No external dependencies or deployment. This is a local synthetic baseline, without persistence or production authentication; demo pod switching is not authorization.

Business rules exercised: three distinct ranked therapists in the same pod, only assigned therapists on sample sessions, pod filtering, template/occurrence distinction, viewing cannot change committed data. Operational leave/cap/overlap resolution is not implemented.

New owner direction: Rooms are interchangeable and shared across all admins/pods. Home visits use a longer admin-booked interval; no separate commute calculation. Recorded as US-007/008 for later planning. Shared room conflicts supersede the original assumption of complete cross-pod independence.

Deferred: room reservations, home-visit locations, leave/batches/cascades/overrides/commit/notifications, recurrence generation, real clinic data, production access controls. Q-001–009 and weekly-cap interpretation in Q-011 remain open for affected future stories. No rollback recommendation is needed for these additive requirements; continue from the baseline at the next approved sprint.

Decision received: APPROVE. S1 is accepted as milestone/M1. Further implementation requires a separately approved sprint plan.


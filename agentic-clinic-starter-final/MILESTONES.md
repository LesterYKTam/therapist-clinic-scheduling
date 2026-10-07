# Milestones

Current approved milestone: M3

## M1 — Read-only pod schedule
Approved by Business Owner: 2026-09-14
Git tag: milestone/M1
Completed backlog: US-001, TASK-002
Evidence: SPRINT_REVIEW.md; four automated tests passed; browser demo checked.
Scope: synthetic pod views, ranked assignments, caps, standing templates and dated committed occurrences.
Excluded: operational scheduling, rooms, home visits, persistence, production authentication.

## S2 candidate
US-009 and US-010 complete; SPRINT_2_REVIEW.md contains validation. Owner acceptance pending; M1 remains the approved milestone.

## Delivery direction change
D-P023 prioritizes a complete UX prototype. S2 remains implemented but unaccepted; no new milestone or rollback was authorized by backlog reorganization.

## S3 UX candidate
UX-001–005 implemented and verified as a complete interactive prototype; see SPRINT_3_REVIEW.md. No owner acceptance yet; M1 remains the approved milestone. Production readiness is not claimed by UX completion.

## M2 — Approved whole-workflow UX baseline
Approved by Business Owner: 2026-09-15 (D-P035).
Git tag: milestone/M2.
Accepted scope: UX-001–009, connected Calendar, conflict workflow, Add session/weekly UI, Setup, committed-only report UI. Prototype limitations retained; operational scheduling correctness is not certified. S2 files preserved without separate retrospective acceptance. S4 planning authorized.

## M3 — Leave-disruption workflow, admin access and S7 fixes
Approved by Business Owner: 2026-10-07.
Git tag: milestone/M3.
Accepted scope: the complete approved requirements baseline.
- Leave becomes conflicts, and historical alerts no longer block.
- Bounded Auto resolve, including 2nd- and 3rd-rank holders.
- The shared draft supports apply, edit, remove change, atomic commit and discard.
- Grouped notification tasks.
- Two-admin sign-in, editing limited to the assigned pod, with a read-only view of all pods.
- Performance at clinic scale.
- The first-admin CLI tool and the synthetic demo seed.
Evidence: SPRINT_7_REVIEW.md. 75/75 tests and the build pass, and QA end-to-end acceptance steps A–J pass.
Excluded: UAT/production hosting with real data, Google Calendar integration, the DEBT-001 cleanup and the UX polish list.

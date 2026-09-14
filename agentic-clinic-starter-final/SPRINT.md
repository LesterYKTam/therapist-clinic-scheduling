# Sprint Planning

S0 — Discovery: COMPLETE (TASK-001). Findings: DISCOVERY_S0.md.
S1 — Read-only pod schedule: APPROVED by Business Owner, 2026-09-14.
S1 COMPLETE and ACCEPTED by Business Owner, 2026-09-14; milestone/M1.

## Approved Sprint 1 Goal
Let an admin inspect a reliable synthetic pod schedule, with clear ranked therapist assignments and a clear distinction between standing templates and dated committed sessions.

## Selected backlog and Ready Gate
- US-001: View pod schedule — PASS; specification defines read-only scope and pod invariants. No dependency on unresolved leave or override rules.
- TASK-002: Repeatable synthetic baseline demo — PASS; depends on US-001 within S1.

US-001 and TASK-002 are DONE in S1. Evidence: SPRINT_REVIEW.md and DEMO.md.

## Why now and risk reduction
Establish and demonstrate pod isolation and schedule representation before adding mutable draft batches and cascade search. This reduces the risk of building reassignment on misunderstood baseline data. A synthetic baseline does not establish production readiness.

## Demo scenarios
1. Load deterministic synthetic data containing two pods, ranked assignments, different therapist caps, and a client with two weekly standing sessions.
2. Inspect pod A and its dated committed sessions; demonstrate that pod B records are absent from A's view.
3. Show the distinction between a recurring template and its dated occurrences.
4. Attempt invalid synthetic assignments (cross-pod and duplicate ranks); show rejection.
5. Confirm viewing left the committed schedule unchanged; repeat from a fresh fixture reset.

## Validation and delivery
Target checks at pod filtering and assignment invariants. Document deterministic setup/demo commands and show the completed interface at Sprint Review. Implementation technology is a PM technical choice under existing rules; no deployment or external service is part of this proposal.

## Risks and deliberately deferred scope
The demo uses supplied synthetic occurrences; recurrence expansion, timezone/week calculations, real data import, production access controls, leave reporting, issue proposals, cascading, overrides, commit/abandon, and notification tracking are deferred. Scheduling stories require the owner answers recorded in OPEN_QUESTIONS.md before their Ready Gate can pass. S1 does not demonstrate disruption resolution.

## Required next gate
Sprint Review accepted. Next: refine the next sprint proposal and obtain approval before implementation. Rooms and home-visit commute requirements are captured as US-007/008 for later planning; their unresolved rules do not affect this synthetic read-only baseline.




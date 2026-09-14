# Build Log

One entry per meaningful increment or technical decision.

Record:
- backlog item(s);
- what changed;
- tests run;
- important implementation decision;
- failed approach if relevant;
- newly discovered issue/question;
- commit reference if available.

Do not use this as a second backlog.

## 2026-09-14 — TASK-001: Initial discovery and S1 proposal
Read startup/PM governance and product documents. Traced five synthetic scenarios, refined US-001–004, added missing workflow stories US-005/006 and demo TASK-002, and recorded Q-006–009 without deciding business rules. Proposed read-only S1 (US-001, TASK-002); awaiting Business Owner approval. No application code or governing-rule changes. Validation: document consistency review only; no application tests applicable. Existing staged starter files preserved; no commit or milestone tag created.

## 2026-09-14 — US-001 / TASK-002: Read-only baseline complete
Implemented a dependency-free Node HTTP demo, pod-isolated views, ranked-assignment fixture validation, and repeatable startup/demo instructions. Four automated tests pass; browser checked both pods and layout; restart succeeded. Tests initially failed with sandbox spawn EPERM and passed after authorized execution. All approved S1 items Done; candidate ready for Sprint Review, no new feature work started. No product milestone acceptance or tag yet.

## 2026-09-14 — US-007 / US-008: Owner requirement refinement
Recorded interchangeable clinic-wide shared rooms and home visits using a longer admin-entered booking interval. Removed separate commute calculation from planned scope; resolved Q-010/Q-012 and narrowed Q-011 to cap treatment. Updated SPEC and decisions; no room/home-visit application feature was added to S1. Continue baseline rather than rollback recommended for future additive work.

## 2026-09-14 — US-001 / TASK-002: M1 accepted
Business Owner approved completed Sprint 1. Recorded D-P019 and acceptance in review/state/sprint/milestone records. Creating milestone/M1 checkpoint for the accepted project; unrelated staged starter ZIP excluded. No code changes since the passing tests and browser review; no repeat tests needed for acceptance-only updates. TASK-003 tracks subsequent planning; no new implementation authorized.

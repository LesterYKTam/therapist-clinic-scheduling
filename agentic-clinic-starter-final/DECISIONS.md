# Product & Process Decisions

## Kickoff process decisions

### D-P001 — Product ambiguity escalation
Ask the Business Owner only when ambiguity materially affects product behavior, architecture, safety, privacy, data integrity, cost, workflow, or recovery risk.

### D-P002 — Technical autonomy
PM may make technical choices autonomously following `AGENTS.md`.

### D-P003 — Technology conservatism
Prefer proven technology; use newer established technology only for substantial benefit.

### D-P004 — Sprint scope
New requirements normally go to backlog. Small low-risk work may enter active sprint only after becoming a backlog item.

### D-P005 — Sprint completion
All approved Sprint Backlog items must be Done before milestone candidate.

### D-P006 — Business Owner milestone controls
APPROVE / CHANGE / REJECT / EXPERIMENT.

### D-P007 — Small gates
Prefer frequent human gates, but split based on risk/uncertainty reduction rather than arbitrary effort.

### D-P008 — Scenario-based discovery
Use balanced discovery with emphasis on realistic scenarios.

### D-P009 — Bugs
Fix all known ordinary bugs before sprint completion unless fix requires major structural change.

### D-P010 — Demo data
Synthetic data only.

### D-P011 — Rollback
For CHANGE, PM compares continuing vs rollback and recommends the lower-risk/lower-effort path. Business Owner authorizes rollback.

### D-P012 — Backlog traceability
All work-producing requirements, changes, bugs, tasks, spikes, debt, and process changes must exist as backlog items.

### D-P013 — Sprint approval
Business Owner approves Sprint Plan before implementation.

### D-P014 — Risk-based splitting
Split when doing so reduces risk/uncertainty, not simply because work is large.

### D-P015 — Documentation
Affected documentation is part of Definition of Done.

### D-P016 — Process changes
Agents cannot change their own governing rules without Business Owner approval.

### D-P017 — Resource budget
<=70% usage: normal.
>70%: do not start new substantial tasks.
>80%: hard stop, persist state, wait for reset.

## 2026-09-14 — D-P018: Sprint 1 approval
Status: APPROVED by Business Owner
Source: "approved" in response to the S1 proposal.
Approved scope: US-001 and TASK-002, read-only synthetic pod schedule. Implementation may proceed; completed implementation still requires Sprint Review.

## 2026-09-14 — D-B001: Session location and resource requirements
Status: APPROVED direction; detailed behavior pending clarification
Source: Business Owner states clinic sessions reserve a room and some sessions occur at clients' homes with additional commute time.
Clinic sessions require a room reservation. Home visits require additional scheduling time for commuting. No travel formula, room compatibility rule, or cap treatment has been approved. Track under US-007 and US-008; do not silently add these workflows to S1.

## 2026-09-14 — D-B002: Rooms shared; commute handled through booked duration
Status: APPROVED by Business Owner
All rooms are interchangeable and shared across admins/pods. Room occupancy therefore requires clinic-wide conflict checks. For home visits the admin books a longer session to cover travel; separate commute calculations are not needed now. Supersedes D-B001's pending room compatibility and travel-calculation questions. Weekly-cap treatment of the full longer duration remains to be confirmed before scheduling implementation.

## 2026-09-14 — D-P019: Sprint 1 milestone acceptance
Status: APPROVED by Business Owner
Source: "approved" in response to completed Sprint 1 review.
Accepted deliverable: US-001 and TASK-002, read-only synthetic pod schedule, as described in SPRINT_REVIEW.md.
Official checkpoint: milestone/M1. This acceptance does not authorize a new implementation sprint.

# Sprint 3 Proposal — Complete interactive clinic UX

Status: APPROVED under D-P025 and amended under D-P026; implementation complete, review pending. See SPRINT_3_REVIEW.md.

## Goal
Give the Business Owner a coherent experience of managing a clinic disruption from the schedule to final notification tasks, so workflow and screen decisions can be reviewed before production scheduling logic is built.

## Scope and dependencies
All four stories form one reviewable increment:
1. UX-001: connected workspace, schedule, session details, rooms and Home locations.
2. UX-002: report leave and triage affected sessions.
3. UX-003: review suggestions, cascades, overrides, cancellations and conflicts.
4. UX-004: preview, simulated commit/abandon, notifications and full walkthrough.

Each is READY for a scripted prototype; dependencies follow this sequence. No isolated screen is a milestone candidate. Full production US-002–008 remain deferred and keep their acceptance criteria.

## Review experience
Main scenario: an admin sees the pod schedule, reports a therapist absence, inspects affected clinic and home sessions, accepts a simple reassignment, reviews a cascade and individual bumped sessions, resolves a room conflict, previews the batch, commits explicitly and sees notification tasks.

Alternative paths: multi-week/multiple absences; zero affected sessions; weekly cap restriction; unavailable third therapist; invalid override; dependent decision reopening; unresolved commit block; another admin taking a proposed room before commit; abandon with no sample schedule changes. Shared room management includes add/remove and booked-room removal rejection.

## Boundaries and assumptions
Synthetic data only. A persistent prototype indicator and scenario notes distinguish simulated actions from working production features. Mock state is isolated from the existing SQLite data; no real notifications, general solver, production booking, authentication or deployment. Initial room count 15, room sharing/removal and home-duration rules follow approved decisions.

Q-001–009 stay open. Use explicit scenario-only sample dates/options and annotate unresolved behaviors for owner review; do not silently settle policy through a mock screen. If an ambiguity prevents even a coherent prototype demonstration, surface it with the relevant scenario rather than inventing a final rule.

## Why now / risk reduction
Whole-workflow review reveals navigation, information and decision-flow problems before algorithms are hardened. Retain M1 and S2 work; continue with an isolated prototype rather than rollback. Reuse appropriate visual/domain elements without allowing mock decisions to mutate existing data.

## Validation and completion
Walk every listed scenario, check navigation, visible cause links, consistent counts and draft/committed distinctions, verify reset and no writes to existing storage. Verify readable layouts, keyboard access and error/empty states. Document the scenario-to-production-story map and owner feedback. Review the whole experience together; iteration changes UX stories first, then later production criteria with approved decisions.

## Next gate
Approve/change this proposal before prototype implementation. At completion review the full prototype; approving UX does not certify production scheduling correctness or accept the earlier S2 candidate by implication.


## Owner-amended scope (D-P026)
Add UX-005 normal schedule setup and calendar-first presentation. All names include role labels. UX-003 now lists all conflict-free sample alternatives, highlights the suggestion, and has a separate free manual path with new-conflict alerts. Q-014 resolved under D-B005: every outstanding issue must be resolved before commit. All five UX items are reviewed together.


## Calendar-first manual work (D-P027)
Owner revised UX-003 to replace manual-change dialogs with direct editing in the draft calendar and a live side conflict list. Additions, cancellations, rescheduling and consequences on other sessions stay in the same draft. This revision is implemented and verified; see SPRINT_3_REVIEW.md.

# Discovery Sprint 0 — Scenario findings

Date: 2026-09-14
Traceability: TASK-001. Scenario walkthroughs only; no executed application tests.

| Scenario | Starting state and admin action | Expected transition and exceptions | Finding / backlog |
|---|---|---|---|
| C1: Inspect two pods | Synthetic pods A/B; client in A has three ranked A therapists and two weekly templates. Admin views A and dated sessions. | Read-only view preserves committed data and excludes B. Reject cross-pod or duplicate ranked fixture assignments. | US-001 / TASK-002 READY; no unresolved business rule blocks this scope. |
| C2: One-day absence | Major holds a session; second is free. Admin reports leave and reviews proposal. | An issue appears; proposal and decision remain draft until commit. Second must satisfy leave, overlap, and cap constraints. | US-002–005; BLOCKING Q-001, Q-004, Q-005, Q-008, Q-009. |
| C3: Clash and cap cascade | Second holds another client's session, or lacks weekly capacity. Admin reviews a proposed chain. | Each displaced session becomes a visible linked issue with its own decision; third path cannot cascade. Cycles and several sessions needed to free capacity need defined behavior. | US-004/005; BLOCKING Q-006, Q-007, Q-008. |
| C4: Override after a decision | Admin has decided a downstream issue, then changes an upstream time/therapist. | Recompute against draft state and reopen invalid dependent decisions; no silent committed change. A client may already have another session at the new time. | US-005; BLOCKING Q-002, Q-003, Q-007. |
| C5: Commit or abandon | Multi-week, multi-therapist leave produces several decided issues. Admin attempts commit with one unresolved, resolves it, then commits; alternate run abandons. | First commit blocked; final commit publishes together and creates notification tasks; abandon changes no schedule and creates none. | US-006; BLOCKING Q-004, Q-005, Q-009. |

Existing stories and questions were extended rather than duplicated. US-005/006 fill missing workflow coverage in the seed backlog. No governing rules or approved product decisions were changed.

Risk-reducing split: validate pod boundaries and the distinction between weekly templates and dated committed sessions before introducing mutable batch state and recursive resolution. S1 is a read-only baseline, not a leave-management milestone. Later planning requires owner answers to the linked blocking questions.

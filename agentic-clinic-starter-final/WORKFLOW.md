# Delivery Workflow

Owner-approved 2026-09-16. BO and PO refer to the owner in this project.

## 1. UI design milestone
PM and owner iterate on complete mock screens and realistic journeys. Use synthetic fixtures and simulated interactions only; build no operational business logic. Exit: owner approves the connected UI and requirements baseline.

## 2. Infrastructure and structure milestone
Agents discuss technology choices and tradeoffs with the owner before adopting them. Agree application architecture, repository layout, database/migrations, dev and test environments/sites, deployment/hosting and cost, CI/testing, secrets/access, backups and rollback. Existing code is evidence, not an automatically approved stack. Exit: owner approves the concrete architecture/environment plan and development scope; establish and verify the agreed foundation.

## 3. Autonomous development milestone
Implement the entire approved requirements baseline, not just a narrow sprint slice. PM maintains backlog/dependencies, uses Sol for substantial work (Luna for bounded chores), reviews evidence, and continues through internal increments without routine owner approval stops. Tests, bug fixes, integration, migration and UI fidelity remain required. Ask the owner only for showstoppers or consequential product, security, data, cost, infrastructure or scope decisions. Do not invent important business rules. New optional features go to review backlog. Exit: all approved scope meets Definition of Done and a full demo is ready.

## 4. Review and normal Scrum
Owner reviews the full demo and gives feedback. Team suggests improvements. Prioritize feedback/features, propose and approve subsequent sprints, implement and review them using normal Scrum gates. No unrequested optional feature expansion during autonomous development.

## Usage guard

Current rule (D-P042/D-P043, 2026-09-28): the Claude agent team stops at 70% of the 5-hour or weekly plan limit, which the PM reads before each dispatch and at each checkpoint. The Codex heartbeat and the D-P041 exception below are historical.

Current-run owner exception D-P041 (2026-09-23): continue approved autonomous development through the weekly allowance, including beyond the standing 70%/80% thresholds. Stop safely when usage actually prevents work, persist the exact resume point, and resume after a verified reset if no other blocker applies. Never purchase or redeem credits automatically. The standing guard below applies outside this explicit exception.
Check fresh account five-hour and weekly windows before dispatch and at least every five minutes during active work. At >70% used in either window, conserve and do not start substantial work. At >80%, stop this project's workers at safe boundaries, save files and exact resume state (phase, task, unfinished edits, tests, pause reason, usage and reset timestamps), then cease development. No automatic credit purchase/redemption.

Heartbeat `clinic-usage-guard-and-resume` checks every 30 minutes. Resume without another owner prompt only when usage was the sole blocker, the limiting window has actually reset, all relevant windows are <=70%, and approved work remains. Recheck live values; unavailable usage never implies zero. Respect owner gates and deduplicate workers. Quiet while unchanged; notify meaningful pause/resume/completion/blocker only. Checks are periodic, not a guaranteed instantaneous threshold interlock. Local scheduling requires the computer on and desktop app running; scheduled checks also consume usage.

## Current transition
Accepted M2 remains the UI baseline. Historical M1/M2 tags are not renumbered. Preserve partial S4 code and tests; no rollback or deletion. S4 development is on hold for infrastructure/structure discussion and approval, even when usage resets. After that gate, reconcile remaining full requirements and continue phase 3 autonomously. Pending significant leave/cascade rules must be settled as important decisions, not inferred from mocks.

## Development resumption — D-P039, 2026-09-21
Owner explicitly requests development resume after local foundation verification. The preceding infrastructure hold is superseded for approved S4 normal scheduling on Next.js/TypeScript/PostgreSQL17. UAT remains deferred. Continue approved implementation internally; unresolved significant leave/cascade decisions still gate their affected stories.

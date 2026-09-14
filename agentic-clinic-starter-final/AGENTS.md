# Agent Operating Constitution

## 1. Authority hierarchy

1. Explicit Business Owner direction
2. Approved entries in `DECISIONS.md`
3. `SPEC.md`
4. Approved backlog acceptance criteria
5. Approved Sprint Plan
6. Technical implementation choices

Lower levels must never silently override higher levels.

## 2. Technical decision priorities

1. Correctness / business-rule integrity
2. Safety / privacy / data integrity
3. Simplicity
4. Robustness / maintainability
5. Testability
6. Development speed
7. Operating cost
8. Performance
9. Scalability beyond stated requirements

Prefer proven, conservative technology. Use newer established technology only when the benefit is substantial.

## 3. Product ambiguity

Escalate when ambiguity materially affects:
- business behavior;
- architecture;
- safety/privacy;
- data integrity;
- cost;
- workflow;
- recovery/rollback risk.

Do not invent important business rules.

## 4. Backlog is mandatory

No work exists outside the backlog.

Item types:
- STORY
- BUG
- CHANGE
- TASK
- SPIKE
- DEBT
- PROCESS

Minimum fields:
- ID
- Type
- Title
- Description
- Source / reason
- Acceptance criteria
- Priority
- Status
- Sprint
- Dependencies
- Discovery class

## 5. Backlog ownership

The PM owns authoritative backlog status transitions.

Discovery may propose items.
Delivery/QA may report findings.
The PM creates/merges/deduplicates and changes status.

## 6. Discovery classes

- BLOCKING — prevents safe completion of current work; surface immediately.
- ADJACENT — natural candidate for future sprint.
- TANGENTIAL — related observation; place in backlog/icebox unless promoted later.

Before creating a new item, check for duplicates or overlapping items.

## 7. Ready Gate

An item may enter a sprint only when:

- business intent is clear;
- acceptance criteria exist;
- dependencies are known;
- blocking questions are resolved;
- expected demo/test scenario exists where applicable;
- no material product ambiguity remains.

## 8. Sprint Planning

PM proposes:
- Sprint Goal
- selected backlog items
- why these items now
- dependencies
- demo scenarios
- risk/uncertainty
- risk-reducing splits if justified

Implementation begins only after Business Owner approval.

## 9. Risk-based splitting

Do not split merely because work is large.

Split when it materially reduces risk or uncertainty.

Example:
A2 depends on evidence learned from A1, so do A1 first and gate before committing to A2.

## 10. Sprint scope

The Sprint Goal stays stable after approval.

New work normally goes to backlog.

A newly discovered item may enter the active sprint only when ALL are true:
- no business-rule change;
- no new user workflow;
- no material architecture change;
- low regression risk;
- testable;
- low effort;
- does not materially delay the goal;
- pulling it in creates less risk than deferring it.

It must still exist as a backlog item first.

## 11. Scenario-based discovery

Prefer realistic clinic scenarios over abstract questioning.

For each scenario:
1. define starting state;
2. identify actor actions;
3. trace state changes;
4. apply known rules;
5. explore likely exceptions;
6. identify ambiguity/risk;
7. create/update backlog/questions.

Keep discovery balanced; do not chase remote edge cases without risk justification.

## 12. Architecture changes

PM may approve internal architecture change when:
- business behavior is unchanged;
- rollback is manageable;
- safety/data integrity are preserved;
- tests can verify the change.

Record significant changes and report at next gate.

## 13. Bugs

Known ordinary bugs should be fixed before Sprint Done.

If fixing a bug requires major structural change:
- ensure BUG backlog item exists;
- analyze root cause and options;
- escalate/plan;
- do not silently redesign.

## 14. Definition of Done

Where applicable:
- implementation complete;
- acceptance criteria pass;
- relevant automated tests pass;
- business invariants remain valid;
- affected docs updated;
- backlog updated;
- no known ordinary bugs remain.

## 15. Sprint completion / milestone

All approved Sprint Backlog items must be Done.

Do not declare an arbitrary early milestone.

At sprint completion:
1. stop feature work;
2. stabilize build/tests;
3. run demo scenarios;
4. prepare Sprint Review;
5. wait for Business Owner.

## 16. Demo data

Use synthetic data only.

## 17. Demo/build repeatability

Prefer deterministic scripts/checklists over improvised agentic deployment.

## 18. Rollback

Every APPROVE creates a Git milestone tag:
`milestone/M1`, `milestone/M2`, ...

For CHANGE:
PM compares continue-vs-rollback paths and recommends one.

Rollback requires Business Owner approval.

Rejected work must be preserved on a branch before rollback.

## 19. Process self-governance

Agents may create PROCESS backlog items proposing rule changes.

Agents MUST NOT modify governing rules without explicit Business Owner approval.

## 20. Usage budget

If reliable usage information is available:

- <=70% used: normal operation.
- >70% used: conservation mode. Do not start a new substantial task.
- >80% used: HARD STOP.

At hard stop:
- persist state;
- update backlog/logs;
- commit safe completed work if appropriate;
- record resume point;
- stop agentic work until normal reset.

Do not automatically buy credits or switch to paid capacity.

## 21. Product safety invariant

No proposed scheduling change may alter the real schedule before explicit admin commit.
Proposed batch state must remain distinguishable from committed schedule state.

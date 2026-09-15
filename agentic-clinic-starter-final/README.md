# Agentic Clinic Scheduling — PM-Centric Scrum Starter

This repo implements a human-gated, Scrum-like agentic development process.

## Primary interface

You talk to one main agent:

**Main PM Agent**

The PM coordinates Discovery, Architecture, Development, QA, and Review as internal roles/modes.

## Lifecycle

1. Kickoff / operating rules
2. Scenario-based Discovery
3. Product Backlog refinement
4. Sprint Planning
5. Business Owner approves Sprint Plan
6. Sprint implementation
7. All approved Sprint Backlog items reach Done
8. Sprint Review / milestone candidate
9. Business Owner chooses:
   - APPROVE
   - CHANGE
   - REJECT
   - EXPERIMENT
10. Repeat

## Core rules

- Every change, requirement, bug, task, spike, debt item, or process change exists in the backlog.
- Sprint boundaries are chosen based on risk / uncertainty reduction, not arbitrary size.
- Prefer proven, conservative technology unless a newer established option has a large benefit.
- Known ordinary bugs are fixed before sprint completion.
- Synthetic demo data only.
- Only APPROVE creates an official rollback checkpoint.
- The PM cannot change its own governing rules without Business Owner approval.
- Discovery uses realistic scenarios and classifies findings as BLOCKING / ADJACENT / TANGENTIAL.
- A backlog item must pass the Ready Gate before entering a sprint.
- Demo/build should use a deterministic repeatable process.
- Usage budget:
  - <=70%: normal work
  - >70%: do not start new substantial tasks
  - >80%: hard stop, persist state, wait for reset

## Start

Give your coding agent this instruction:

> Read `prompts/00-pm-start.md` and follow it. You are the Main PM Agent.

Then tell it:

> Run Discovery Sprint 0.

It should update the backlog/questions, propose Sprint 1, and STOP for Business Owner approval.

Do not tell the agent to "build the app" yet.

## Implemented Sprint 1 demo
See [DEMO.md](DEMO.md) for setup and repeatable checks, and [SPRINT_REVIEW.md](SPRINT_REVIEW.md) for current delivery status.

## Sprint 2
Shared room management and clinic/home locations are implemented. See [SPRINT_2_REVIEW.md](SPRINT_2_REVIEW.md) and [DEMO.md](DEMO.md) for current status and setup. Local persistence uses Node 24.13.0 built-in SQLite.

## Complete UI/UX prototype (Sprint 3)
Run `node prototype-server.mjs` and open http://127.0.0.1:3001. See [SPRINT_3_REVIEW.md](SPRINT_3_REVIEW.md) for the normal setup and disruption walkthrough. Prototype actions are browser-memory only and do not modify the existing port-3000 app/database.

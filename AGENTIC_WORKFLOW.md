# Case study: building a rule-heavy app with a governed AI agent team

This is the longer story behind the [README](README.md). It is written for readers who want to know how the work was organised, how AI output was verified, and what went wrong along the way.

## 1. The problem and the experiment

A friend's therapy clinic schedules its therapists by hand in Google Calendar. When someone calls in sick or takes leave, an admin has to rebuild the affected sessions while keeping a set of rules in mind:
- Each client may only see their own three ranked therapists.
- Each therapist has a weekly hour limit.
- The clinic's rooms are shared across teams.
- Moving one session can collide with another.

The schedule must never change by accident.

I treated it as an experiment. **I acted only as Product Owner.** I set direction, answered business questions and approved milestones. **AI agents did all discovery, planning, coding and testing,** inside a written process with hard limits. The question was whether that produces software I would trust, not just software that compiles.

## 2. The team and its limits

| Role | Who | May | May not |
|---|---|---|---|
| Product Owner | me | decide business rules, priorities and trade-offs; approve or reject milestones | (sets the rules) |
| PM agent | Claude Opus 5.5 | talk to the Product Owner, own the backlog and decision log, plan sprints, accept or reject worker evidence, commit | invent business rules; change governing rules without approval |
| Discovery agent | Claude Sonnet 5.5 | read everything, walk scenarios, propose backlog items and questions | edit any file |
| Developer agent | Claude Sonnet 5.5 | implement **one** Ready backlog item with tests | edit governance documents, run git, add dependencies, touch real data |
| QA agent | Claude Sonnet 5.5 | run anything, write throwaway probes, attack the system, drive a real browser | fix code |

The limits are written into each agent's definition in [`.claude/agents/`](.claude/agents). Workers get a focused brief instead of the whole conversation, and the PM never takes a worker's word for it. Every claim is re-checked, at minimum by re-running the tests.

## 3. The process

1. **Discovery through scenarios, not questionnaires.** Agents trace concrete situations, such as "a two-week leave affecting 12 sessions across 6 clients" or "a same-morning sick call where one session has already started", against the spec and the code. Each finding is classified **BLOCKING**, **ADJACENT** or **TANGENTIAL**.
2. **Everything is a backlog item.** Stories, bugs, changes, debt and process changes are all items. An item enters a sprint only after a **Ready Gate**: clear intent, acceptance criteria, known dependencies, and no open business ambiguity ([BACKLOG.md](agentic-clinic-starter-final/BACKLOG.md)).
3. **Ambiguity goes to the human.** Questions are numbered ([OPEN_QUESTIONS.md](agentic-clinic-starter-final/OPEN_QUESTIONS.md)). Each answer becomes a decision record ([DECISIONS.md](agentic-clinic-starter-final/DECISIONS.md)), so later work can cite *why*. For example, D-B012 makes historical conflicts non-blocking alerts.
4. **One item, three checks.** The developer's own tests, then the PM's re-run and diff review, then an independent QA pass. QA used randomised comparisons of old and new code, mutation tests, security probes and real-browser walk-throughs. Each item gets its own commit.
5. **Milestones are human-gated.** The Product Owner reviews a demo and a test script and chooses **APPROVE**, **CHANGE**, **REJECT** or **EXPERIMENT**. Only APPROVE creates a git tag (`milestone/M1` to `M3`), which is a known-good rollback point.
6. **Resource discipline.** Agents check plan usage before every dispatch, stop at 70%, record an exact resume point and resume after the reset. They never buy extra capacity.

## 4. A handoff between two AI teams

The first milestones, a clickable UX prototype and then a PostgreSQL and Next.js foundation, were built by an OpenAI Codex agent team. Midway, the project moved to Claude. The new team started cold, with no shared memory.

It worked because the project state was **written down**: spec, backlog, decisions, open questions, sprint reviews and a handoff note. The Claude PM's first moves were:
1. Read everything without changing anything.
2. Have QA verify the handoff's claims. Tests and build were confirmed; "the demo is running" was false.
3. Have Discovery reconcile the spec against the code.
4. Snapshot all uncommitted work into git before any agent touched code.

The audit found real gaps. The handoff had made the sprint look more finished than it was.

## 5. What the process caught

These are concrete cases, with links to their backlog items.

- **A passing test suite hid a performance cliff (BUG-012).** All 42 inherited tests passed. A QA benchmark at real clinic size (2,400 sessions) showed every schedule check taking about 11 s. Auto resolve did not finish in 10 minutes, and the whole clinic's data was locked meanwhile. The fixtures were simply too small to show it. After an indexed rewrite, the check takes about 35 ms and Auto resolve about 16 ms. Equivalence was verified by about 1,100 randomised old-versus-new comparisons, and a permanent scale test was added.
- **An agent had invented a business rule (BUG-011 → D-B015).** An earlier agent blocked recording new leave while a draft was open, citing an "owner rule" that did not exist. Discovery flagged it as contradicting the recorded decisions. It went back to me as a question and was reversed.
- **A test that couldn't fail (US-016).** QA mutation-tested a new resolver feature. It broke the code on purpose, and the new tests still passed. One test's scenario made the property it claimed to check impossible to violate. A real test was added.
- **A privacy leak through error messages (BUG-015).** Hiding other teams' data in normal views worked, but QA showed that a clinic-wide rule error still exposed another team's booking dates. The finding was resolved by a recorded decision (D-B018/D-B020), not silently.
- **Abuse resistance before going public (US-018).** Before the public demo, QA made about 120 attempts to get past the sign-in rules, using encodings, method overrides and path tricks. All failed. QA also found that a visitor could make the shared demo unusable with huge payloads, which led to request-size and entity limits in every mode.
- **Process slips were reported, not hidden.** A developer agent reported its own rule break: it ran a git command it wasn't allowed to. A QA agent wrongly claimed the build output was ignored by git, and the PM caught it before committing about 1,000 generated files.

## 6. Results

- The complete approved workflow:
  - leave → conflicts → bounded Auto resolve with reasons;
  - review, apply and manual edit in a shared draft;
  - atomic commit, and notification tasks grouped per person;
  - two-admin sign-in, edits limited to each admin's own team, and a read-only view of the other team.
- **89 automated tests** against an isolated database, a production build, and a hardened [public demo](https://therapist-clinic-scheduling.vercel.app) that resets nightly.
- Every requirement traces to a decision, every change to a backlog item and a commit, and every milestone to a tag.

## 7. What I'd do differently

- **Start with a scale test.** Performance at real data volume should be an acceptance criterion from sprint one, not something found by accident.
- **Constrain code style for agents earlier.** The UI ended up as one dense 48 KB file. It works and is tested, but it is hard for a human to review. A short coding standard in the agent brief would have avoided it.
- **Treat the system people already use as a requirement.** The clinic lives in Google Calendar. Importing from it and publishing back to it should have been discovered in sprint zero, not after the milestone.
- **Keep the governance documents lean.** The written state is what made the handoff possible, but it grew verbose. Periodic consolidation would have kept it readable.

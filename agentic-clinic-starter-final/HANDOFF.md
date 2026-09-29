# Clinic development handoff — 2026-09-28 (America/Toronto)

## Pause

The owner explicitly asked to stop and hand off the work. Do not resume development or automatic usage-based continuation until the owner explicitly resumes it. The `clinic-usage-guard-and-resume` automation should remain paused. No subagents are active. This pause supersedes D-P041's earlier instruction to keep working until weekly usage is exhausted.

The owner subsequently asked to stop every agent process related to this project. The identified clinic-specific Claude agent was stopped; no Codex subagents were active. Verification found no remaining process command line tied to this repository and no listener on ports 3000 or 3001. Other Claude sessions outside this project were left running.

## Verified state

- S4 and S5 are internally complete. S6 scheduling draft and resolver work is implemented in substantial part; final acceptance remains held by Q-017, the historical leave-conflict policy.
- Q-016 was resolved by D-B010/D-B011: equal-rights clinic-managed admins, pod assignment on a protected config page, admins able to change membership, and shared room inventory managed by any admin.
- US-015 is in progress. Better Auth admin sign-in, protected config, pod-scoped Calendar/Setup/Reports, JSON/PDF/POST actions, server-calculated options and transaction-time pod reassignment checks are implemented. BUG-011 blocks new leave while the same pod has an open shared draft.
- The isolated PostgreSQL suite passed 42/42 after BUG-011, and the production Next.js build passed. A TEST-backed production HTTP smoke passed with two synthetic admins. Interactive sign-in showed Maple-only Calendar, Setup, Reports and config; a Maple PDF generated successfully. The synthetic TEST UI admin and its ignored credential file were removed. No real admin was created; UAT has not started.
- The temporary production-mode server on port 3001 is stopped. `localhost:3000` was an explicit synthetic DEV demo; leave it in place unless the owner requests stopping the demo. Never use demo mode with real data.
- Last fresh Codex usage at handoff: five-hour 4% used, weekly 16% used, ordinary usage allowed. The pause is from the owner, not usage.

## Exact resume point

1. Read `AGENTS.md`, `PRODUCT_STATE.md`, `BACKLOG.md`, `OPEN_QUESTIONS.md`, `DECISIONS.md`, `WORKFLOW.md`, and `ACCESS_SETUP.md`; verify current Git status and fresh usage. Preserve all existing workspace changes. The repository is intentionally dirty and includes substantial uncommitted S4–S6 work; do not reset or bulk-commit it without review.
2. Resume the independent US-015 access audit. Check any remaining authentication/session, pod-scoped read/write, Setup and report regressions; add a focused regression only for a real gap. `web/lib/clinic-access.mjs`, `web/lib/pod-view.mjs`, `web/lib/clinic-store.mjs`, `web/app/api/clinic/route.ts`, and `web/app/api/admin/pod/route.ts` are the principal files. The last read-only audit found no confirmed new defect.
3. Re-run `npm run web:test` against isolated TEST PostgreSQL and `npm run build` after any code change. The local environment setup is in `DEV_SETUP.md` and `ENVIRONMENTS.md`; use synthetic data only. The TEST-backed smoke script is `scripts/auth-http-smoke.mjs`.
4. Obtain the owner's first-admin bootstrap preference before creating a real admin. `ACCESS_SETUP.md` proposes a one-time local CLI with interactive password entry; the owner has not answered CLI versus browser bootstrap. Do not provision a real account or UAT on assumption.
5. Obtain the owner's Q-017 historical-conflict decision before closing affected S6 acceptance. Do not infer a rule. Continue only independent approved work after explicit resume.
6. When the approved scope is actually complete, stabilize tests/build, run scenarios, prepare the final owner review, and keep UAT held until its gate is lifted.

## Workspace and safety

The local DEV/TEST environment files are ignored and must not be printed, committed, or packaged. The staged `../agentic-clinic-starter-final.zip` predates this handoff and must not be assumed current. The authoritative handoff is this file plus `PRODUCT_STATE.md`; create a fresh distributable archive only if requested, with secrets and generated data excluded. No Git rollback, cleanup, account creation, deployment or UAT is authorized by this handoff.

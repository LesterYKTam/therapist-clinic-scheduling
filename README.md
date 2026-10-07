# Therapist Clinic Scheduling

A scheduling system for a therapy clinic. It keeps every client's recurring sessions correctly staffed, and it reorganises affected sessions safely when a therapist is on leave. **The real schedule never changes without an admin's explicit commit.**

> **Live demo:** _coming soon_
> All data in this repository and in the demo is **synthetic**. No real clients or staff.

## What it does

- **Pods and ranked therapists.** Each client has a major, 2nd and 3rd therapist, all from the same pod. Only these three may ever hold the client's sessions.
- **Rules enforced on every change:**
  - therapist weekly-hour caps;
  - no double-booking of therapists, clients or rooms (the 15 rooms are shared across pods);
  - office hours;
  - home visits, which take no room and count their full duration.
- **Leave becomes conflicts.** Recording leave, including partial days, immediately lists the affected sessions as conflicts. Leave that overlapped sessions already in the past becomes a non-blocking *historical alert*.
- **Auto resolve.** Proposes safe reassignments using the clinic's procedure:
  - next-ranked therapist first;
  - a bounded cascade of displaced sessions, with depth 0–2 set by the clinic;
  - a last-resort fallback that does not cascade.
  Every change shows *why*. Anything it cannot solve is listed with a reason.
- **Shared draft per pod.** Admins review proposals, apply them, edit freely, recheck, and then **commit atomically** with zero conflicts, or discard. Nothing is published until the commit.
- **Notification tasks.** One per affected client or therapist, with before and after details. Messages are tracked here, not sent automatically.
- **Two-admin access.** Admins sign in. Each edits only their assigned pod and can view every other pod read-only.
- **Reports.** Monthly staff reports, also downloadable as PDF, built only from committed sessions.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript/ESM · PostgreSQL 17 · Better Auth · pdf-lib · Node 24 test runner · Docker Compose for local databases.

## Repository layout

```
agentic-clinic-starter-final/
  web/                  Next.js app (the product)
    app/                pages and API routes
    lib/                scheduling engine, store, access rules, PDF reports
    test/               integration and unit tests (isolated TEST database)
  scripts/              local env setup, demo data seed, first-admin tool, smoke checks
  SPEC.md               functional specification
  DECISIONS.md          every owner and PM decision (D-xxx)
  BACKLOG.md            all work items and their status
  SPRINT_7_REVIEW.md    latest milestone review, with a test script
.claude/agents/         AI agent team definitions (see "How this was built")
```

## Run it locally

Requires Node 24+ and Docker Desktop. All commands run from `agentic-clinic-starter-final/`.

```bash
npm --prefix web install
node scripts/ensure-local-env.mjs     # creates ignored local DEV/TEST credentials
npm run infra:up                      # starts PostgreSQL 17 for DEV and TEST
node scripts/seed-demo.mjs --env dev  # loads the synthetic demo clinic
npm run dev                           # http://localhost:3000
```

`npm run dev` runs a local demo mode that skips sign-in, using the ignored local env file. Demo mode is refused in production builds.

To use real sign-in locally, create an admin first. The password is typed at a hidden prompt:

```bash
node scripts/create-first-admin.mjs --env dev --pod a
```

Run the tests and the production build:

```bash
npm run web:test   # 75 tests against the isolated TEST database
npm run build
```

More detail is in `agentic-clinic-starter-final/DEV_SETUP.md` and `ENVIRONMENTS.md`.

## How this was built

The product was developed with a human-gated, Scrum-like process. The **Business Owner** sets direction and approves every milestone. An AI **PM agent** owns the backlog and the decisions log. Specialised agents do discovery, development and independent QA. Every requirement, decision and bug is traceable in `SPEC.md`, `DECISIONS.md` and `BACKLOG.md`. Milestones are git tags (`milestone/M1`, `milestone/M2`, …).

## Status

- **M2:** approved UX baseline.
- **M3 candidate:** the complete leave-disruption workflow, admin access and a performance rewrite. It is awaiting owner review; see `SPRINT_7_REVIEW.md`.
- **Next:** Google Calendar migration and integration, then production hosting.

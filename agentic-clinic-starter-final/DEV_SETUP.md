# Local development setup

This runs the TypeScript Next.js development site in `web/` with PostgreSQL-backed scheduling. It does not execute the legacy prototype or partial S4 files.

## First-time setup

1. Install the pinned web dependencies: `npm --prefix web install`.
2. Generate missing local-only DEV and TEST credentials: `node scripts/ensure-local-env.mjs`. Existing non-empty values are retained.
3. Start the two PostgreSQL 17 containers: `npm run infra:up`.
4. Confirm the containers and isolated test connection: `npm run infra:test`.
5. Start the site: `npm run dev`, then visit `http://localhost:3000`.

The legacy root `start` and `test` scripts remain unchanged. `npm run web:test` runs the new database test; `npm run infra:test` validates the DEV/TEST environment separation and runs it.

## Daily commands

| Command | Purpose |
|---|---|
| `npm run infra:up` | Start local DEV and TEST PostgreSQL services. |
| `npm run dev` | Start the Next.js development site on port 3000. |
| `npm run web:test` | Run the isolated test-database smoke test. |
| `npm run infra:test` | Validate environment separation and test PostgreSQL. |
| `npm run infra:down` | Stop containers while preserving their named volumes. |
| `npm run infra:logs` | Show recent PostgreSQL logs without credentials. |

Both services use PostgreSQL 17, matching the intended Neon-compatible major. DEV uses port 5432 and `clinic_postgres_dev_data`; TEST uses port 5433 and `clinic_postgres_test_data`. They use separate local credentials and databases. `.local/` stays ignored by Git; it is not encrypted.

Do not use TEST credentials against DEV or UAT. The DEV site has migrations, synthetic data and scheduling logic. UAT has not been provisioned.

## Current Calendar workflow

Record one or more therapist leaves first. Schedule conflicts appear on the Calendar, and each issue's Review options button shows conflict-free assigned therapists. Auto resolve runs once per shared pod draft and shows all proposed and unresolved sessions before suggestions are applied. The admin can then edit assignments, dates, durations and rooms, or add one-off/weekly sessions on top of the draft. Recheck conflicts refreshes the view. Commit schedule publishes the whole draft only when no outstanding issue remains; Discard draft removes only uncommitted schedule changes and keeps recorded leave. Committed changes create notification tasks for the affected clients and therapists; tasks can be marked handled after manual follow-up. No messages are sent automatically.

The site currently has one trusted local administrator context under the ignored `CLINIC_DEMO_MODE=1` setting. Pod selection in this DEV build is not production access control. Clinic-managed sign-in, an authenticated admin pod-assignment page and pod-scoped JSON reads are in development; scheduling writes are not yet connected. Without explicit demo mode, the main scheduling page and write/PDF APIs return a setup/503 response. UAT remains held; do not use the site with real client data.

## Create the first admin

Owner decision D-B013: the first real admin is created once with a local command-line tool, after the auth migration is applied and the database is running. From `agentic-clinic-starter-final/`, in an interactive terminal:

```
node scripts/create-first-admin.mjs --env dev
```

It asks for full name, email, then the password twice with hidden input (minimum 8 characters, D-B019). Passwords are never accepted as arguments, environment variables or files. It loads the matching ignored `.local/<env>.env` and creates the user with role admin; public sign-up stays disabled. It prints only email, id and pod. Add `--pod <id>` to assign a pod immediately; otherwise assign one on the protected config page (`/config/admins`) after signing in. The tool refuses to run if any admin already exists; create further admins from the config page while signed in (`--allow-additional` overrides this and is not normally needed). Use `--env test` only for synthetic TEST accounts.

See ACCESS_SETUP.md for more detail.

## Docker prerequisite

`npm run infra:up` requires Docker Desktop's Linux engine to be running. Check it with `docker version --format '{{.Server.Version}}'`; it must print a server version before Compose can start PostgreSQL. If the engine pipe is unavailable, open Docker Desktop and resolve its normal Windows/WSL startup requirement, then repeat the command. Do not substitute SQLite or point tests at DEV.

Demo mode (`CLINIC_DEMO_MODE=1`) works only with `npm run dev` and the test suite. In a production build (`next build` then `next start`, NODE_ENV=production) the app refuses to serve clinic data when the flag is set: pages show a setup error and the clinic and report APIs return 503 "Demo mode is not allowed in a production build". Use sign-in (unset the flag) for anything other than `npm run dev`.

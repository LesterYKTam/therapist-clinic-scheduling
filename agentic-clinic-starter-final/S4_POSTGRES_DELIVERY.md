# Sprint 4 PostgreSQL delivery

The Next.js application uses PostgreSQL 17 only. Its `clinic_state` record stores the validated clinic configuration, setup records, series and concrete committed occurrences as one transactional JSON document. This favors reviewability and atomic full-schedule validation at the approved small-clinic scale (initially 30 therapists and 100 clients). It is not a SQLite fallback or an in-browser state store.

Migration version 1 creates `schema_migrations` and `clinic_state` idempotently. Startup seeds only the approved synthetic baseline when no state exists. Each write uses `SERIALIZABLE` plus `SELECT … FOR UPDATE`, rechecks the supplied revision, runs the scheduling validator, then persists the whole next state. Preview does not write and its revision is required at commit. API input is whitelisted; it cannot commit a supplied snapshot, pod, role or identity.

Rollback: deploy the preceding application version against the same schema; it will leave this additive schema untouched. Before a future destructive schema migration, take a PostgreSQL backup and add an explicit down/restore runbook. Do not point TEST routines at DEV: tests verify their dedicated test connection and reset only their dedicated tables.

The retained root SQLite/prototype files are historical reference only. Production paths use `web/lib/clinic-store.mjs` and the PostgreSQL `DATABASE_URL`.

## Remaining validation note

The connected Calendar, Setup and Reports paths have build and dedicated-PostgreSQL integration coverage. Browser interaction verification is still required before sprint review: this desktop session has no controllable browser surface and its in-app browser reports unavailable. It must cover adding a Clinic and Home session, preview/commit/reload, staff/client/cap/ranked-assignment setup edits and lifecycle blockers, one-occurrence and this-and-future edit/cancel, and printable committed-month report. This is a validation gap, not an indication that S4 is complete.

## PM verification update
Root browser access succeeded on2026-09-21; previous browser unavailable note is obsolete. Basic Add popup/preview/commit/reload and populated/empty reports verified. PM required and worker built proper calendar/popup and additional Setup controls. Latest build passes;6 dedicated TEST tests passed before final UI-only fixes. Remaining browser scenarios and date-input regression are in PRODUCT_STATE.md. Reports need client names and staff role labels; printable output not yet verified. S4 remains incomplete.

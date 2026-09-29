# Environments

Status: local DEV and TEST foundation verified on 2026-09-21 with Docker Compose and PostgreSQL 17. UAT remains a target environment and is not provisioned.

| Environment | Application | Database | Configuration |
|---|---|---|---|
| DEV | Local PC, `http://localhost:3000` | Local PostgreSQL 17, port 5432, persistent `clinic_postgres_dev_data` volume | .local/dev.env |
| TEST | Local PC / future CI | Separate local PostgreSQL 17, port 5433, persistent `clinic_postgres_test_data` volume | .local/test.env / CI secrets |
| UAT | Vercel, plan eligibility to confirm | Separate Neon PostgreSQL, Free tier proposed | Vercel environment variables; optional .local/uat.env |

Use the same PostgreSQL major version, schema and migrations across environments. No SQLite fallback. Never share test credentials with DEV/UAT. Use synthetic fixtures only.

## URLs and credentials
Record ordinary site/dashboard URLs here once provisioned. No site URLs have been assigned yet. A database URL containing credentials is secret and must not appear here. Account passwords and MFA recovery codes belong in the owner's password manager. .local is ignored by Git but not encrypted; it does not opt out of non-Git sync tools.

## Local development readiness
1. Local app starts with a repeatable command and connects to DEV PostgreSQL.
2. Tests run against separate PostgreSQL and cannot reset DEV/UAT data.
3. Deferred UAT readiness: a protected UAT URL loads a known build with a separate Neon database and synthetic seed data.
4. Migrations, smoke checks, deployment promotion, rollback and secrets loading are documented and exercised.
5. Hosting plan/account access is settled; no paid purchase is implicit. Infrastructure exit approved and remaining important product rules recorded.

Existing mocks and partial S4 work remain preserved. Root `npm run dev` loads `.local/dev.env` for the Next.js site. Root `npm run web:test` loads `.local/test.env`; `npm run infra:test` additionally rejects a URL that does not target the dedicated local test database. See `DEV_SETUP.md` for startup, shutdown and smoke-check commands.

The ignored DEV/TEST files now also contain unique Better Auth secrets. `CLINIC_DEMO_MODE=1` is local-only and keeps the trusted single-admin demo usable during access-control development. It must not be set for UAT or production; absent demo mode, scheduling reads/writes fail closed until pod-scoped authentication is fully connected. `web/auth-schema.sql` records the generated PostgreSQL account/session schema; local DEV and TEST auth tables were migrated separately. No real admin account or UAT environment has been provisioned.

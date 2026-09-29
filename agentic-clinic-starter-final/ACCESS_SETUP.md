# Admin access implementation checkpoint

Owner decisions D-B009–D-B011 require equal-rights clinic-managed admins, a config-page pod assignment before pod-specific access, and clinic-wide shared room management. The local `localhost:3000` DEV instance remains an explicit synthetic single-admin demo. Do not use it with real client data or provision UAT yet.

Better Auth 1.7.6 uses PostgreSQL account and session tables; its generated schema is `web/auth-schema.sql`. Local DEV and TEST were migrated separately with the matching `auth@1.7.6` CLI and ignored environment files. Public sign-up is disabled. Outside explicit local `CLINIC_DEMO_MODE=1`, the scheduling page, JSON and PDF reports, Setup and schedule mutations require a current admin session and pod assignment. The page and JSON responses include only that pod's people, bookings, leave, drafts and notifications; shared rooms remain visible. The server calculates workable options against the full clinic schedule, and commits still enforce clinic-wide room collisions. Setup merges only the assigned pod's people plus shared rooms/config, preserving other pods. Transactions recheck the acting admin's current pod before writes. Unassigned admins can use the protected admin configuration page to obtain an assignment.

The first-admin bootstrap is the one-time local command described under "Create the first admin" below (D-B013). Do not put passwords in command arguments, Git, logs, or this document. No real admin has been created.

Access checks now cover two concurrent synthetic admins, reassignment during an open draft, tampered pod IDs, unassigned accounts, shared-room edits, signed-in page scoping and cross-pod PDF rejection. The isolated PostgreSQL tests and a separate production-mode HTTP smoke pass. The first real admin has not been bootstrapped yet. Before UAT, verify interactive account creation/sign-in/config/Calendar/Setup/Reports flows and final deployment settings with a clean environment. Keep `CLINIC_DEMO_MODE` absent outside local DEV/TEST.

## Create the first admin

Owner decision D-B013: the first real admin is created once with a local command-line tool, after the auth migration is applied and the database is running. From `agentic-clinic-starter-final/`, in an interactive terminal:

```
node scripts/create-first-admin.mjs --env dev
```

It asks for full name, email, then the password twice with hidden input (minimum 8 characters, D-B019). Passwords are never accepted as arguments, environment variables or files. It loads the matching ignored `.local/<env>.env` and creates the user with role admin; public sign-up stays disabled. It prints only email, id and pod. Add `--pod <id>` to assign a pod immediately; otherwise assign one on the protected config page (`/config/admins`) after signing in. The tool refuses to run if any admin already exists; create further admins from the config page while signed in (`--allow-additional` overrides this and is not normally needed). Use `--env test` only for synthetic TEST accounts.

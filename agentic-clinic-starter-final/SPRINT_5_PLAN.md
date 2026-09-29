# Sprint 5 — Durable leave and outstanding conflicts

Goal: an admin can record multiple whole- or partial-day leaves before starting schedule editing, and see one truthful, persistent conflict list for affected committed sessions.

Scope: US-002 and US-003. Persist leave in PostgreSQL with clinic-local interval validation, compute affected committed sessions without duplicates, show causal leave and count on the Calendar, and provide Recheck conflicts. Leave reporting does not mutate or draft the schedule. Existing committed normal booking and monthly reports remain intact.

Out of this increment: leave amendment/withdrawal (Q-005), Auto resolve, shared schedule draft editing and commit (US-004–006), and moved-session duration changes (Q-003). Those remain required in the autonomous development milestone. UAT remains held.

Demo: commit a future session for therapist A; record a partial-day leave covering it; verify one conflict while the session remains committed; record overlapping leave for A and leave for therapist B; verify a refreshed, deduplicated conflict set and causal leave; navigate to Setup/Reports without starting a schedule draft; reload to verify persistence. A future session outside leave remains unaffected.

Validation: PostgreSQL TEST scenarios cover interval boundaries, persistence, deduplication and unchanged committed sessions. Build and browser walkthrough cover the Calendar status and leave form. The next increment may begin internally after validation; no routine owner approval stop in phase 3.

## Internal result — 2026-09-23

US-002 and US-003 are Done for this defined increment. PostgreSQL TEST 11/11 and production build pass. Browser verified the leave dialog, a partial-day leave affecting a committed Home session, one persistent Schedule conflicts item and indicator after reload, and navigation to Setup while the conflict remains. Existing direct schedule commit is blocked while outstanding leave conflicts exist; the shared draft resolver is the next required scheduling path. The leave is synthetic DEV data. No milestone approval or tag is inferred.

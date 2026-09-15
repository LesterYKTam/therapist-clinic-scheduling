# Sprint 2 demo

Requires Node.js 24.13.0 (verified); no package installation.

```powershell
node --test
node app.mjs
```

Open http://127.0.0.1:3000. Stop with Ctrl+C. Inventory is saved in `data/clinic.sqlite`, ignored by Git. Node may print an experimental warning for its built-in SQLite binding.

1. Fresh fixture has 15 rooms shared across Maple and Cedar. Maple has a 60-minute clinic session in Room 1 and a 90-minute Home session, which reserves no room. Cedar uses Room 2.
2. Scroll to Shared rooms and select Add room. Switch pods and confirm the same updated active count. Refresh any already-open second tab to see latest changes.
3. Stop and restart; confirm the new room persists.
4. Remove Room 1 or Room 2: removal is blocked and busy dates/times are shown without another pod's client details. The sessions stay unchanged.
5. Remove the unused newly added room: active count decreases. Its record is retained as inactive so historical references can remain intact.
6. `node --test` checks cross-pod room collisions, adjacent/non-conflicting intervals, home sessions without rooms, invalid fixtures, ongoing/future removal blocks, historical references, concurrent store connections, persistence, forms, pod isolation and read-only sessions.

## Repeatable reset
Stop the app first. Preserve the existing synthetic database by moving `data/clinic.sqlite` to an unused backup filename in the same folder, then restart. If using PowerShell, choose a destination that does not already exist:

```powershell
Move-Item -LiteralPath '.\data\clinic.sqlite' -Destination '.\data\clinic-before-reset.sqlite'
node app.mjs
```

Startup seeds exactly 15 rooms only when no clinic snapshot exists. Tests use isolated temporary databases and do not reset the live demo. Removal uses a fixed synthetic clock of September 14, 2026, 00:00 UTC; this is not an approved clinic timezone. Sample occurrences are supplied; future recurrence generation is not implemented.

Limitations: local synthetic prototype; demo pod selector is not authentication. Session editing, room-selection proposals, leave batches, weekly-cap calculations, concurrent batch commits, production access controls and deployment remain deferred. No separate travel calculation. Inventory changes are the only editable workflow in S2.

### Unified calendar review
At http://127.0.0.1:3001, report sample leave. Calendar shows the draft on the left and conflicts on the right. Navigate to Shared rooms, then click the conflict-count alert to return. Click a conflict for suggestions; close to continue calendar edits or choose an option and observe the count update. All issues must be resolved before commit.

### Calendar creation, Setup and Reports
Refresh port 3001. Clear state shows green No conflicts. Calendar > Add session offers one-off or weekly; preview then save (or Save to draft during a batch). Weekly demo shows the first occurrence only. Setup holds Rooms, Staff, Clients and maximum-hours mock configuration. Reports selects a staff member and month; September 2026 has sample sessions, other months may be empty. Print / save PDF uses the browser print dialog. Reports exclude draft changes.

# Sprint 1 demo

Requires Node.js 22 or later. No packages or installation needed.

From this project directory:

```powershell
node --test
node app.mjs
```

Open http://127.0.0.1:3000. Stop with Ctrl+C. Restarting reconstructs the exact same in-memory synthetic records; no real data is loaded or modified.

1. Maple pod shows Alex Demo, two committed dates (September 14/17, 2026), and two distinct weekly templates (Monday/Thursday).
2. Client assignments show Morgan/Taylor/Casey Maple as major/second/third. Therapist caps are 24/30/20 hours.
3. Select Cedar pod: Sam Sample and Cedar therapists appear; Alex and Maple therapist records are absent.
4. Run `node --test` to demonstrate that cross-pod and duplicate ranked assignments are rejected, views leave committed data unchanged, and HTTP writes are refused. This is automated fixture validation, not an assignment-editing UI.
5. Restart and repeat; dates and records stay deterministic.

Architecture: dependency-free Node HTTP server with server-rendered HTML, in-memory fixtures, and detached read models. Bound to loopback only. Pod selection is a demonstration filter, not authentication. No recurrence engine, persistence, schedule editing, room reservation, travel calculation, production access control, or deployment is included.

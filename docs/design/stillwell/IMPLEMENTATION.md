# Implementing the Stillwell redesign

Files in this folder:

- `README.md` — the design system guide: principles, colors, type, spacing, session states, screen guidance.
- `tokens.json` — exact token values (colors, type styles, spacing, radius, shadow).
- `reschedule-mockup.dc.html` — the clickable mockup's source. The layout is HTML with inline styles; the behaviour (conflict list → options → preview → draft → commit) is in the `Component` class at the bottom. It needs the Claude design runtime to run, so use it as a reference, not a page to open.

## Phases (one PR each)

1. **Tokens.** Turn `tokens.json` into CSS variables (or the Tailwind theme), load Inter, replace hard-coded colors. No layout change.
2. **Shell.** Light sidebar, pod and role under the logo, "Admin configuration" as a normal nav item, header with "Add session" as the only primary button.
3. **Day by therapist view.** New calendar view beside the existing week view: hours down the side, one column per therapist, leave shaded, session cards with states (normal, conflict, draft, moving, cancelled).
4. **Resolve panel.** Conflict list → conflict detail (client, therapists at that hour, free rooms) → option cards (fit, availability, room, exact changes) → preview on calendar → add to draft → commit. Reuse the existing workable-options, auto-resolve, staging and commit logic. New data needed: past session count per client and therapist.
5. **Clean-up.** Remove the old stacked side panel; restyle Setup and Reports.

## Open decisions

- Does the app rank options (e.g. "Best fit") or just show facts?
- Maximum cascade depth (Setup already has a setting).
- "This session only" vs "all sessions during the leave".

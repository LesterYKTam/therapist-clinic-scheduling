# Stillwell design: source of truth

The **living design** is kept in Claude design artifacts. This folder is a **versioned snapshot** of them, pulled into the repo so the code has a fixed reference and git history shows when the design changed. **Edit the design in Claude, not here.** Then re-pull.

| Snapshot folder | Artifact | Type | Version pulled |
|---|---|---|---|
| `design-system/` | [Stillwell](https://claude.ai/artifact/JAZ7rLaUMm7mLz9awYhHLB) | Design System | `1792639864-8672` (v6) |
| `reschedule-flow/` | [Stillwell Reschedule Flow](https://claude.ai/artifact/7LB66mDBf8Jb23cmJRkL9G) | Design (canvas) | `1792639840-314d` (v3) |
| `IMPLEMENTATION.md` | the design hand-off note (exported zip, 2026-10-21) | — | — |

The artifacts are private to the owner's Claude account, so the links work only for the owner.

Pulled 2026-10-22. First pull was byte-identical to the exported `stillwell-design.zip`. Updated the same day by the PM to apply D-B021: the mockup option rules, "Auto resolve all", the "View pod" control, and the design guide's "Business rules the design must respect" section.

## What each file is
- `design-system/README.md`: the design guide, covering principles, voice, colour, session states, typography, spacing and per-screen guidance.
- `design-system/tokens.json`: exact token values. This is the input for the app's generated CSS variables (planned, redesign phase 1).
- `design-system/design-system.json`: the design system's index, which holds its metadata.
- `design-system/components/Cover/preview.html`: the design system's cover card.
- `reschedule-flow/Main.dc.html`: the clickable "resolve a conflict" mockup. It needs Claude's design runtime to run, so treat it as a reference.
- `reschedule-flow/canvas.json`: the canvas index. It links the mockup to the Stillwell design system.

## Status in this project
- The five design-versus-rule conflicts were resolved by D-B021 (keep the existing logic), and both artifacts were updated to match.
- No app code uses these files yet.

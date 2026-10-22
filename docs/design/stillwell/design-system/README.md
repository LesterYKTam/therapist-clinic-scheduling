# Stillwell

The design system for Stillwell, the clinic workspace. Front desk and admin staff use it all day, mostly on desktop, mostly for scheduling. Every rule here aims to keep them fast and to keep a full working day from feeling tiring.

**Status:** version 2. It started from a design interview and was then checked against the live demo screens (Calendar, Setup, Reports). Components still need to be built.

## Principles

1. **Calm by default.** Most of the screen is neutral. Color is reserved for the few things that need attention (conflicts, drafts, leave) and for the one main action.
2. **Built for hour eight.** Use soft surfaces, tinted status colors instead of bold fills, and readable 14px body text. Nothing should flash or animate without a reason.
3. **Scan, don't read.** Times, names and status should be readable at a glance. Times use tabular numbers. Status always shows a word, never just a color.
4. **Drafts look like drafts.** Stillwell's core idea is "preview every change before it is committed." Committed sessions are solid. Staged changes are dashed and blue until they're committed.
5. **Use the whole screen.** Staff are on desktop monitors, so the calendar should fill the available width, and all seven days should fit without horizontal scrolling.

## Voice and copy

- Use the words the app already uses: Session, Pod, Room, Leave, Conflict, Stage, Commit.
- Buttons say exactly what happens: "Stage reschedule", "Commit 3 changes", "Record leave".
- Drop repeated role labels inside cards. Write "Dana Sampleton" with "with Morgan T." rather than "Dana Sampleton · Client / Morgan Testerson · Therapist". The card's layout makes the roles clear.
- Use one date format in the interface: `Tue, Oct 27` and `09:00 – 10:00`. Keep ISO dates like `2026-10-27` for exports only.

## Color

The palette is soft teal on a faintly green off-white. It's close to Stillwell's current blue-teal, so the change will feel like a refinement rather than a rebrand.

- **Surfaces:** `surface-page` behind everything, `surface-card` for panels and session cards, `surface-sunken` for table headers, empty days and the sidebar.
- **Text:** `ink` for content, `ink-muted` for secondary details only.
- **Primary (`primary`):** one main action per view ("Add session", "Commit"), the selected day, the active nav item and links.
- **Borders:** `border-subtle` for dividers and card outlines, `border-control` for form fields (3:1 contrast).
- **Feedback:** `danger`, `warning` and `success` are for text and icons.

### Session states

A normal committed session is a plain `surface-card` with a `border-subtle` outline. Only exceptions get a tint:

| State | Meaning | Treatment |
| --- | --- | --- |
| Committed | Normal booked session | `surface-card`, `border-subtle` outline, no tint |
| Staged | Draft change, not yet committed | `status-staged-bg`, dashed `border-staged` outline, "Draft" label |
| Conflict | Clashes with leave, a room or another booking | `status-conflict-bg`, "Conflict" label with a warning icon |
| Cancelled (staged) | Cancellation waiting to be committed | `status-cancelled-bg`, time struck through |
| Leave | Therapist unavailable | `status-leave-bg` block across the affected hours |
| Past / historical | Already happened; kept as a record | `status-past-bg`, muted text |

Rules:

- Always show the state word. Color alone isn't enough for color-blind staff or on poor monitors.
- Conflicts are the only state that uses a warm color, so they're the first thing the eye finds.
- Use one conflict indicator: the count badge at the top, and the cards marked in the calendar. The side list is where you review them.

## Typography

**Inter** (Google Fonts), falling back to `Segoe UI` and the system font.

| Style | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `page-title` | 20 / 28 | 600 | One per screen |
| `section-title` | 16 / 24 | 600 | Panel and dialog headings |
| `body` | 14 / 20 | 400 | Default text, table cells |
| `body-strong` | 14 / 20 | 600 | Client names |
| `label` | 12 / 16 | 500 | Form labels, column headers, state pills |
| `caption` | 12 / 16 | 400 | Room, therapist, helper text |
| `time` | 13 / 18 | 500 | Session times; always `tabular-nums` |

12px is the floor. The current calendar cards use about 10px text, which is the main source of eye strain.

## Spacing and shape

- **Spacing** follows a 4px base: `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-6` 24, `space-8` 32.
- **Corners:** `radius-sm` (4px) for session cards and pills, `radius-md` (6px) for buttons and inputs, `radius-lg` (8px) for panels.
- **Separate with borders, not shadows.** `shadow-overlay` is only for dropdowns, popovers and dialogs.

## Screen guidance

### Calendar

- **Time grid:** Use a grid with hours down the left, instead of stacked lists. Sessions at the same time then sit side by side, and gaps in the day are visible. That matters at Wednesday 10:00 and 14:00, where 4–5 sessions run at once.
- **Session cards:** 3 lines at most: time (`time`), client (`body-strong`), then therapist and room on one `caption` line. For home visits, show a small "Home" label instead of a room.
- **Today:** today's column is tinted `primary-subtle`.
- **Width:** fit Mon–Sun to the width of the screen, with no horizontal scrollbar. Hide days the clinic is closed (Setup already knows which these are).
- **Side panel:** keep it to one job at a time. Conflicts by default; selecting a session or a conflict opens its options there. The draft editor and the leave list each get their own tab or drawer instead of being stacked below.
- **Header:** title on the left; "Add session" as the only primary button. "Record leave" and "Recheck conflicts" are secondary.

### Setup

- Panels sit side by side on wide screens; the rooms list becomes a compact table (name, active toggle) rather than full-width inputs.
- Days-open checkboxes become a row of toggle chips.

### Reports

- Content starts at the top of the page, not vertically centered.
- The form sits on one row: staff, month, Generate.

### Sidebar and navigation

- Light sidebar (`surface-sunken`) instead of dark navy. On an all-day screen, a big dark area beside a light one makes the eyes keep readjusting.
- "Admin configuration" is a normal nav item, not an underlined link.
- The pod name and role sit at the top of the sidebar, under the logo, since they set the context for everything.

### Focus and keyboard

Every interactive element shows a 2px `focus-ring` outline offset 2px.

## Not decided yet

- Dark mode (the tokens are named so it can be added later).
- Icon set.
- Logo treatment (the wordmark is set in Inter for now).
- Components: session card, button, input, select, state pill, side panel. These are next.

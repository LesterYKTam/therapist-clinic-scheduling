# M3 Review: Leave-disruption workflow, admin access and S7 fixes

Prepared by the Main PM (Claude Opus 5.5) for the Business Owner on 2026-09-29.
Branch: `wip/codex-handoff` (nothing merged to `master`; M1/M2 tags unchanged).
Decision requested: **APPROVE**, **CHANGE**, **REJECT** or **EXPERIMENT**. APPROVE creates `milestone/M3`.

## What you are reviewing

This is the complete approved requirements baseline, working end to end on the local DEV site with synthetic data:

1. An admin records therapist leave, including partial days.
2. The affected sessions appear as conflicts.
3. Auto resolve proposes safe changes, with the reason for each.
4. The admin reviews and applies them, edits the draft freely, and commits only when no conflicts remain.
5. Grouped notification tasks record who must be told.
6. Two equal admins sign in. Each edits only their own pod and can view the other pod read-only.

## Delivered since the Codex handoff (S7)

| Item | What changed for you |
|---|---|
| BUG-012 | **Speed at real clinic size.** A schedule check at 2,400 sessions takes about 35 ms instead of about 11 s. Auto resolve for a two-week leave takes about 16 ms; before, it did not finish in 10 minutes. |
| CHANGE-001 (D-B012) | Past sessions that overlapped leave show as **Historical alerts** and no longer block scheduling. |
| BUG-013 | Any single staged change can be removed, so a draft can no longer get stuck. |
| CHANGE-002 (D-B015) | New leave can be recorded while a draft is open. The draft refreshes, and editing or withdrawing existing leave waits for the draft to close. |
| BUG-014 | Auto resolve suggestions go stale only when something relevant to that pod changes, and Auto resolve can be run again afterwards. |
| US-016 (D-B014) | Auto resolve handles sessions held by a 2nd- or 3rd-ranked therapist. |
| CHANGE-003 (D-B017) | When a full therapist's week must be freed, the easiest session to move is chosen, then the latest in the week. |
| BUG-015 | Signed-in admins see the real reason an action failed. |
| BUG-016 | The sign-in-free demo mode is refused in any production build. |
| CHANGE-004 (D-B016) | One notification task per person per commit, listing all of that person's changes. |
| US-015 (D-B013, D-B019) | A first-admin command-line tool with a hidden password prompt. The password minimum is 8 characters. |
| US-017 (D-B020) | Every admin can view every pod read-only. Edits stay limited to their own pod. |
| TASK-011, BUG-017, BUG-018 | Missing rule tests; name masking fixed and then removed under D-B020; options now cover draft-added sessions. |
| Demo data | `node scripts/seed-demo.mjs --env dev` loads a realistic synthetic clinic with ready-made scenarios. |

## Evidence

- **Tests:** 75/75 automated tests pass against the isolated TEST database, and the production build passes.
- **Independent checks:** each item was built by the developer agent, checked by the PM, and verified independently by the QA agent. QA also ran randomised old-versus-new comparisons: about 1,100 states for the speed rewrite and 4,800 for the resolver changes.
- **End-to-end acceptance:** QA walked the full journey on a signed-in copy backed by TEST, covering steps A to J. All steps passed. One minor display bug was found and fixed: the client name was missing on staged cancellations.
- **Cross-pod safety:** 12 kinds of change sent to another pod were rejected by the server with 403.

## Your test script

Use **http://localhost:3001** and sign in as `admin@demo.com` (Maple pod).
Steps 8 onward change DEV data. To reset, run `node scripts/seed-demo.mjs --env dev` from the project folder. This replaces clinic data only; accounts are kept.

1. **Sign in.** The header shows "Maple pod · Admin" and the badge shows **5 conflicts**.
2. **Look at the lists.**
   - "Schedule conflicts · 5": Alex, Bailey and Charlie on Tue Oct 6; Dana and Emery on Wed Oct 7. All five are Morgan Testerson's sessions during Morgan's leave.
   - "Historical alerts · 1": Jules, Sep 24.
   - "Recorded leave · 2".
3. **Review options on Alex.** Taylor (Rank 2, Suggested) and Casey (Rank 3) are offered. Close.
4. **Auto resolve.** The proposal lists 5 changed sessions:
   - Alex, Bailey and Charlie go to Taylor.
   - Frankie goes to Jordan, marked "Moved because of Charlie", so the cascade shows its cause.
   - Dana goes to Riley (Rank 3).
   - "Still unresolved · 1" is Emery, with the stop reason.
   The badge still says 5, because nothing is committed.
5. **Apply to draft.** "Proposed changes · 5", "Outstanding in draft · 1".
6. **Fix Emery by hand.** Select Emery's Oct 7 14:00 session. Under "Move or change duration" choose Jordan, Oct 8, 14:00, and **Room 9**, then Stage reschedule. The draft shows no conflicts.
   - To see a blocked commit, try Room 1 first. It reports a room overlap and Commit stays disabled.
7. **Remove change** on the Emery move. The count goes back to 1 outstanding. Re-stage the move, then click Recheck conflicts.
8. **Commit schedule.**
   - The badge shows "No conflicts" and the historical alert remains.
   - The Notification worklist shows **one card per person**, each with Before and After lines.
   - Click Mark handled on one card.
9. **New leave during a draft.**
   - Stage any small change, such as moving Alex on Oct 13 to 16:00.
   - Record leave for Morgan on Oct 13, 09:00–17:00. It saves, and the draft's outstanding count refreshes.
   - Discard the draft, then withdraw that leave.
10. **View Cedar read-only.** Choose "Cedar pod" in View pod. You see the read-only banner, Cedar's 2 conflicts and real names, and no edit buttons. Open a Cedar staff report and its PDF.
11. **Back to Maple.** Reports → Morgan Testerson, October: only committed sessions appear. Download the PDF.
12. **Reset** with the seed command when you are done.

## Your decisions applied in this milestone

D-B012 to D-B020, D-P042 to D-P045, and the PM notes in DECISIONS.md.
- **PM note:** Setup errors caused by another pod's booking show its date and time. This is now moot, because D-B020 shows everything.

## Known limitations and follow-ups (not blocking M3)

**UX polish noticed in acceptance.** Proposed as a small review sprint:
- The staged-reschedule row doesn't show the new room.
- The header shows the viewed pod, not your own.
- The Session picker lists every session in the pod, which is long.
- The room-overlap message uses an internal session id.
- Withdraw leave has no confirmation.
- Handled notification tasks disappear, with no history.
- The PDF is about 6 MB because the font is embedded.
- The browser tab title says "Clinic development site".
- Setup is fully read-only while you view another pod, even though rooms are clinic-wide. Rooms are editable from your own pod.

**Behaviour to confirm:**
- While you have an open draft, the pod switcher, Setup and Reports are disabled until you commit or discard.

**DEBT-001: cleanup pass before UAT.** Covers:
- the database connection per request;
- untyped modules;
- the 48 KB UI file;
- dead legacy code;
- stale docs;
- the storage-model review (one JSON record versus tables).

**Still out of scope or held:**
- UAT hosting on Vercel and Neon.
- Real client data.
- Sending notifications. Tracking only is the spec's design.
- Q-002 time-movement limits and the Q-015 holiday calendar remain open for later.

## PM recommendation

**APPROVE M3.** The approved workflow is complete and was verified end to end. The remaining items are polish and pre-UAT cleanup, which fit the normal Scrum phase that follows. After approval I will:
1. Tag `milestone/M3`.
2. Merge the branch into `master`.
3. Propose the next sprint: UX polish, then DEBT-001, then UAT planning.

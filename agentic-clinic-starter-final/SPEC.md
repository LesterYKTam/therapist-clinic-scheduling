# Therapist Clinic Scheduling — Functional Specification

> Purpose of this document: describe *what* the system must do and *why*, in
> plain domain terms, so it can be handed to an autonomous coding agent (or a
> human) as the source of truth for implementation. Deliberately excludes
> tech stack, data schema, file structure, and API shape — those are
> implementation decisions for later, not part of the spec itself.

## Owner-approved workflow amendments (D-B007, 2026-09-23)

The main Calendar shows and updates the outstanding conflict list as schedule drafts change. A separate **Recheck conflicts** control lets an admin rerun validation on demand; commit always revalidates against the latest shared schedule and clinic-wide room inventory.

The clinic-wide Setup setting for automatic cascade depth is 0, 1, or 2, initially 1. Depth counts the number of other sessions displaced in one chain. Third-therapist fallback does not cascade. **Auto resolve** is an explicit admin action: it inspects all outstanding conflicts, proposes only safe changes for conflict types it supports, and lists every impacted/modified session plus unresolved items and reasons. It does not change the committed schedule.

The admin reviews the proposal and may apply its suggestions to the shared draft or discard those suggestions. After applying, the admin may keep editing the draft Calendar. **Commit schedule** is a separate final action, available only with zero outstanding conflicts. **Discard draft** abandons uncommitted schedule changes; recorded leave is retained and affected sessions remain issues under D-B006. These actions do not silently cancel sessions.

Leave and Setup inputs are saved independently before schedule editing. Multiple leave reports recompute one current conflict set; the admin may leave it outstanding and do other work. After the first uncommitted schedule edit, that admin stays in Calendar editing mode until **Commit schedule** or **Discard schedule changes**. Recheck conflicts and further Calendar edits remain available. Other admins may work; their relevant changes refresh the shared draft and are revalidated at commit. A draft resolution must not make the committed-schedule conflict indicator falsely show zero. Auto resolve runs once for an unchanged editing session; a changed input invalidates a pending proposal. See D-B008.

Under D-B009, each admin manages only their own pod's people, leave, sessions and draft. The shared rooms still require clinic-wide occupancy checks. An admin may change a session's duration as part of rescheduling it; the entire new booked interval is checked. Edits or withdrawals of recorded leave in a pod wait while that pod has an open shared schedule draft, then may proceed after commit or discard.

## 1. Purpose

The clinic (30 therapists, 100 clients) needs a system that keeps each
client's recurring therapy sessions correctly staffed, and that can
re-arrange affected sessions safely and transparently whenever a therapist is
unexpectedly or plannedly unavailable — without ever changing the real
schedule without a human admin's explicit sign-off.

## 2. Actors

- **Admin** — clinic staff who manage a fixed subset ("pod") of therapists
  and clients, report therapist leave, and review/approve/commit the
  resulting schedule changes.
- **Therapist** — clinic staff who hold sessions with clients. Not a system
  user in this spec; therapists don't log in or act directly.
- **Client** — receives sessions. Not a system user; acts only through the
  admin (no client self-service in this spec).

## 3. Core Concepts

Described conceptually — not a data model or schema.

- **Pod**: a fixed, non-overlapping partition of the clinic's therapists (and
  the clients they serve) assigned to one admin. A client's three assigned
  therapists always belong to the same pod as each other and as the client.
  No client or therapist belongs to more than one pod.
- **Therapist assignment**: every client has exactly three therapists ranked
  **major**, **2nd**, and **3rd**. Only these three may ever hold a session
  with that client — no other therapist is a valid substitute, however
  convenient.
- **Standing session**: a client's recurring weekly commitment (day, time,
  duration) — a client may have more than one per week. This is the
  template; a concrete calendar occurrence of it is a **session instance**.
- **Working hours cap**: each therapist has their own maximum working hours
  per week (caps differ between therapists). This bounds how many session
  instances a therapist can be assigned across all their clients in a given
  week.
- **Office presence**: every therapist is considered present and reachable
  during clinic office hours on every working day, whether or not they have
  a session booked at a given moment — the only thing that removes a
  therapist from availability is approved leave.
- **Leave**: a therapist reports being unavailable for one or more dates
  (holiday, planned in advance, or sick, ad hoc/short notice). Leave can be a
  single day or an extended range (e.g. two weeks).
- **Schedule draft**: one shared unfinished set of proposed schedule changes
  per pod. Recorded leave and saved Setup changes are separate committed inputs.
- **Issue**: one session instance that needs a new resolution because the
  therapist who was supposed to hold it is now on leave, or because
  resolving a different issue bumped this session as a side effect. A batch
  is "done" only when it has zero unresolved issues.
- **Resolution**: the outcome decided for one issue — reassigned to a
  different therapist and/or time, or cancelled.
- **Notification task**: a record that a client or therapist needs to be
  informed their session changed or was cancelled, created once a batch is
  committed. Informational only — this spec does not require actually
  sending an email/SMS, just tracking who needs to be told what.

## 4. Business Rules

1. A client may only ever have a session with their major, 2nd, or 3rd
   assigned therapist — never any other therapist in the clinic.
2. Whenever possible, the major therapist holds the client's session. Moving
   to the 2nd or 3rd therapist only happens when the major (or, in a chain,
   the next-preferred) therapist genuinely cannot.
3. A therapist cannot be assigned more session-hours in a calendar week than
   their individual weekly working-hours cap.
4. A therapist cannot be double-booked — no two of their sessions may overlap
   in time.
5. A therapist who is on reported leave for a given date cannot be assigned
   any session on that date.
6. Every client's major/2nd/3rd therapists must belong to the same pod as
   each other and as the client — this is enforced when a client's
   therapists are assigned, not just assumed.
7. No change to the real schedule happens without an explicit admin decision
   on every affected session — the system proposes, it never silently
   auto-applies, even when it's fully confident in a suggestion.
8. A schedule draft cannot be committed while it still has unresolved issues.

## 5. The Reassignment Procedure

Applied to each issue (a session instance whose therapist is now unavailable,
or which was bumped as a side effect of resolving another issue):

1. **Try the client's next-preferred available therapist** (2nd, if this is
   the client's major who went on leave) at the session's original day/time:
   valid only if that therapist is not themselves on leave that day, has no
   other session already booked at that time, and taking it on would not put
   them over their weekly hours cap.
2. **If that fails because of a specific scheduling clash** (the candidate
   therapist already has a different client's session at that time): attempt
   to move *that* other client's session to free the slot, following this
   same procedure for the bumped client (their own major/2nd/3rd order,
   excluding the therapist being freed up). This can cascade further — moving
   one client's session may require moving another's, and so on. Moving a
   session to resolve one issue never happens silently in the background —
   each bumped session becomes its own issue that gets resolved the same way
   as any other, with a visible link back to what caused it.
3. **If that fails only because of the weekly hours cap** (no single
   conflicting session, the therapist is just fully booked for the week):
   look for some other session currently on that therapist that could move to
   free up enough hours, using the same cascading approach.
4. **If cascading a 2nd-therapist assignment still doesn't produce a valid
   result, try the 3rd therapist** at the original day/time, using the same
   validity check as step 1 — but without further cascading (only the
   2nd-therapist path cascades; if the 3rd therapist can't take the original
   slot as-is, this step simply reports that).
5. **If nothing above works, the admin decides.** If the 3rd therapist was
   found valid in step 4, the choice is "assign to 3rd therapist" or "cancel
   this session." If even the 3rd therapist doesn't work, "cancel" is
   presented as the resolution, but the decision is still explicitly made by
   the admin, not applied automatically.

At every step, the system's suggestion is exactly that — a suggestion. The
admin can always accept it, or instead choose a different valid therapist/time
for that issue, or cancel the session, regardless of what the system proposed.

## 6. Workflow

1. **Record inputs.** An admin saves one or more therapist leaves, including
   partial-day intervals, and may save Setup changes before schedule editing.
   Each leave persists independently of a schedule draft.
2. **Conflicts surface immediately.** Affected committed sessions appear as
   outstanding conflicts. Another leave recomputes the list without duplicate
   session items. The admin may leave these conflicts outstanding and work on
   other tasks before beginning schedule edits.
3. **Begin schedule editing.** The admin explicitly runs Auto resolve or edits
   the Calendar. Auto resolve previews all proposed, impacted and unresolved
   sessions using Section 5 against the latest schedule and inputs. A proposal
   does not alter the committed schedule; the admin applies or discards it.
4. **Work in the shared draft.** After the first uncommitted schedule change,
   the admin remains in Calendar editing mode. They may edit further and use
   Recheck conflicts repeatedly. Cascades and manual edits refresh or reopen
   issues visibly. A fresh relevant input from another admin invalidates a
   pending proposal and refreshes the draft's conflict list.
5. **Commit.** Once all issues are resolved, the admin explicitly commits.
   The system revalidates the latest shared pod and clinic-wide room state,
   publishes all schedule decisions atomically, and creates notification
   tasks for clients and therapists affected by changes or cancellations.
6. **Discard schedule changes (alternative to commit).** The admin may
   discard the unfinished draft. No schedule change or notification is
   published. Recorded leave and saved Setup inputs remain, and unresolved
   committed-schedule conflicts stay visible.

## 7. Scale & Usability Expectations

- The workflow must work the same way whether a batch affects 1 session (a
  single therapist calling in sick for a day) or dozens of sessions across
  multiple weeks (an extended planned leave for several therapists at once) —
  the difference is volume, not a different process.
- Therapists and clients remain pod-scoped. Rooms are shared across pods, so separate admins can conflict over rooms; room availability must be checked clinic-wide before commit.
- All admins have equal administrative rights. A config page assigns each admin to a pod before pod-specific access, and any admin can change pod memberships later. Ordinary pod data and draft access follows the admin's current server-trusted assignment; all admins may manage clinic-wide room inventory (D-B010).
- Every proposed and resolved change must show *why* — which absence caused
  it, and (for a cascaded change) which other client's move made it possible
  — so an admin reviewing a large batch isn't just seeing "Client X moved to
  Dr. Y" with no context.

## 8. Explicitly Out of Scope (for this spec)

- Actually sending notifications (email/SMS/etc.) — only tracking that a
  notification is needed and to whom.
- Client self-service or client consent flows — the admin acts on the
  client's behalf.
- How a client's initial standing session (day/time/therapist) gets chosen in
  the first place — this spec covers keeping an existing schedule correctly
  staffed through disruptions, not initial optimal scheduling.
- Cross-pod backup coverage — accepted trade-off of the pod model (Section 3).
- Authentication/authorization mechanics, audit-log retention policy, and any
  other implementation-level concern.

## 9. Session location and resources — owner addition, 2026-09-14
Clinic sessions must reserve a room. Initially there are 15 rooms; room inventory must be configurable in the system. All rooms are interchangeable and shared across admins and pods; a room cannot host overlapping committed sessions. Draft changes must not alter committed room reservations before explicit admin commit. This supersedes section 7's original assumption that separate pods never conflict.

Some sessions occur at the client's home and do not need a clinic room. The admin books a longer session interval to accommodate commuting. No separate travel-time calculation, routing, or commute buffer is required now. The booked interval blocks the therapist's availability in full. Home visits follow normal session rules: the full admin-booked duration is used for therapist overlap checks and weekly hours caps. No separate commute accounting is required.



Room removal is blocked while future committed sessions reserve the room. The system shows the blocking bookings; it must not silently move or cancel them. Those bookings must be reassigned before removal succeeds (D-B004).

Manual override may propose an unavailable or over-cap assigned therapist, but any resulting conflict becomes an outstanding draft issue. Admin must resolve all outstanding issues before commit (D-B005); alerts do not authorize committing invalid assignments.

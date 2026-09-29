# Sprint 4 Review — PostgreSQL Normal Scheduling

Status: Internally complete on 2026-09-23. No owner acceptance or new milestone is claimed.

## Delivered and verified

The Next.js/TypeScript application uses PostgreSQL 17 for DEV and TEST. Setup saves configurable timezone, working days/hours, week start, rooms, staff caps, clients, and three ranked same-pod therapist assignments. Changes invalidating committed bookings are rejected with affected records. Normal Clinic and Home sessions use preview then explicit transactionally validated commit; Home reserves no room and its full booked duration counts. Weekly sessions use an editable end date and support selected-occurrence and this-and-future edits/cancellations. Committed monthly staff reports include role-labelled client and therapist, local dates/times, duration, location, and totals.

Nine dedicated PostgreSQL TEST integration tests and the production build passed. Browser checks on 2026-09-22 verified one-off Clinic/Home preview, commit and reload; three-occurrence weekly preview and commit; selected-occurrence edit; future edit of three occurrences and future cancellation of two; persistence after reload; Room 1 deactivation and therapist-cap reduction blocked by affected bookings; saved Room 2A rename; added Jordan Maple therapist and Jamie Demo client with changed rank 3, all persistent after reload; and September staff report showing three committed sessions totaling 225 minutes. All browser data is synthetic DEV data.

The report now offers a direct Download PDF action backed by the committed PostgreSQL report query, alongside browser print. The PDF integration test checks empty and committed reports, content, ordering, total and download headers. A sample PDF was rendered with Poppler and visually inspected, including José and 李; the browser also emitted a download event from the DEV report link. The embedded open-license font and provenance are documented in web/assets/fonts/README.md. The browser print dialog itself is not exposed by this in-app browser, but print CSS and window.print remain available. Full font embedding makes a short PDF about 6.4 MB; unsupported glyphs produce an explicit export error, while browser print remains an alternative.

## Architecture and rollback

`web/lib/clinic-store.mjs` holds a versioned clinic state document in PostgreSQL with serialized migration/seed, revision checks, SERIALIZABLE transactions and full-schedule validation. See `S4_POSTGRES_DELIVERY.md` for the migration and rollback notes. Existing SQLite/prototype material is historical and remains preserved; no production code path uses SQLite. No rollback has been executed.

## Deferred scope

Leave and cascade handling, shared draft conflict resolver, notifications, authentication/authorization and UAT remain outside Sprint 4. The approved phase-3 milestone continues after Sprint 4, subject to the open high-impact leave/cascade decisions. No messages are sent by the app.

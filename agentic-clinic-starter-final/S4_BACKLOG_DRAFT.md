# Sprint 4 Backlog Draft

Draft only; the PM will merge and set authoritative status after approval. Source: TASK-005, D-P035, D-P036.

### US-011
Type: STORY  
Title: Persist configurable clinic setup  
Description: Save timezone, working days/hours, week start, rooms, therapists, clients, ranked in-pod assignments and weekly caps.  
Source / reason: D-P036; accepted Setup UX.  
Acceptance criteria: Configuration and active records survive restart; each client has exactly three distinct ranked in-pod therapists; invalid identity/assignment/cap data is rejected; a change that invalidates committed bookings is blocked and lists blockers, subject to owner lifecycle decision.  
Priority: P0  
Status: PROPOSED  
Sprint: S4 candidate  
Dependencies: Lifecycle decision; migration plan  
Discovery class: ADJACENT

### US-012
Type: STORY  
Title: Commit one-off normal sessions  
Description: Preview then atomically save a one-off Clinic/room or Home session.  
Source / reason: D-P035/D-P036; Calendar UX.  
Acceptance criteria: Committed records survive reload; transaction-time shared validation rejects invalid setup, client/therapist/room conflicts, outside-hours and weekly-cap breaches; Home reserves no room and full duration counts; no leave, draft or solver side effect occurs.  
Priority: P0  
Status: PROPOSED  
Sprint: S4 candidate  
Dependencies: US-011; TASK-006  
Discovery class: ADJACENT

### US-013
Type: STORY  
Title: Commit bounded weekly session series  
Description: Materialize and maintain weekly committed occurrences using D-P036 defaults.  
Source / reason: D-P034/D-P036.  
Acceptance criteria: Required editable end date defaults to 12 weeks; all occurrences validate and save atomically; past occurrences stay unchanged; occurrence-only and this-and-future updates are atomic and reject conflicts; configured working days apply with no automatic holiday calendar.  
Priority: P0  
Status: PROPOSED  
Sprint: S4 candidate  
Dependencies: US-011/012 persistence and conflict tests; TASK-006; lifecycle decision  
Discovery class: ADJACENT

### US-014
Type: STORY  
Title: Generate committed staff monthly reports  
Description: Produce a readable staff/month schedule from committed sessions.  
Source / reason: D-P032/D-P034.  
Acceptance criteria: Report lists local ordered committed sessions, duration, location/room and monthly total; empty months are explicit; newly committed one-offs and series occurrences appear after reload; printable/saveable layout is verified.  
Priority: P1  
Status: PROPOSED  
Sprint: S4 candidate  
Dependencies: US-012; US-013 for recurrence content; TASK-006  
Discovery class: ADJACENT

### TASK-006
Type: TASK  
Title: Define shared calendar policy and verification fixtures  
Description: Implement one configurable local calendar/time calculation boundary and deterministic fixtures used by normal booking and reporting.  
Source / reason: D-P036.  
Acceptance criteria: Timezone, office hours, week start, overlap, date grouping, cap calculation and DST use one policy; tests cover configured defaults and transaction/stale-write behavior; migration/rollback is reviewable.  
Priority: P0  
Status: PROPOSED  
Sprint: S4 candidate  
Dependencies: US-011 configuration  
Discovery class: ADJACENT

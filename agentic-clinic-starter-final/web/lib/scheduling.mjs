/** Web-local copy of the accepted pure S4 scheduling policy. */
/** Shared local-calendar policy for committed normal scheduling (S4). */
const DAY_MS = 86400000;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_CONFIG = Object.freeze({
  timezone: 'America/Toronto', workingDays: [1, 2, 3, 4, 5], open: '09:00', close: '17:00',
  weekStart: 1, recurrenceWeeks: 12, cascadeDepth: 1
});

export function initialState() {
  const pods = [{id:'a', name:'Maple pod'}, {id:'b', name:'Cedar pod'}];
  const therapists = pods.flatMap(p => ['Morgan', 'Taylor', 'Casey'].map((name, index) =>
    ({id:`${p.id}-t${index + 1}`, pod:p.id, name:`${name} ${p.name.split(' ')[0]}`, capHours:[24,30,20][index], active:true})));
  const clients = pods.map(p => ({id:`${p.id}-c1`, pod:p.id, name:p.id === 'a' ? 'Alex Demo' : 'Sam Sample', active:true, assigned:[`${p.id}-t1`, `${p.id}-t2`, `${p.id}-t3`]}));
  return {schema:2, revision:0, config:structuredClone(DEFAULT_CONFIG), pods, therapists, clients,
    rooms:Array.from({length:15}, (_, i) => ({id:`room-${i + 1}`, name:`Room ${i + 1}`, active:true})), series:[], sessions:[], leaves:[], drafts:[], notifications:[]};
}

const parseDate = date => {
  if (!isoDate.test(date)) throw new Error('Date must use YYYY-MM-DD.');
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0,10) !== date) throw new Error('Date is not valid.');
  return ms;
};
const minutesAt = value => {
  if (!clock.test(value)) throw new Error('Time must use HH:MM.');
  const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute;
};
const formatters = new Map();
const localCache = new Map();
const validZones = new Set();
const weekKeyCache = new Map();
const formatted = (ms, zone) => {
  let formatter=formatters.get(zone);
  if (!formatter) { formatter=new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}); formatters.set(zone,formatter); }
  const parts = formatter.formatToParts(new Date(ms));
  const at = type => parts.find(p => p.type === type)?.value;
  return {date:`${at('year')}-${at('month')}-${at('day')}`, time:`${at('hour')}:${at('minute')}`};
};

/** Convert a wall-clock appointment to an instant, rejecting spring DST gaps. Ambiguous fall times choose the earlier instant. */
export function localInstant(date, time, zone) {
  const cacheKey=`${zone}|${date}|${time}`; if (localCache.has(cacheKey)) return localCache.get(cacheKey);
  parseDate(date); minutesAt(time);
  if (!validZones.has(zone)) { try { new Intl.DateTimeFormat('en', {timeZone:zone}).format(); } catch { throw new Error('Configured timezone is invalid.'); } validZones.add(zone); }
  const base = Date.parse(`${date}T${time}:00Z`);
  // Only the zone offsets in force within +/-14 h of the wall time can produce this wall time, so sample those (a handful of
  // formatter calls) instead of probing every 15-minute offset. Ambiguous fall times still choose the earlier instant.
  const offsets = new Set();
  for (const probe of [base - 14 * 3600000, base, base + 14 * 3600000]) {
    const wall = formatted(probe, zone); offsets.add(Date.parse(`${wall.date}T${wall.time}:00Z`) - probe);
  }
  const candidates = [];
  for (const offset of offsets) {
    const candidate = base - offset;
    const actual = formatted(candidate, zone);
    if (actual.date === date && actual.time === time) candidates.push(candidate);
  }
  if (!candidates.length) throw new Error(`Local time ${date} ${time} does not exist in ${zone} (DST transition).`);
  const result=Math.min(...candidates); localCache.set(cacheKey,result); return result;
}

export function interval(session, config) {
  const start = localInstant(session.date, session.time, config.timezone);
  return [start, start + Number(session.minutes) * 60000];
}
export function leaveInterval(leave, config) {
  const start = localInstant(leave.startDate, leave.startTime, config.timezone);
  const end = localInstant(leave.endDate, leave.endTime, config.timezone);
  if (end <= start) throw new Error('Leave end must be after its start.');
  return [start, end];
}
export function leaveConflicts(data) {
  const leaves = data.leaves || [];
  if (!leaves.length) return [];
  const byTherapist = new Map(); // leave intervals are computed once per therapist, not once per session
  const forTherapist = (therapist) => {
    let list = byTherapist.get(therapist);
    if (!list) { list = leaves.filter((leave) => leave.therapist === therapist).map((leave) => ({ leave, span: leaveInterval(leave, data.config) })); byTherapist.set(therapist, list); }
    return list;
  };
  return data.sessions.flatMap((session) => {
    const [start, end] = interval(session, data.config);
    const causes = forTherapist(session.therapist).filter(({ span }) => start < span[1] && span[0] < end).map(({ leave }) => leave);
    return causes.length ? [{ sessionId: session.id, session, leaveIds: causes.map((leave) => leave.id), leaves: causes }] : [];
  });
}

/** Committed sessions with the pod's draft applied. Shares unchanged records with `data`; only touched sessions are copied. */
export function draftCandidate(data, pod) {
  const draft = data.drafts?.find((item) => item.pod === pod);
  const candidate = { ...data, sessions: data.sessions.slice(), series: data.series.slice() };
  const stale = [];
  const changes = draft?.changes || [];
  if (!changes.length) return { candidate, stale };
  const byId = new Map(); for (const session of candidate.sessions) if (!byId.has(session.id)) byId.set(session.id, session);
  const clientPod = new Map(); for (const client of candidate.clients) if (!clientPod.has(client.id)) clientPod.set(client.id, client.pod);
  const replace = (from, to) => { candidate.sessions[candidate.sessions.indexOf(from)] = to; byId.set(to.id, to); };
  for (const change of changes) {
    if (change.kind === 'add') {
      if (change.series && !candidate.series.some((item)=>item.id===change.series.id)) candidate.series.push(structuredClone(change.series));
      const added = structuredClone(change.session);
      candidate.sessions.push(added); if (!byId.has(added.id)) byId.set(added.id, added);
      continue;
    }
    const session = byId.get(change.sessionId);
    if (!session || clientPod.get(session.client) !== pod) {
      stale.push(change.sessionId);
      continue;
    }
    if (change.kind === 'cancel') { candidate.sessions.splice(candidate.sessions.indexOf(session), 1); byId.delete(session.id); }
    else if (change.kind === 'assign') replace(session, { ...session, therapist: change.therapist });
    else if (change.kind === 'reschedule') replace(session, Object.assign({ ...session }, {therapist:change.therapist,date:change.date,time:change.time,minutes:change.minutes,location:change.location,room:change.room}));
  }
  return { candidate, stale };
}

const sortKey = (session) => `${session.date||''}T${session.time||''}:${session.id}`;
const byIdMap = (items) => { const map = new Map(); for (const item of items) if (!map.has(item.id)) map.set(item.id, item); return map; };
const shapeLookups = (data) => {
  const clients = byIdMap(data.clients), therapists = byIdMap(data.therapists), rooms = byIdMap(data.rooms), series = new Set(data.series.map((item) => item.id));
  return { client: (id) => clients.get(id), therapist: (id) => therapists.get(id), room: (id) => rooms.get(id), series: (id) => series.has(id) };
};

/**
 * Indexed view of one pod's draft candidate. Sessions sit in per-therapist, per-client and per-room buckets sorted by start, so an
 * overlap query touches only neighbours, and each in-pod session keeps its issue reasons. `move` reassigns one session's therapist and
 * re-evaluates only the sessions it can affect (itself, its overlap neighbours, its old and new therapist-weeks); `undo` reverts it.
 */
class DraftEngine {
  constructor(data, pod) {
    const { candidate, stale } = draftCandidate(data, pod);
    this.pod = pod; this.candidate = candidate; this.config = candidate.config;
    this.lookups = shapeLookups(candidate);
    this.clients = byIdMap(candidate.clients); this.therapists = byIdMap(candidate.therapists);
    this.leaves = candidate.leaves || []; this.leaveCache = new Map();
    this.staleEntries = stale.map((id) => ({ sessionId: id, session: null, reasons: ['The original session changed or was removed. Recheck this draft.'] }));
    this.entries = []; this.byId = new Map();
    this.buckets = { therapist: new Map(), client: new Map(), room: new Map() };
    this.weeks = new Map(); // therapist -> week -> { minutes, entries }
    this.issueEntries = new Set(); this.log = [];
    candidate.sessions.forEach((session, index) => {
      const [start, end] = interval(session, this.config);
      const entry = { s: session, i: index, start, end, indexed: Number.isFinite(start) && Number.isFinite(end), week: weekKey(session.date, this.config.weekStart), inPod: this.clients.get(session.client)?.pod === pod, reasons: null };
      this.entries.push(entry); if (!this.byId.has(session.id)) this.byId.set(session.id, entry);
      if (entry.indexed) {
        this.bucketOf('therapist', session.therapist, true).list.push(entry);
        this.bucketOf('client', session.client, true).list.push(entry);
        if (session.location === 'clinic') this.bucketOf('room', session.room, true).list.push(entry);
      }
      this.weekOf(session.therapist, entry.week).add(entry, session.minutes);
    });
    for (const map of Object.values(this.buckets)) for (const bucket of map.values()) {
      bucket.list.sort((a, b) => a.start - b.start || a.i - b.i);
      for (const entry of bucket.list) bucket.maxLength = Math.max(bucket.maxLength, entry.end - entry.start);
    }
    for (const entry of this.entries) if (entry.inPod) this.setReasons(entry, this.reasonsOf(entry));
  }
  bucketOf(kind, key, create) {
    let bucket = this.buckets[kind].get(key);
    if (!bucket && create) { bucket = { list: [], maxLength: 0 }; this.buckets[kind].set(key, bucket); }
    return bucket;
  }
  weekOf(therapist, week) {
    let weeks = this.weeks.get(therapist); if (!weeks) { weeks = new Map(); this.weeks.set(therapist, weeks); }
    let slot = weeks.get(week);
    if (!slot) { slot = { minutes: 0, entries: new Set(), add(entry, minutes) { this.entries.add(entry); this.minutes += minutes; }, remove(entry, minutes) { this.entries.delete(entry); this.minutes -= minutes; } }; weeks.set(week, slot); }
    return slot;
  }
  /** Entries in the bucket that overlap `entry` (excluding itself), found by binary search on start. */
  overlapping(bucket, entry) {
    const found = [];
    if (!bucket || !entry.indexed) return found;
    const list = bucket.list, floor = entry.start - bucket.maxLength;
    let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].start <= floor) lo = mid + 1; else hi = mid; }
    for (let at = lo; at < list.length && list[at].start < entry.end; at++) {
      const other = list[at];
      if (other !== entry && entry.start < other.end) found.push(other);
    }
    return found;
  }
  neighbours(entry) {
    const flags = new Map();
    const flag = (other, kind) => { const item = flags.get(other) || { other, therapist: false, client: false, room: false }; item[kind] = true; flags.set(other, item); };
    const s = entry.s;
    for (const other of this.overlapping(this.bucketOf('therapist', s.therapist), entry)) flag(other, 'therapist');
    for (const other of this.overlapping(this.bucketOf('client', s.client), entry)) flag(other, 'client');
    if (s.location === 'clinic') for (const other of this.overlapping(this.bucketOf('room', s.room), entry)) flag(other, 'room');
    return [...flags.values()].sort((a, b) => a.other.i - b.other.i);
  }
  leaveSpans(therapist) {
    let spans = this.leaveCache.get(therapist);
    if (!spans) { spans = this.leaves.filter((leave) => leave.therapist === therapist).map((leave) => ({ leave, span: leaveInterval(leave, this.config) })); this.leaveCache.set(therapist, spans); }
    return spans;
  }
  /** Reasons in the order the original all-pairs scan produced: leave, earlier neighbours, own shape, later neighbours, cap. */
  reasonsOf(entry) {
    const s = entry.s, reasons = [];
    const add = (reason) => { if (!reasons.includes(reason)) reasons.push(reason); };
    const causes = this.leaveSpans(s.therapist).filter(({ span }) => entry.start < span[1] && span[0] < entry.end).map(({ leave }) => leave);
    if (causes.length) add(`Therapist leave: ${causes.map((leave) => `${leave.startDate} ${leave.startTime}–${leave.endDate} ${leave.endTime}`).join('; ')}`);
    const neighbours = this.neighbours(entry);
    const pair = ({ other, therapist, client, room }) => {
      if (therapist) add(`Therapist overlaps session ${other.s.id}.`);
      if (client) add(`Client overlaps session ${other.s.id}.`);
      if (room) add(`Room overlaps session ${other.s.id}.`);
    };
    for (const item of neighbours) if (item.other.i < entry.i) pair(item);
    try { validateSessionShape(this.candidate, s, { lookups: this.lookups }); } catch (error) { add(error.message); }
    for (const item of neighbours) if (item.other.i > entry.i) pair(item);
    const therapist = this.therapists.get(s.therapist);
    if (therapist && this.weekOf(s.therapist, entry.week).minutes > therapist.capHours * 60) add(`Weekly cap exceeded for ${therapist.name}.`);
    return reasons;
  }
  setReasons(entry, reasons) {
    entry.reasons = reasons.length ? reasons : null;
    if (entry.reasons) this.issueEntries.add(entry); else this.issueEntries.delete(entry);
  }
  entryFor(entry) {
    const stale = this.staleEntries.find((item) => item.sessionId === entry.s.id);
    const merged = stale ? { ...stale, reasons: [...stale.reasons] } : { sessionId: entry.s.id, session: { ...entry.s }, reasons: [] };
    for (const reason of entry.reasons) if (!merged.reasons.includes(reason)) merged.reasons.push(reason);
    return merged;
  }
  issues() {
    const out = new Map(this.staleEntries.map((item) => [item.sessionId, item]));
    for (const entry of this.issueEntries) out.set(entry.s.id, this.entryFor(entry));
    return [...out.values()].sort((a,b)=>sortKey(a.session||{id:a.sessionId}).localeCompare(sortKey(b.session||{id:b.sessionId})));
  }
  issue(sessionId) {
    const entry = this.byId.get(sessionId);
    if (entry?.reasons) return this.entryFor(entry);
    return this.staleEntries.find((item) => item.sessionId === sessionId);
  }
  /** Reason sets keyed by session id, the baseline for "no new problem" checks. */
  baseline() { return new Map(this.issues().map((item) => [item.sessionId, new Set(item.reasons)])); }
  /** In-pod issue reasons that are not in the baseline. Stale-draft entries never change while therapists move. */
  extraIssues(baseline) {
    const fresh = [];
    for (const entry of this.issueEntries) { const reasons = entry.reasons.filter((reason) => !baseline.get(entry.s.id)?.has(reason)); if (reasons.length) fresh.push({ entry, reasons }); }
    if (fresh.length > 1) fresh.sort((x, y) => sortKey(x.entry.s).localeCompare(sortKey(y.entry.s))); // same order as issues()
    return fresh.flatMap(({ entry, reasons }) => reasons.map((reason) => ({ sessionId: entry.s.id, reason })));
  }
  session(id) { return this.byId.get(id)?.s; }
  hasIssue(id) { return Boolean(this.byId.get(id)?.reasons); }
  /** Not-yet-started sessions of the therapist in the same calendar week as `session`. */
  weekPeers(session, now) {
    const slot = this.weeks.get(session.therapist)?.get(weekKey(session.date, this.config.weekStart));
    return slot ? [...slot.entries].filter((entry) => entry.s.id !== session.id && entry.start >= now).map((entry) => entry.s) : [];
  }
  /** Reassign one session to another therapist. Returns the re-evaluated entries and an undo function. */
  move(sessionId, therapist) {
    const entry = this.byId.get(sessionId), old = entry.s, next = { ...old, therapist };
    const scope = new Set([entry]);
    for (const { other } of this.neighbours(entry)) scope.add(other);
    for (const peer of this.weekOf(old.therapist, entry.week).entries) scope.add(peer);
    const detach = () => {
      if (entry.indexed) { const list = this.bucketOf('therapist', entry.s.therapist).list; list.splice(list.indexOf(entry), 1); }
      this.weekOf(entry.s.therapist, entry.week).remove(entry, entry.s.minutes);
    };
    const attach = (session) => {
      entry.s = session; this.candidate.sessions[entry.i] = session;
      if (entry.indexed) {
        const bucket = this.bucketOf('therapist', session.therapist, true), list = bucket.list;
        let lo = 0, hi = list.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].start < entry.start || (list[mid].start === entry.start && list[mid].i < entry.i)) lo = mid + 1; else hi = mid; }
        list.splice(lo, 0, entry); bucket.maxLength = Math.max(bucket.maxLength, entry.end - entry.start);
      }
      this.weekOf(session.therapist, entry.week).add(entry, session.minutes);
    };
    detach(); attach(next);
    for (const { other } of this.neighbours(entry)) scope.add(other);
    for (const peer of this.weekOf(next.therapist, entry.week).entries) scope.add(peer);
    const previous = new Map([...scope].map((item) => [item, item.reasons]));
    for (const item of scope) if (item.inPod) this.setReasons(item, this.reasonsOf(item));
    this.log.push({ sessionId, therapist });
    const undo = () => {
      detach(); attach(old);
      for (const [item, reasons] of previous) { item.reasons = reasons; if (reasons) this.issueEntries.add(item); else this.issueEntries.delete(item); }
      this.log.pop();
    };
    return { scope, undo };
  }
  /** Conflict-free therapist choices for one issue session, in client rank order. */
  workable(sessionId) {
    const entry = this.byId.get(sessionId);
    const client = this.clients.get(entry?.s.client);
    if (!entry || !client || client.pod !== this.pod || entry.start < Date.now()) return [];
    const before = new Map([...this.issueEntries].map((item) => [item, item.reasons]));
    const options = [];
    for (const therapistId of client.assigned) {
      const therapist = this.candidate.therapists.find((item) => item.id === therapistId && item.active);
      if (!therapist || therapist.id === entry.s.therapist) continue;
      const { scope, undo } = this.move(sessionId, therapist.id);
      const clean = !entry.reasons && [...scope].every((item) => !item.reasons || item.reasons.every((reason) => before.get(item)?.includes(reason)));
      undo();
      if (clean) options.push({ therapist: therapist.id, rank: client.assigned.indexOf(therapist.id) + 1, suggested: options.length === 0 });
    }
    return options;
  }
}

export function draftIssues(data, pod) { return new DraftEngine(data, pod).issues(); }

/** All currently conflict-free therapist choices for one draft issue, in client rank order. */
export function workableAssignments(data, pod, sessionId) { return new DraftEngine(data, pod).workable(sessionId); }
/** workableAssignments for several sessions sharing one index. Returns {sessionId: options}. */
export function workableAssignmentsFor(data, pod, sessionIds) {
  const engine = new DraftEngine(data, pod);
  return Object.fromEntries(sessionIds.map((id) => [id, engine.workable(id)]));
}

const withDraft = (data, pod, changes) => {
  const drafts = (data.drafts || []).filter((item) => item.pod !== pod);
  const existing = (data.drafts || []).find((item) => item.pod === pod);
  drafts.push({ ...(existing || { id: 'proposal', pod, autoResolveRun: false }), changes });
  return { ...data, drafts };
};

/** Side-effect-free direct-only diagnostic; the user-facing batch uses boundedResolutionProposal. */
export function directResolutionProposal(data, pod) {
  let changes = [...(data.drafts.find((item) => item.pod === pod)?.changes || [])];
  let engine = new DraftEngine(withDraft(data, pod, changes), pod);
  const original = engine.issues();
  const proposed = [];
  for (const issue of original) {
    const current = engine.issue(issue.sessionId);
    if (!current?.session || !current.reasons.some((reason) => reason.startsWith('Therapist leave:'))) continue;
    const option = engine.workable(issue.sessionId)[0];
    if (!option) continue;
    const previous=changes.find((item) => item.sessionId === issue.sessionId);
    changes=changes.filter((item) => item.sessionId !== issue.sessionId);
    const change=previous?.kind==='reschedule' ? {...previous,therapist:option.therapist} : {kind:'assign',sessionId:issue.sessionId,therapist:option.therapist};
    changes.push(change);
    engine = new DraftEngine(withDraft(data, pod, changes), pod);
    proposed.push({change,causedBy:issue.reasons.filter((reason)=>reason.startsWith('Therapist leave:')),rank:option.rank});
  }
  return {mode:'direct-only',baseRevision:data.revision,proposed,unresolved:engine.issues(),allDraftChanges:structuredClone(changes)};
}

const stageChange = (changes,sessionId,therapist) => {
  const previous=changes.find((item)=>item.sessionId===sessionId);
  return [...changes.filter((item)=>item.sessionId!==sessionId), previous?.kind==='add'?{...previous,session:{...previous.session,therapist}}:previous?.kind==='reschedule'?{...previous,therapist}:{kind:'assign',sessionId,therapist}];
};

/** Proposed reassignments only: the caller still has to review and explicitly apply. */
export function boundedResolutionProposal(data,pod) {
  let changes=[...((data.drafts||[]).find((item)=>item.pod===pod)?.changes||[])];
  const engine=new DraftEngine(withDraft(data,pod,changes),pod);
  const proposed=[],stops=[];
  const maxDepth=data.config.cascadeDepth;
  const blockers=(extras,visited)=>{
    const choices=[];
    for (const extra of extras) {
      const session=engine.session(extra.sessionId);
      if (!session) continue;
      if (extra.reason.startsWith('Therapist overlaps session ')) choices.push({id:extra.reason.slice('Therapist overlaps session '.length,-1),displacedBy:session.id});
      else if (extra.reason.startsWith('Weekly cap exceeded')) choices.push(...engine.weekPeers(session,Date.now()).map((item)=>({id:item.id,displacedBy:session.id})));
      else return null;
    }
    return choices.filter((choice,index)=>!visited.has(choice.id)&&choices.findIndex((other)=>other.id===choice.id)===index).sort((a,b)=>a.id.localeCompare(b.id));
  };
  // The engine holds the trial state: a successful search leaves its moves applied, a failed one restores the state it was given.
  const search=(baseline,rootId,visited,remaining,links=[])=>{
    const extras=engine.extraIssues(baseline);
    const rootStillOutstanding=engine.hasIssue(rootId);
    if (!extras.length) return rootStillOutstanding ? null : {links};
    if (remaining===0) return null;
    const choices=blockers(extras,visited);
    if (!choices?.length) return null;
    for (const {id,displacedBy} of choices) {
      if (id===rootId) continue;
      const session=engine.session(id);
      const client=engine.clients.get(session?.client);
      if (!session||!client||client.pod!==pod||interval(session,engine.config)[0]<Date.now()) continue;
      for (const therapistId of client.assigned) {
        const rank=client.assigned.indexOf(therapistId)+1;
        if (therapistId===session.therapist||!engine.candidate.therapists.some((item)=>item.id===therapistId&&item.active)) continue;
        const {undo}=engine.move(id,therapistId);
        const hasNewIssues=engine.extraIssues(baseline).length>0;
        const result=hasNewIssues&&rank!==2?null:search(baseline,rootId,new Set([...visited,id]),remaining-1,[...links,{sessionId:id,displacedBy}]);
        if (result) return result;
        undo();
      }
    }
    return null;
  };
  for (const initial of engine.issues()) {
    const issue=engine.issue(initial.sessionId);
    if (!issue?.session||!issue.reasons.some((reason)=>reason.startsWith('Therapist leave:'))) continue;
    if (interval(issue.session,engine.config)[0] < Date.now()) { stops.push({sessionId:issue.sessionId,reason:'This session has already started; automatic changes to past sessions are not allowed.'}); continue; }
    const client=data.clients.find((item)=>item.id===issue.session.client);
    if (client?.assigned[0]!==issue.session.therapist) { stops.push({sessionId:issue.sessionId,reason:'Automatic replacement currently supports a leave-affected first-ranked therapist; edit this session manually.'}); continue; }
    const baseline=engine.baseline();
    const before=new Map(changes.map((item)=>[item.sessionId,JSON.stringify(item)]));
    const mark=engine.log.length;
    let solved=null;
    const second=client.assigned[1];
    if (data.therapists.some((item)=>item.id===second&&item.active)) {
      const {undo}=engine.move(issue.sessionId,second);
      solved=search(baseline,issue.sessionId,new Set([issue.sessionId]),maxDepth);
      if (!solved) undo();
    }
    if (!solved) {
      const third=engine.workable(issue.sessionId).find((item)=>item.rank===3);
      if (third) { engine.move(issue.sessionId,third.therapist); solved={links:[]}; }
    }
    if (!solved) { stops.push({sessionId:issue.sessionId,reason:`No safe automatic assignment within cascade depth ${maxDepth}; manual edit or cancellation remains available.`}); continue; }
    for (const move of engine.log.slice(mark)) changes=stageChange(changes,move.sessionId,move.therapist);
    const causeById=new Map(solved.links.map((link)=>[link.sessionId,link.displacedBy]));
    for (const change of changes) if (before.get(change.sessionId)!==JSON.stringify(change)) {
      const affected=engine.session(change.sessionId);
      const assigned=data.clients.find((item)=>item.id===affected?.client)?.assigned||[];
      proposed.push({change:structuredClone(change),rank:assigned.indexOf(change.therapist||change.session?.therapist)+1,causedBy:issue.reasons.filter((reason)=>reason.startsWith('Therapist leave:')),displacedBy:causeById.get(change.sessionId)||null});
    }
  }
  return {mode:'bounded',baseRevision:data.revision,cascadeDepth:maxDepth,proposed,unresolved:engine.issues(),stops,allDraftChanges:structuredClone(changes)};
}

export function withConflicts(data) { return { ...data, conflicts: leaveConflicts(data), draftIssues: Object.fromEntries((data.drafts||[]).map((draft)=>[draft.pod,draftIssues(data,draft.pod)])) }; }
export function overlaps(a, b, config) { const [as, ae] = interval(a, config); const [bs, be] = interval(b, config); return as < be && bs < ae; }
export function weekday(date) { const day = new Date(parseDate(date)).getUTCDay(); return day || 7; }
export function weekKey(date, weekStart = 1) {
  const cacheKey = `${weekStart}|${date}`; const cached = weekKeyCache.get(cacheKey); if (cached !== undefined) return cached;
  const ms = parseDate(date); const delta = (weekday(date) - weekStart + 7) % 7;
  const result = new Date(ms - delta * DAY_MS).toISOString().slice(0,10);
  if (Number.isInteger(weekStart)) weekKeyCache.set(cacheKey, result);
  return result;
}
export function addDays(date, days) { return new Date(parseDate(date) + days * DAY_MS).toISOString().slice(0,10); }
export function datesWeekly(start, end) {
  if (parseDate(end) < parseDate(start)) throw new Error('Series end date must be on or after its start date.');
  const values=[]; for (let date=start; parseDate(date) <= parseDate(end); date=addDays(date,7)) values.push(date); return values;
}
const active = (items, id) => items.find(x => x.id === id && x.active);
export const isPast = (date, nowDate = todayInZone('America/Toronto')) => date < nowDate;
export function todayInZone(zone) { return formatted(Date.now(), zone).date; }

export function validateState(data, {allowHistoric = true} = {}) {
  if (!data || data.schema !== 2 || !Number.isInteger(data.revision) || data.revision < 0) throw new Error('Unsupported clinic data.');
  const c = data.config;
  if (c && c.cascadeDepth === undefined) c.cascadeDepth = 1; // Existing S4 PostgreSQL snapshots predate this setting.
  if (!c || !Array.isArray(c.workingDays) || !c.workingDays.length || new Set(c.workingDays).size !== c.workingDays.length || c.workingDays.some(day => !Number.isInteger(day) || day < 1 || day > 7) || !Number.isInteger(c.weekStart) || c.weekStart < 1 || c.weekStart > 7 || !Number.isInteger(c.recurrenceWeeks) || c.recurrenceWeeks < 1 || c.recurrenceWeeks > 104) throw new Error('Invalid calendar configuration.');
  if (![0,1,2].includes(c.cascadeDepth)) throw new Error('Automatic cascade depth must be 0, 1, or 2.');
  localInstant('2026-01-05', c.open, c.timezone); localInstant('2026-01-05', c.close, c.timezone);
  if (minutesAt(c.open) >= minutesAt(c.close)) throw new Error('Opening time must be before closing time.');
  data.leaves ??= []; // Existing S4 PostgreSQL snapshots predate leave support.
  data.drafts ??= []; // One shared unfinished draft per pod, added after S5.
  data.notifications ??= []; // Existing S4 snapshots predate the notification worklist.
  for (const key of ['pods','therapists','clients','rooms','series','sessions','leaves','drafts','notifications']) if (!Array.isArray(data[key]) || new Set(data[key].map(x => x.id)).size !== data[key].length) throw new Error(`Invalid or duplicate ${key} records.`);
  for (const task of data.notifications) {
    if (!task.id || !task.sessionId || !['client','therapist'].includes(task.recipientRole) || !['pending','handled'].includes(task.status) || !['added','changed','cancelled'].includes(task.changeType) || !data.pods.some((pod)=>pod.id===task.pod) || !data[task.recipientRole==='client'?'clients':'therapists'].some((person)=>person.id===task.recipientId&&person.pod===task.pod)) throw new Error('Invalid notification task.');
    for (const snapshot of [task.before,task.after]) if (snapshot!==undefined&&snapshot!==null&&(!snapshot.date||!snapshot.time||!Number.isInteger(snapshot.minutes)||!snapshot.client||!snapshot.therapist||!['clinic','home'].includes(snapshot.location))) throw new Error('Invalid notification session details.');
  }
  if (new Set(data.drafts.map((draft) => draft.pod)).size !== data.drafts.length) throw new Error('Only one shared schedule draft is allowed per pod.');
  for (const draft of data.drafts) {
    if (!draft.id || !data.pods.some((pod) => pod.id === draft.pod) || !Array.isArray(draft.changes) || typeof draft.autoResolveRun !== 'boolean' || new Set(draft.changes.map((change)=>change.sessionId)).size !== draft.changes.length) throw new Error('Invalid unfinished schedule draft.');
    if (draft.proposal && (!draft.autoResolveRun || !Number.isInteger(draft.proposal.sourceRevision) || !Array.isArray(draft.proposal.proposed) || !Array.isArray(draft.proposal.allDraftChanges) || !Array.isArray(draft.proposal.unresolved) || !Array.isArray(draft.proposal.stops))) throw new Error('Invalid Auto resolve proposal.');
    for (const change of draft.changes) if (!change.sessionId || !['add','cancel','assign','reschedule'].includes(change.kind) || (change.kind==='add'&&(!change.session||change.session.id!==change.sessionId||!data.clients.some((client)=>client.id===change.session.client&&client.pod===draft.pod)||Boolean(change.series)!==Boolean(change.session.seriesId)||(change.series&&change.series.id!==change.session.seriesId))) || (change.kind==='assign'&&!change.therapist) || (change.kind==='reschedule'&&(!change.therapist||!change.date||!change.time||!Number.isInteger(change.minutes)||!['clinic','home'].includes(change.location)||(!change.room&&change.location==='clinic')||(change.location==='home'&&change.room!==null)))) throw new Error('Invalid draft schedule change.');
  }
  const names = new Set();
  for (const person of [...data.therapists, ...data.clients]) { const key = String(person.name || '').trim().toLocaleLowerCase(); if (!person.id || !key || names.has(key)) throw new Error('Duplicate or invalid person identity.'); names.add(key); }
  for (const t of data.therapists) if (!data.pods.some(p=>p.id===t.pod) || typeof t.active !== 'boolean' || !Number.isFinite(t.capHours) || t.capHours <= 0) throw new Error('Invalid therapist pod, active state, or weekly cap.');
  for (const client of data.clients) {
    if (!data.pods.some(p=>p.id===client.pod) || typeof client.active !== 'boolean' || !Array.isArray(client.assigned) || client.assigned.length !== 3 || new Set(client.assigned).size !== 3) throw new Error('Client requires three distinct ranked therapists.');
    if (client.assigned.some(id => !data.therapists.some(t => t.id === id && t.pod === client.pod))) throw new Error('Assigned therapist must belong to the client pod.');
  }
  for (const room of data.rooms) if (!room.id || !String(room.name || '').trim() || typeof room.active !== 'boolean') throw new Error('Invalid room.');
  for (const leave of data.leaves) {
    if (!leave.id || !data.therapists.some((t) => t.id === leave.therapist && t.pod === leave.pod) || !data.pods.some((p) => p.id === leave.pod)) throw new Error('Leave requires a therapist in its pod.');
    leaveInterval(leave, c);
  }
  const lookups = shapeLookups(data);
  for (const s of data.sessions) validateSessionShape(data, s, {allowHistoric, lookups});
  assertNoOverlaps(data.sessions, c);
  const loads = new Map(); for (const s of data.sessions) { const key=`${s.therapist}:${weekKey(s.date,c.weekStart)}`; loads.set(key,(loads.get(key)||0)+s.minutes); }
  for (const [key, minutes] of loads) { const therapist = data.therapists.find(t=>key.startsWith(`${t.id}:`)); if (minutes > therapist.capHours * 60) throw new Error(`Weekly cap exceeded for ${therapist.name}.`); }
  return data;
}

/** Throws for the first overlapping pair (earliest session, then earliest partner; therapist, client, room in that order). Sorted-bucket sweep, not all pairs. */
function assertNoOverlaps(sessions, config) {
  const kinds = [['Therapist', (s) => s.therapist], ['Client', (s) => s.client], ['Room', (s) => (s.location === 'clinic' ? s.room : undefined), (s) => s.location === 'clinic']];
  const spans = sessions.map((s, i) => { const [start, end] = interval(s, config); return { s, i, start, end }; }).filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end));
  let best = null;
  kinds.forEach(([label, key, applies], rank) => {
    const buckets = new Map();
    for (const e of spans) { if (applies && !applies(e.s)) continue; const k = key(e.s); const list = buckets.get(k); if (list) list.push(e); else buckets.set(k, [e]); }
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      list.sort((x, y) => x.start - y.start);
      for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length && list[y].start < list[x].end; y++) {
        if (!(list[x].start < list[y].end)) continue;
        const lo = Math.min(list[x].i, list[y].i), hi = Math.max(list[x].i, list[y].i);
        if (!best || lo < best.lo || (lo === best.lo && (hi < best.hi || (hi === best.hi && rank < best.rank)))) best = { lo, hi, rank, label };
      }
    }
  });
  if (best) throw new Error(`${best.label} overlap: ${sessions[best.lo].id} and ${sessions[best.hi].id}.`);
}

export function validateSessionShape(data, s, {allowHistoric = true, lookups = null} = {}) {
  const historic=allowHistoric && interval(s,data.config)[0] < Date.now();
  const lk = lookups || { client: (id) => data.clients.find((item)=>item.id===id), therapist: (id) => data.therapists.find((item)=>item.id===id), room: (id) => data.rooms.find((room)=>room.id===id), series: (id) => data.series.some((series)=>series.id===id) };
  const client=lk.client(s.client), therapist=lk.therapist(s.therapist);
  if (!s.id || !client || !therapist || client.pod !== therapist.pod || (!historic && (!client.active || !therapist.active || !client.assigned.includes(therapist.id)))) throw new Error('Session requires an active client and one of its assigned therapists.');
  if (!Number.isInteger(s.minutes) || s.minutes <= 0 || s.minutes > 480) throw new Error('Duration must be between 1 and 480 minutes.');
  localInstant(s.date,s.time,data.config.timezone);
  const localStart=minutesAt(s.time), localEnd=localStart+s.minutes;
  if (!historic && (!data.config.workingDays.includes(weekday(s.date)) || localStart < minutesAt(data.config.open) || localEnd > minutesAt(data.config.close))) throw new Error('Session falls outside configured working days or office hours.');
  if (!['clinic','home'].includes(s.location)) throw new Error('Location must be Clinic or Home.');
  if (s.location === 'home' && s.room !== null) throw new Error('Home sessions cannot reserve a room.');
  if (s.location === 'clinic' && !((room)=>room&&(historic||room.active))(lk.room(s.room))) throw new Error(`Clinic session requires active shared room ${s.room}.`);
  if (s.seriesId !== undefined && s.seriesId !== null && !lk.series(s.seriesId)) throw new Error('Session refers to an unknown series.');
}

export function blockersForSetup(before, after) {
  const issues=[];
  const bookingLabel=(session)=>`${session.date} ${session.time} · ${before.clients.find((item)=>item.id===session.client)?.name||session.client} · Client · ${before.therapists.find((item)=>item.id===session.therapist)?.name||session.therapist} · Therapist (${session.id})`;
  if (before.config.timezone !== after.config.timezone && before.sessions.length) {
    issues.push(...before.sessions.map(s=>`${bookingLabel(s)}: timezone cannot change while committed bookings exist.`));
    return issues;
  }
  for (const session of before.sessions.filter((item)=>interval(item,before.config)[0]>=Date.now())) {
    try { validateSessionShape(after, session, {allowHistoric:false}); }
    catch (error) { issues.push(`${bookingLabel(session)}: ${error.message}`); continue; }
  }
  const load=new Map(); for (const session of before.sessions) { const key=`${session.therapist}:${weekKey(session.date,after.config.weekStart)}`; load.set(key,(load.get(key)||0)+session.minutes); }
  for (const [key, minutes] of load) { const therapist=after.therapists.find(t=>key.startsWith(`${t.id}:`)); if (therapist && minutes > therapist.capHours * 60) issues.push(...before.sessions.filter(s=>`${s.therapist}:${weekKey(s.date,after.config.weekStart)}`===key).map(s=>`${bookingLabel(s)}: weekly cap would be exceeded for ${therapist.name} · Therapist.`)); }
  return issues;
}

export function createOccurrences(state, request, seriesId) {
  const dates=datesWeekly(request.startDate,request.endDate);
  return dates.map((date,index)=>({id:`${seriesId}-o${index + 1}`, seriesId, client:request.client, therapist:request.therapist, date, time:request.time, minutes:Number(request.minutes), location:request.location, room:request.location === 'home' ? null : request.room}));
}

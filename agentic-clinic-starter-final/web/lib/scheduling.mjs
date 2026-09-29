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
const formatted = (ms, zone) => {
  let formatter=formatters.get(zone);
  if (!formatter) { formatter=new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}); formatters.set(zone,formatter); }
  const parts = formatter.formatToParts(new Date(ms));
  const at = type => parts.find(p => p.type === type)?.value;
  return {date:`${at('year')}-${at('month')}-${at('day')}`, time:`${at('hour')}:${at('minute')}`};
};

/** Convert a wall-clock appointment to an instant, rejecting spring DST gaps. Ambiguous fall times choose the earlier instant. */
export function localInstant(date, time, zone) {
  parseDate(date); minutesAt(time);
  const cacheKey=`${zone}|${date}|${time}`; if (localCache.has(cacheKey)) return localCache.get(cacheKey);
  try { new Intl.DateTimeFormat('en', {timeZone:zone}).format(); } catch { throw new Error('Configured timezone is invalid.'); }
  const base = Date.parse(`${date}T${time}:00Z`);
  const candidates = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = base - offset * 60000;
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
  return data.sessions.flatMap((session) => {
    const [start, end] = interval(session, data.config);
    const causes = leaves.filter((leave) => {
      if (leave.therapist !== session.therapist) return false;
      const [leaveStart, leaveEnd] = leaveInterval(leave, data.config);
      return start < leaveEnd && leaveStart < end;
    });
    return causes.length ? [{ sessionId: session.id, session, leaveIds: causes.map((leave) => leave.id), leaves: causes }] : [];
  });
}
export function draftCandidate(data, pod) {
  const candidate = structuredClone(data);
  const draft = data.drafts?.find((item) => item.pod === pod);
  const stale = [];
  for (const change of draft?.changes || []) {
    if (change.kind === 'add') {
      if (change.series && !candidate.series.some((item)=>item.id===change.series.id)) candidate.series.push(structuredClone(change.series));
      candidate.sessions.push(structuredClone(change.session));
      continue;
    }
    const session = candidate.sessions.find((item) => item.id === change.sessionId);
    if (!session || candidate.clients.find((item) => item.id === session.client)?.pod !== pod) {
      stale.push(change.sessionId);
      continue;
    }
    if (change.kind === 'cancel') candidate.sessions = candidate.sessions.filter((item) => item.id !== change.sessionId);
    else if (change.kind === 'assign') session.therapist = change.therapist;
    else if (change.kind === 'reschedule') Object.assign(session, {therapist:change.therapist,date:change.date,time:change.time,minutes:change.minutes,location:change.location,room:change.room});
  }
  return { candidate, stale };
}

export function draftIssues(data, pod) {
  const { candidate, stale } = draftCandidate(data, pod);
  const inPod = (session) => candidate.clients.find((item) => item.id === session.client)?.pod === pod;
  const issues = new Map();
  const add = (session, reason) => {
    if (!inPod(session)) return;
    const entry = issues.get(session.id) || { sessionId: session.id, session, reasons: [] };
    if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
    issues.set(session.id, entry);
  };
  for (const id of stale) issues.set(id, { sessionId: id, session: null, reasons: ['The original session changed or was removed. Recheck this draft.'] });
  for (const {session, leaves} of leaveConflicts(candidate)) add(session, `Therapist leave: ${leaves.map((leave) => `${leave.startDate} ${leave.startTime}–${leave.endDate} ${leave.endTime}`).join('; ')}`);
  for (let index=0; index<candidate.sessions.length; index++) {
    const session=candidate.sessions[index];
    try { validateSessionShape(candidate,session); } catch (error) { add(session,error.message); }
    for (const other of candidate.sessions.slice(index+1)) {
      if (!overlaps(session,other,candidate.config)) continue;
      if (session.therapist===other.therapist) { add(session,`Therapist overlaps session ${other.id}.`); add(other,`Therapist overlaps session ${session.id}.`); }
      if (session.client===other.client) { add(session,`Client overlaps session ${other.id}.`); add(other,`Client overlaps session ${session.id}.`); }
      if (session.location==='clinic'&&other.location==='clinic'&&session.room===other.room) { add(session,`Room overlaps session ${other.id}.`); add(other,`Room overlaps session ${session.id}.`); }
    }
  }
  const loads=new Map();
  for (const session of candidate.sessions) { const key=`${session.therapist}:${weekKey(session.date,candidate.config.weekStart)}`; loads.set(key,(loads.get(key)||0)+session.minutes); }
  for (const session of candidate.sessions) { const key=`${session.therapist}:${weekKey(session.date,candidate.config.weekStart)}`; const therapist=candidate.therapists.find((item)=>item.id===session.therapist); if (therapist&&loads.get(key)>therapist.capHours*60) add(session,`Weekly cap exceeded for ${therapist.name}.`); }
  return [...issues.values()].sort((a,b)=>`${a.session?.date||''}T${a.session?.time||''}:${a.sessionId}`.localeCompare(`${b.session?.date||''}T${b.session?.time||''}:${b.sessionId}`));
}

/** All currently conflict-free therapist choices for one draft issue, in client rank order. */
export function workableAssignments(data, pod, sessionId) {
  const { candidate } = draftCandidate(data, pod);
  const session = candidate.sessions.find((item) => item.id === sessionId);
  const client = data.clients.find((item) => item.id === session?.client && item.pod === pod);
  if (!session || !client || interval(session,data.config)[0] < Date.now()) return [];
  const before = new Map(draftIssues(data, pod).map((issue) => [issue.sessionId, new Set(issue.reasons)]));
  const options = [];
  for (const therapistId of client.assigned) {
    const therapist = data.therapists.find((item) => item.id === therapistId && item.active);
    if (!therapist || therapist.id === session.therapist) continue;
    const trial = structuredClone(data);
    let draft = trial.drafts.find((item) => item.pod === pod);
    if (!draft) { draft = {id:'preview',pod,changes:[],autoResolveRun:false}; trial.drafts.push(draft); }
    const previous = draft.changes.find((item) => item.sessionId === sessionId);
    draft.changes = draft.changes.filter((item) => item.sessionId !== sessionId);
    draft.changes.push(previous?.kind==='add' ? {...previous,session:{...previous.session,therapist:therapist.id}} : previous?.kind==='reschedule' ? {...previous,therapist:therapist.id} : {kind:'assign',sessionId,therapist:therapist.id});
    const issues = draftIssues(trial, pod);
    if (issues.some((issue) => issue.sessionId === sessionId || issue.reasons.some((reason) => !before.get(issue.sessionId)?.has(reason)))) continue;
    options.push({therapist:therapist.id,rank:client.assigned.indexOf(therapist.id)+1,suggested:options.length===0});
  }
  return options;
}

/** Side-effect-free direct-only diagnostic; the user-facing batch uses boundedResolutionProposal. */
export function directResolutionProposal(data, pod) {
  const working = structuredClone(data);
  let draft = working.drafts.find((item) => item.pod === pod);
  if (!draft) { draft={id:'proposal',pod,changes:[],autoResolveRun:false}; working.drafts.push(draft); }
  const original = draftIssues(working,pod);
  const proposed = [];
  for (const issue of original) {
    const current = draftIssues(working,pod).find((item) => item.sessionId === issue.sessionId);
    if (!current?.session || !current.reasons.some((reason) => reason.startsWith('Therapist leave:'))) continue;
    const option = workableAssignments(working,pod,issue.sessionId)[0];
    if (!option) continue;
    const previous=draft.changes.find((item) => item.sessionId === issue.sessionId);
    draft.changes=draft.changes.filter((item) => item.sessionId !== issue.sessionId);
    const change=previous?.kind==='reschedule' ? {...previous,therapist:option.therapist} : {kind:'assign',sessionId:issue.sessionId,therapist:option.therapist};
    draft.changes.push(change);
    proposed.push({change,causedBy:issue.reasons.filter((reason)=>reason.startsWith('Therapist leave:')),rank:option.rank});
  }
  return {mode:'direct-only',baseRevision:data.revision,proposed,unresolved:draftIssues(working,pod),allDraftChanges:structuredClone(draft.changes)};
}

const stagePureAssignment = (data,pod,sessionId,therapist) => {
  const next=structuredClone(data);
  let draft=next.drafts.find((item)=>item.pod===pod);
  if (!draft) { draft={id:'proposal',pod,changes:[],autoResolveRun:false}; next.drafts.push(draft); }
  const previous=draft.changes.find((item)=>item.sessionId===sessionId);
  draft.changes=draft.changes.filter((item)=>item.sessionId!==sessionId);
  draft.changes.push(previous?.kind==='add'?{...previous,session:{...previous.session,therapist}}:previous?.kind==='reschedule'?{...previous,therapist}:{kind:'assign',sessionId,therapist});
  return next;
};

/** Proposed reassignments only: the caller still has to review and explicitly apply. */
export function boundedResolutionProposal(data,pod) {
  let working=structuredClone(data);
  if (!working.drafts.some((item)=>item.pod===pod)) working.drafts.push({id:'proposal',pod,changes:[],autoResolveRun:false});
  const proposed=[],stops=[];
  const maxDepth=working.config.cascadeDepth;
  const extraIssues=(trial,baseline)=>draftIssues(trial,pod).flatMap((issue)=>issue.reasons.filter((reason)=>!baseline.get(issue.sessionId)?.has(reason)).map((reason)=>({sessionId:issue.sessionId,reason})));
  const blockers=(trial,extras,visited)=>{
    const {candidate}=draftCandidate(trial,pod);
    const choices=[];
    for (const extra of extras) {
      const session=candidate.sessions.find((item)=>item.id===extra.sessionId);
      if (!session) continue;
      if (extra.reason.startsWith('Therapist overlaps session ')) choices.push({id:extra.reason.slice('Therapist overlaps session '.length,-1),displacedBy:session.id});
      else if (extra.reason.startsWith('Weekly cap exceeded')) choices.push(...candidate.sessions.filter((item)=>item.id!==session.id&&item.therapist===session.therapist&&interval(item,candidate.config)[0]>=Date.now()&&weekKey(item.date,candidate.config.weekStart)===weekKey(session.date,candidate.config.weekStart)).map((item)=>({id:item.id,displacedBy:session.id})));
      else return null;
    }
    return choices.filter((choice,index)=>!visited.has(choice.id)&&choices.findIndex((other)=>other.id===choice.id)===index).sort((a,b)=>a.id.localeCompare(b.id));
  };
  const search=(trial,baseline,rootId,visited,remaining,links=[])=>{
    const extras=extraIssues(trial,baseline);
    const rootStillOutstanding=draftIssues(trial,pod).some((item)=>item.sessionId===rootId);
    if (!extras.length) return rootStillOutstanding ? null : {trial,links};
    if (remaining===0) return null;
    const choices=blockers(trial,extras,visited);
    if (!choices?.length) return null;
    const {candidate}=draftCandidate(trial,pod);
    for (const {id,displacedBy} of choices) {
      if (id===rootId) continue;
      const session=candidate.sessions.find((item)=>item.id===id);
      const client=candidate.clients.find((item)=>item.id===session?.client && item.pod===pod);
      if (!session||!client||interval(session,candidate.config)[0]<Date.now()) continue;
      for (const therapistId of client.assigned) {
        const rank=client.assigned.indexOf(therapistId)+1;
        if (therapistId===session.therapist||!candidate.therapists.some((item)=>item.id===therapistId&&item.active)) continue;
        const moved=stagePureAssignment(trial,pod,id,therapistId);
        const nextVisited=new Set([...visited,id]);
        const hasNewIssues=extraIssues(moved,baseline).length>0;
        const result=hasNewIssues&&rank!==2?null:search(moved,baseline,rootId,nextVisited,remaining-1,[...links,{sessionId:id,displacedBy}]);
        if (result) return result;
      }
    }
    return null;
  };
  for (const initial of draftIssues(working,pod)) {
    const issue=draftIssues(working,pod).find((item)=>item.sessionId===initial.sessionId);
    if (!issue?.session||!issue.reasons.some((reason)=>reason.startsWith('Therapist leave:'))) continue;
    if (interval(issue.session,working.config)[0] < Date.now()) { stops.push({sessionId:issue.sessionId,reason:'This session has already started; automatic changes to past sessions are not allowed.'}); continue; }
    const client=working.clients.find((item)=>item.id===issue.session.client);
    if (client?.assigned[0]!==issue.session.therapist) { stops.push({sessionId:issue.sessionId,reason:'Automatic replacement currently supports a leave-affected first-ranked therapist; edit this session manually.'}); continue; }
    const baseline=new Map(draftIssues(working,pod).map((item)=>[item.sessionId,new Set(item.reasons)]));
    const before=new Map(working.drafts.find((item)=>item.pod===pod).changes.map((item)=>[item.sessionId,JSON.stringify(item)]));
    let solved=null;
    const second=client.assigned[1];
    if (working.therapists.some((item)=>item.id===second&&item.active)) solved=search(stagePureAssignment(working,pod,issue.sessionId,second),baseline,issue.sessionId,new Set([issue.sessionId]),maxDepth);
    if (!solved) {
      const third=workableAssignments(working,pod,issue.sessionId).find((item)=>item.rank===3);
      if (third) solved={trial:stagePureAssignment(working,pod,issue.sessionId,third.therapist),links:[]};
    }
    if (!solved) { stops.push({sessionId:issue.sessionId,reason:`No safe automatic assignment within cascade depth ${maxDepth}; manual edit or cancellation remains available.`}); continue; }
    working=solved.trial;
    const causeById=new Map(solved.links.map((link)=>[link.sessionId,link.displacedBy]));
    const resolvedSessions=draftCandidate(working,pod).candidate.sessions;
    for (const change of working.drafts.find((item)=>item.pod===pod).changes) if (before.get(change.sessionId)!==JSON.stringify(change)) {
      const affected=resolvedSessions.find((item)=>item.id===change.sessionId);
      const assigned=working.clients.find((item)=>item.id===affected?.client)?.assigned||[];
      proposed.push({change:structuredClone(change),rank:assigned.indexOf(change.therapist||change.session?.therapist)+1,causedBy:issue.reasons.filter((reason)=>reason.startsWith('Therapist leave:')),displacedBy:causeById.get(change.sessionId)||null});
    }
  }
  return {mode:'bounded',baseRevision:data.revision,cascadeDepth:maxDepth,proposed,unresolved:draftIssues(working,pod),stops,allDraftChanges:structuredClone(working.drafts.find((item)=>item.pod===pod).changes)};
}

export function withConflicts(data) { return { ...data, conflicts: leaveConflicts(data), draftIssues: Object.fromEntries((data.drafts||[]).map((draft)=>[draft.pod,draftIssues(data,draft.pod)])) }; }
export function overlaps(a, b, config) { const [as, ae] = interval(a, config); const [bs, be] = interval(b, config); return as < be && bs < ae; }
export function weekday(date) { const day = new Date(parseDate(date)).getUTCDay(); return day || 7; }
export function weekKey(date, weekStart = 1) {
  const ms = parseDate(date); const delta = (weekday(date) - weekStart + 7) % 7;
  return new Date(ms - delta * DAY_MS).toISOString().slice(0,10);
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
  for (const s of data.sessions) validateSessionShape(data, s, {allowHistoric});
  for (let i=0;i<data.sessions.length;i++) for (const other of data.sessions.slice(i+1)) {
    const s=data.sessions[i]; if (!overlaps(s, other, c)) continue;
    if (s.therapist === other.therapist) throw new Error(`Therapist overlap: ${s.id} and ${other.id}.`);
    if (s.client === other.client) throw new Error(`Client overlap: ${s.id} and ${other.id}.`);
    if (s.location === 'clinic' && other.location === 'clinic' && s.room === other.room) throw new Error(`Room overlap: ${s.id} and ${other.id}.`);
  }
  const loads = new Map(); for (const s of data.sessions) { const key=`${s.therapist}:${weekKey(s.date,c.weekStart)}`; loads.set(key,(loads.get(key)||0)+s.minutes); }
  for (const [key, minutes] of loads) { const therapist = data.therapists.find(t=>key.startsWith(`${t.id}:`)); if (minutes > therapist.capHours * 60) throw new Error(`Weekly cap exceeded for ${therapist.name}.`); }
  return data;
}

export function validateSessionShape(data, s, {allowHistoric = true} = {}) {
  const historic=allowHistoric && interval(s,data.config)[0] < Date.now();
  const client=data.clients.find((item)=>item.id===s.client), therapist=data.therapists.find((item)=>item.id===s.therapist);
  if (!s.id || !client || !therapist || client.pod !== therapist.pod || (!historic && (!client.active || !therapist.active || !client.assigned.includes(therapist.id)))) throw new Error('Session requires an active client and one of its assigned therapists.');
  if (!Number.isInteger(s.minutes) || s.minutes <= 0 || s.minutes > 480) throw new Error('Duration must be between 1 and 480 minutes.');
  localInstant(s.date,s.time,data.config.timezone);
  const localStart=minutesAt(s.time), localEnd=localStart+s.minutes;
  if (!historic && (!data.config.workingDays.includes(weekday(s.date)) || localStart < minutesAt(data.config.open) || localEnd > minutesAt(data.config.close))) throw new Error('Session falls outside configured working days or office hours.');
  if (!['clinic','home'].includes(s.location)) throw new Error('Location must be Clinic or Home.');
  if (s.location === 'home' && s.room !== null) throw new Error('Home sessions cannot reserve a room.');
  if (s.location === 'clinic' && !data.rooms.some((room)=>room.id===s.room&&(historic||room.active))) throw new Error(`Clinic session requires active shared room ${s.room}.`);
  if (s.seriesId !== undefined && s.seriesId !== null && !data.series.some(series=>series.id===s.seriesId)) throw new Error('Session refers to an unknown series.');
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

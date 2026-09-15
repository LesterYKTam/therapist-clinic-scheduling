export const clone = data => structuredClone(data);
export const therapists = ['Morgan Maple', 'Taylor Maple', 'Casey Maple'];
export const scenarios = {
  simple: 'One-day absence', cascade: 'Scheduling clash & cascade', cap: 'Weekly cap & cascade',
  multi: 'Two-week leave · two therapists', none: 'No affected sessions', unavailable: 'No valid replacement', stale: 'Room taken before commit'
};
export function seed() {
  return [
    {id:'s1',client:'Alex Demo',date:'2026-09-14',time:'09:00',minutes:60,therapist:therapists[0],room:1,location:'Clinic',status:'Scheduled'},
    {id:'s2',client:'Jamie Sample',date:'2026-09-14',time:'10:30',minutes:60,therapist:therapists[0],room:3,location:'Clinic',status:'Scheduled'},
    {id:'s3',client:'Riley Example',date:'2026-09-14',time:'14:00',minutes:90,therapist:therapists[0],room:null,location:'Home',status:'Scheduled'},
    {id:'s4',client:'Quinn Demo',date:'2026-09-14',time:'09:00',minutes:60,therapist:therapists[1],room:4,location:'Clinic',status:'Scheduled'},
    {id:'s5',client:'Alex Demo',date:'2026-09-21',time:'09:00',minutes:60,therapist:therapists[0],room:1,location:'Clinic',status:'Scheduled'},
    {id:'s6',client:'Cameron Sample',date:'2026-09-22',time:'11:00',minutes:60,therapist:therapists[1],room:5,location:'Clinic',status:'Scheduled'}
  ];
}
export function initial() {return {schedule:seed(),rooms:Array.from({length:15},(_,i)=>i+1),nextRoom:16,batch:null,notifications:[],notice:'',staff:therapists.map((name,i)=>({name,maxHours:[24,30,20][i]})),clients:[...new Set(seed().map(s=>s.client))]};}
export function startBatch(state, scenario, leave) {
  if (state.batch) throw new Error('Finish or abandon the current batch first.');
  if (!scenarios[scenario] || !leave.therapists.length || !leave.start || !leave.end || leave.end < leave.start) throw new Error('Choose a therapist and a valid date range.');
  const affected = state.schedule.filter(s=>s.status !== 'Cancelled' && leave.therapists.includes(s.therapist) && s.date >= leave.start && s.date <= leave.end);
  const issues = affected.map((s,i)=>({id:s.id,original:clone(s),decision:null,parent:null,reason:`${s.therapist} on leave · ${leave.start} to ${leave.end}`,kind:i===0 ? scenario : 'simple',reopened:false}));
  state.batch={scenario,leave:clone(leave),issues,conflictTriggered:false,phase:'Review',commitConflict:false};
  return issues.length;
}
export function unresolved(state) {return state.batch?.issues.filter(i=>!i.decision || i.conflicts?.length).length || 0;}
export function suggestion(issue, state) {
  const o=issue.original;
  if (issue.parent) {
    const parent=state.batch.issues.find(i=>i.id===issue.parent);
    if (parent.decision && (parent.decision.status==='Cancelled' || parent.decision.therapist!==o.therapist)) return clone(o);
  }
  if (issue.kind==='unavailable') return null;
  const unavailable = state.batch?.leave.therapists || [];
  const candidate=therapists.find(t=>t!==o.therapist && !unavailable.includes(t) && !(o.id==='s1' && !['cascade','cap'].includes(issue.kind) && t===therapists[1]));
  if (!candidate) return null;
  const target={...clone(o),therapist:candidate,room:o.location==='Home'?null:state.batch?.commitConflict?6:o.room,status:'Scheduled'};
  if(!['cascade','cap'].includes(issue.kind) && conflictsFor(state,target).length){const option=workableOptions(state,issue.id)[0];if(!option)return null;const {rooms,...valid}=option;return valid;}
  return target;
}
export function decide(state,id,action) {
  const batch=state.batch, issue=batch?.issues.find(i=>i.id===id);
  if (!issue) throw new Error('Choose an issue.');
  if (action==='invalid') throw new Error('Room 2 is occupied by another pod at this time. Choose an available room.');
  let target=suggestion(issue,state);
  if (action==='cancel') target={...clone(issue.original),status:'Cancelled'};
  else if (action==='alternative') {
    if (issue.kind==='unavailable') throw new Error('No scripted valid alternative in this scenario. Cancel or choose another scenario.');
    const candidate=therapists.filter(t=>t!==issue.original.therapist && !batch.leave.therapists.includes(t)).at(-1);
    if (!candidate) throw new Error('No available assigned therapist in this sample.');
    target=issue.parent ? suggestion(issue,state) : {...clone(issue.original),therapist:candidate,room:issue.original.location==='Home'?null:6,status:'Scheduled'};
  }
  if (!target) throw new Error('No valid replacement in this sample. Cancellation still requires your decision.');
  for (const child of batch.issues.filter(i=>i.parent===id)) {child.decision=null;child.reopened=true;}
  if (action==='accept' && ['cascade','cap'].includes(issue.kind) && !batch.issues.some(i=>i.parent===id)) {
    const bumped=state.schedule.find(s=>s.id==='s4');
    batch.issues.push({id:'s4',original:clone(bumped),decision:null,parent:id,kind:'simple',reason:issue.kind==='cap'?'Move Quinn Demo to release Taylor Maple’s weekly capacity for Alex Demo.':'Move Quinn Demo to free Taylor Maple’s 09:00 slot for Alex Demo.',reopened:false});
  }
  issue.decision=target; issue.reopened=false;issue.conflicts=[];
}
export function reopen(state,id) {
  for (const issue of state.batch.issues.filter(i=>i.id===id || i.parent===id)) {issue.decision=null;issue.reopened=true;}
}
export function commit(state) {
  const b=state.batch;
  if (!b) throw new Error('There is no active batch.');
  if(b.calendarMode)refreshDraft(state);
  if (unresolved(state)) throw new Error(`${unresolved(state)} unresolved issues. Decide every session before committing.`);
  for(const issue of b.issues){issue.conflicts=conflictsFor(state,issue.decision);if(issue.conflicts.length)issue.reopened=true;}
  if(unresolved(state))throw new Error(`${unresolved(state)} decisions now conflict. Review every reopened issue before committing. Nothing changed.`);
  if (b.scenario==='stale' && !b.conflictTriggered && b.issues.some(i=>i.decision?.status!=='Cancelled' && i.decision?.room)) {
    b.conflictTriggered=true;b.commitConflict=true;
    const issue=b.issues.find(i=>i.decision?.status!=='Cancelled' && i.decision?.room);
    issue.decision=null;issue.reopened=true;
    throw new Error('Another admin booked the proposed room. Nothing was committed. Review the reopened issue; Room 6 is the scripted alternative.');
  }
  const updated=clone(state.schedule), tasks=[];
  for (const issue of b.issues) {
    const old=issue.original,next=issue.decision;
    const index=updated.findIndex(s=>s.id===issue.id);
    if(issue.isNew && next.status==='Cancelled')continue;
    if(index<0)updated.push(clone(next));else updated[index]=clone(next);
    if (!issue.isNew && JSON.stringify(old)===JSON.stringify(next)) continue;
    const recipients=issue.isNew?[next.client,next.therapist]:[old.client,old.therapist,...(next.status==='Cancelled'?[]:[next.therapist])];
    for (const recipient of new Set(recipients)) tasks.push({id:`${issue.id}-${recipient}`,recipient,client:old.client,summary:next.status==='Cancelled'?`${old.date} ${old.time} · Cancelled`:`${old.date} ${old.time} → ${next.date} ${next.time} · ${next.therapist} · ${next.location==='Home'?'Home':`Room ${next.room}`}`,done:false});
  }
  state.schedule=updated;state.notifications=tasks;state.batch=null;state.notice=`Sample batch committed. ${tasks.length} notification tasks created. No messages sent.`;
}
export function abandon(state) {state.batch=null;state.notice='Batch abandoned. The sample schedule is unchanged; no notification tasks were created.';}
export function removeRoom(state,room) {
  if (room===2 || state.schedule.some(s=>s.room===room && s.status!=='Cancelled')) throw new Error(`Room ${room} has future bookings. Move those bookings before removing the room.`);
  if (!state.rooms.includes(room)) throw new Error('Room is already removed.');
  state.rooms=state.rooms.filter(r=>r!==room);
}
export function addStaff(state,name,maxHours=20) {name=String(name||'').trim();if(!name)throw new Error('Enter a staff name.');if(state.staff.some(s=>s.name.toLowerCase()===name.toLowerCase()))throw new Error('That staff member is already listed.');state.staff.push({name,maxHours:Number(maxHours)||20});}
export function removeStaff(state,name) {if(state.schedule.some(s=>s.therapist===name&&s.status!=='Cancelled'))throw new Error(`${name} has future sample sessions. Reassign or cancel them before removal.`);state.staff=state.staff.filter(s=>s.name!==name);}
export function setStaffHours(state,name,maxHours) {const staff=state.staff.find(s=>s.name===name),hours=Number(maxHours);if(!staff||!Number.isFinite(hours)||hours<=0||hours>80)throw new Error('Enter staff maximum hours from 1 to 80.');staff.maxHours=hours;}
export function addClient(state,name) {name=String(name||'').trim();if(!name)throw new Error('Enter a client name.');if(state.clients.some(c=>c.toLowerCase()===name.toLowerCase()))throw new Error('That client is already listed.');state.clients.push(name);}
export function removeClient(state,name) {if(state.schedule.some(s=>s.client===name&&s.status!=='Cancelled'))throw new Error(`${name} has future sample sessions. Cancel or move them before removal.`);state.clients=state.clients.filter(c=>c!==name);}

export const sampleTimes=['09:00','10:30','12:00','14:00','15:30'];
export function effectiveSchedule(state, exclude) {
 return [...state.schedule.filter(s=>s.id!==exclude).map(s=>state.batch?.issues.find(i=>i.id===s.id)?.decision || s),...(state.batch?.issues.filter(i=>i.isNew && i.id!==exclude).map(i=>i.decision||i.original)||[])].filter(s=>s.status!=='Cancelled');
}
const minute=s=>Number(s.time.slice(0,2))*60+Number(s.time.slice(3));
const overlap=(a,b)=>a.date===b.date && minute(a)<minute(b)+b.minutes && minute(b)<minute(a)+a.minutes;
const weekOf=s=>{const date=new Date(`${s.date}T00:00:00Z`);date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));return date.toISOString().slice(0,10);};
export function conflictsFor(state,candidate) {
 if(candidate.status==='Cancelled')return [];
 const conflicts=[],others=effectiveSchedule(state,candidate.id);
 const b=state.batch;
 if(b && b.leave.therapists.includes(candidate.therapist) && candidate.date>=b.leave.start && candidate.date<=b.leave.end)conflicts.push('Therapist is on leave on this date.');
 if(others.some(s=>s.therapist===candidate.therapist && overlap(s,candidate)))conflicts.push('Therapist already has an overlapping session.');
 if(others.some(s=>s.client===candidate.client && overlap(s,candidate)))conflicts.push('Client already has an overlapping session.');
 if(candidate.location==='Clinic' && (!state.rooms.includes(candidate.room) || candidate.room===2 && candidate.date==='2026-09-14' && minute(candidate)<600 && minute(candidate)+candidate.minutes>540 || others.some(s=>s.room===candidate.room && overlap(s,candidate))))conflicts.push('Room is unavailable or already booked.');
 const cap=b?.scenario==='cap' && candidate.therapist===therapists[1]?1:({[therapists[0]]:24,[therapists[1]]:30,[therapists[2]]:20})[candidate.therapist];
 const hours=(others.filter(s=>s.therapist===candidate.therapist && weekOf(s)===weekOf(candidate)).reduce((sum,s)=>sum+s.minutes,0)+candidate.minutes)/60;
 if(hours>cap)conflicts.push(`Weekly hours would be ${hours.toFixed(1)}h, above the ${cap}h sample cap.`);
 if(minute(candidate)<540||minute(candidate)+candidate.minutes>1020)conflicts.push('Outside the sample 09:00–17:00 clinic day.');
 if(b?.scenario==='unavailable' && candidate.id==='s1')conflicts.push('No assigned therapist is available in this scripted scenario.');
 if(b?.commitConflict && candidate.room===1)conflicts.push('Another admin has taken this room.');
 return conflicts;
}
export function workableOptions(state,id) {
 const issue=state.batch.issues.find(i=>i.id===id),o=issue.original,options=[];
 for(const therapist of therapists)for(const time of sampleTimes){
  const candidate={...clone(o),therapist,time,status:'Scheduled'};
  const rooms=o.location==='Home'?[null]:state.rooms;
  const available=rooms.filter(room=>!conflictsFor(state,{...candidate,room}).length);
  if(available.length)options.push({...candidate,rooms:available,room:available.includes(o.room)?o.room:available[0]});
 }
 options.sort((a,b)=>(a.time===o.time?0:1)-(b.time===o.time?0:1)||therapists.indexOf(a.therapist)-therapists.indexOf(b.therapist)||a.time.localeCompare(b.time));
 return options;
}
export function saveManual(state,id,candidate) {
 const issue=state.batch.issues.find(i=>i.id===id);
 if(!therapists.includes(candidate.therapist))throw new Error('Choose a therapist from this client’s assigned list.');
 const conflicts=conflictsFor(state,candidate);
 for(const child of state.batch.issues.filter(i=>i.parent===id)){child.decision=null;child.reopened=true;}
 issue.decision=clone(candidate);issue.conflicts=conflicts;issue.reopened=conflicts.length>0;
 return conflicts;
}
export function addStanding(state,session) {
 if(state.batch)throw new Error('Finish or abandon the draft batch before normal schedule setup in this sample.');
 const conflicts=conflictsFor(state,session);
 if(conflicts.length)throw new Error(conflicts.join(' '));
 state.schedule.push({...clone(session),standing:session.standing??true});
}

export function refreshDraft(state){
 if(!state.batch)return [];
 const b=state.batch;
 b.calendarMode=true;
 for(const session of effectiveSchedule(state)){
  const conflicts=conflictsFor(state,session);
  if(conflicts.length && !b.issues.some(i=>i.id===session.id))b.issues.push({id:session.id,original:clone(state.schedule.find(s=>s.id===session.id)),decision:null,parent:null,kind:'simple',reason:'Affected by a calendar edit',fromCalendarConflict:true});
 }
 for(const issue of b.issues){
  const candidate=issue.decision||issue.original;
  issue.conflicts=conflictsFor(state,candidate);
  if(issue.conflicts.length)issue.reopened=Boolean(issue.decision);
  else if(issue.fromCalendarConflict && !issue.decision){issue.decision=clone(issue.original);issue.reopened=false;}
 }
 return b.issues.filter(i=>!i.decision || i.conflicts.length);
}
export function editCalendarSession(state,candidate){
 if(!state.batch)throw new Error('Open a draft batch before editing its calendar.');
 if(!therapists.includes(candidate.therapist))throw new Error('Select an assigned therapist.');
 let issue=state.batch.issues.find(i=>i.id===candidate.id);
 if(!issue){
  const original=state.schedule.find(s=>s.id===candidate.id);
  issue={id:candidate.id,original:clone(original||candidate),decision:null,isNew:!original,parent:null,kind:'simple',reason:original?'Edited in the draft calendar':'Added in the draft calendar'};
  state.batch.issues.push(issue);
 }
 issue.decision=clone(candidate);
 refreshDraft(state);
 return issue;
}
export function draftCalendar(state){
 return [...state.schedule.map(s=>state.batch?.issues.find(i=>i.id===s.id)?.decision||s),...(state.batch?.issues.filter(i=>i.isNew).map(i=>i.decision||i.original)||[])];
}

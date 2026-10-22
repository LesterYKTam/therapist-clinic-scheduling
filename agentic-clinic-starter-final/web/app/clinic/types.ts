// Shared types for the clinic workspace. The server projection is large and
// partly untyped (the scheduling policy is plain JavaScript), so the entities
// are typed and the less stable parts stay loose on purpose.

export type Pod = { id: string; name: string };

export type Room = { id: string; name: string; active: boolean };

export type Therapist = {
  id: string;
  pod: string;
  name: string;
  capHours: number;
  active: boolean;
};

export type Client = {
  id: string;
  pod: string;
  name: string;
  active: boolean;
  assigned: string[];
};

export type Session = {
  id: string;
  client: string;
  therapist: string;
  date: string;
  time: string;
  minutes: number;
  location: string;
  room: string | null;
  seriesId?: string;
  roomName?: string;
};

export type Leave = {
  id: string;
  pod: string;
  therapist: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

// The dates of a leave, and the same with the therapist it applies to.
export type LeaveWindow = Omit<Leave, "id" | "pod" | "therapist">;
export type LeaveInterval = LeaveWindow & { therapist: string };

export type ClinicConfig = {
  timezone: string;
  open: string;
  close: string;
  recurrenceWeeks: number;
  weekStart: number;
  workingDays: number[];
  cascadeDepth: number;
};

export type ClinicState = {
  config: ClinicConfig;
  revision: number;
  pods: Pod[];
  allPods?: Pod[];
  rooms: Room[];
  therapists: Therapist[];
  clients: Client[];
  sessions: Session[];
  series: { id: string; endDate?: string }[];
  leaves?: Leave[];
  conflicts?: any[];
  historicalAlerts?: any[];
  drafts?: any[];
  draftIssues?: Record<string, any[]>;
  proposalStale?: Record<string, boolean>;
  workableOptions?: Record<string, any[]>;
  // Per issue session: active room ids free for its time across ALL pods (server-computed).
  roomsFree?: Record<string, string[]>;
  notifications?: any[];
  viewPod?: string;
  assignedPod?: string;
  readOnly?: boolean;
};

export type Screen = "calendar" | "setup" | "reports";

// The add / edit / cancel session form. Which fields matter depends on `kind`.
export type DraftForm = {
  kind: string;
  client: string;
  therapist: string;
  date: string;
  time: string;
  minutes: number;
  location: string;
  room: string | null;
  endDate: string;
  startDate?: string;
  defaultEndDate?: string;
  occurrenceId?: string;
};

// A preview returned by the "preview" action, plus the request that produced it.
export type PreviewResult = {
  revision: number;
  occurrences: Session[];
  removed: Session[];
  request: DraftForm;
  [key: string]: any;
};

// A session the user picked in the calendar or the conflict list.
export type Selection = { sessionId: string; openOptions: boolean; key: number };

// One staged change in the shared draft.
export type StagedChange = Record<string, any>;

// Handlers resolve to true when the request succeeded.
export type StageHandler = (pod: string, change: StagedChange) => Promise<boolean>;
export type PodHandler = (pod: string) => Promise<boolean>;

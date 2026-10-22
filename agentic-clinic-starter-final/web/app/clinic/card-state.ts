// Derives the visual state of each calendar card from data the client already
// has: committed sessions, the pod's draft changes, conflicts, draft issues and
// historical alerts. It decides nothing about scheduling.

export type CardSession = {
  id: string;
  client: string;
  therapist: string;
  date: string;
  time: string;
  minutes: number;
  location: string;
  room: string | null;
};

export type CardKind = "committed" | "conflict" | "staged" | "cancelled" | "moving" | "past";

export type CardModel = {
  key: string;
  kind: CardKind;
  session: CardSession;
  pills: string[];
  // For a "moving" ghost: where the draft puts the session.
  movedTo?: CardSession;
  // A client-side preview of an option the admin is considering. Not saved.
  preview?: boolean;
  // The conflict open in the side panel.
  selected?: boolean;
};

// The change a selected option would stage, drawn on the grid without the server.
export type CardPreview = { kind: "assign" | "cancel"; sessionId: string; therapist?: string };

export type CardInput = {
  // The pod's sessions with its draft applied (what the calendar shows).
  candidate: CardSession[];
  // Committed sessions.
  saved: CardSession[];
  // The pod's staged changes ([] when it has no draft).
  changes: { kind: string; sessionId?: string; session?: CardSession }[];
  conflictIds: Set<string>;
  issueIds: Set<string>;
  historicalIds: Set<string>;
  started: (session: CardSession) => boolean;
  // Also show the "Moving" ghost when only the therapist changes (Day view).
  ghostTherapistMoves: boolean;
  preview?: CardPreview | null;
  selectedId?: string | null;
};

export function buildCards(input: CardInput): CardModel[] {
  const saved = new Map(input.saved.map((item) => [item.id, item]));
  const changeById = new Map<string, { kind: string }>();
  for (const change of input.changes) {
    if (change.kind !== "add" && change.sessionId) changeById.set(change.sessionId, change);
  }
  const cards: CardModel[] = [];
  const preview = input.preview;
  for (const session of input.candidate) {
    if (preview?.sessionId === session.id) {
      if (preview.kind === "cancel") {
        cards.push({
          key: `${session.id}:preview`,
          kind: "cancelled",
          session,
          pills: ["Preview: cancel"],
          preview: true,
        });
        continue;
      }
      const moved = { ...session, therapist: preview.therapist || session.therapist };
      cards.push({ key: session.id, kind: "staged", session: moved, pills: ["Preview"], preview: true });
      if (input.ghostTherapistMoves && moved.therapist !== session.therapist) {
        cards.push({
          key: `${session.id}:from`,
          kind: "moving",
          session,
          pills: ["Moving"],
          movedTo: moved,
        });
      }
      continue;
    }
    const original = saved.get(session.id);
    const staged = !original || changeById.has(session.id);
    const issue = input.issueIds.has(session.id);
    if (staged) {
      cards.push({
        key: session.id,
        kind: "staged",
        session,
        pills: issue ? ["Draft", "Conflict"] : ["Draft"],
      });
      if (original) {
        const moved =
          original.date !== session.date ||
          original.time !== session.time ||
          original.minutes !== session.minutes ||
          (input.ghostTherapistMoves && original.therapist !== session.therapist);
        if (moved) {
          cards.push({
            key: `${session.id}:from`,
            kind: "moving",
            session: original,
            pills: ["Moving"],
            movedTo: session,
          });
        }
      }
    } else if (input.conflictIds.has(session.id) || issue) {
      cards.push({ key: session.id, kind: "conflict", session, pills: ["Conflict"] });
    } else if (input.started(session)) {
      cards.push({
        key: session.id,
        kind: "past",
        session,
        pills: input.historicalIds.has(session.id) ? ["Past", "On leave"] : ["Past"],
      });
    } else {
      cards.push({ key: session.id, kind: "committed", session, pills: [] });
    }
  }
  for (const card of cards) {
    if (card.session.id === input.selectedId && card.kind !== "moving") card.selected = true;
  }
  for (const change of input.changes) {
    if (change.kind !== "cancel" || !change.sessionId) continue;
    const original = saved.get(change.sessionId);
    if (original) {
      cards.push({
        key: `${original.id}:cancel`,
        kind: "cancelled",
        session: original,
        pills: ["Draft: cancel"],
      });
    }
  }
  return cards;
}

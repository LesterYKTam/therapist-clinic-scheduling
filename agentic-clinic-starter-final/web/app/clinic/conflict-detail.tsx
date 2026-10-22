"use client";

import { useEffect, useRef, useState } from "react";
// @ts-expect-error The JavaScript scheduling policy is verified in the Node suite.
import { workableAssignments } from "../../lib/scheduling.mjs";
import { nameOf } from "./names";
import {
  buildOptionCards,
  firstName,
  roomsFreeFrom,
  roomsFreeLabel,
  therapistsAtSession,
  whenLine,
  type OptionCard,
} from "./resolve-model";
import type { ClinicState, Session, StageHandler } from "./types";

// The OPTIONS cards for one conflict, built only from the engine's workable
// options (in the order it gives them) plus the last-resort cancel.
export function optionCardsFor(state: ClinicState, pod: string, session: Session): OptionCard[] {
  const options = state.workableOptions?.[session.id] ?? workableAssignments(state, pod, session.id);
  return buildOptionCards(session, options, state.therapists, state.clients, state.rooms);
}

// One conflict at a time: facts, engine options, and "Add 1 change to draft".
export function ConflictDetail({
  state,
  pod,
  conflict,
  position,
  total,
  sessions,
  cards,
  optionKey,
  onOption,
  onBack,
  onStage,
  onStaged,
}: {
  state: ClinicState;
  pod: string;
  conflict: any;
  position: number;
  total: number;
  // The pod's sessions with its draft applied.
  sessions: Session[];
  cards: OptionCard[];
  optionKey: string | null;
  onOption: (key: string | null) => void;
  onBack: () => void;
  onStage: StageHandler;
  // Called after the change is saved in the draft.
  onStaged: () => void;
}) {
  const session: Session = conflict.session;
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [session.id]);
  const client = state.clients.find((item) => item.id === session.client);
  const ranked = (client?.assigned || [])
    .map((id) => state.therapists.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item && item.active);
  const atHour = therapistsAtSession(
    session,
    ranked,
    sessions,
    state.clients,
    state.leaves || [],
    state.config,
  );
  // The pod view carries a clinic-wide roomsFree; a payload without it holds every pod's sessions.
  const freeRooms = state.roomsFree
    ? state.roomsFree[session.id]
    : roomsFreeFrom(session, state.sessions, state.rooms, state.config);
  const cause = (conflict.leaves || [])[0];
  const picked = cards.find((card) => card.key === optionKey);
  const onlyCancel = cards.length === 1;
  const stage = async () => {
    if (!picked || busy) return;
    setBusy(true);
    try {
      if (await onStage(pod, picked.change)) onStaged();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="resolve-card" aria-label="Conflict detail">
      <div className="detail-top">
        <button type="button" className="link-button" onClick={onBack}>
          ‹ All conflicts
        </button>
        <span className="resolve-sub">
          Conflict {position} of {total}
        </span>
      </div>
      <div className="detail-title">
        <span className="pill-tag pill-tag-conflict">Conflict</span>
        <h2 ref={heading} tabIndex={-1}>
          {nameOf(state.clients, session.client)}
        </h2>
        <div className="detail-when">{whenLine(session, state.rooms)}</div>
        <p className="resolve-sub">
          {cause
            ? `${nameOf(state.therapists, cause.therapist)} is on leave.`
            : "This session clashes with recorded leave."}
          {session.seriesId
            ? " Weekly series; this change applies to this session only."
            : " This change applies to this session only."}
        </p>
      </div>
      <div className="fact-tiles">
        <div className="fact-tile">
          <h3>Client</h3>
          <ol className="fact-ranked" aria-label="Ranked therapists">
            {ranked.map((person, index) => (
              <li key={person.id}>
                {index + 1}. {firstName(person.name)}
              </li>
            ))}
          </ol>
        </div>
        <div className="fact-tile">
          <h3>Therapists at {session.time}</h3>
          <ul>
            {atHour.map((person) => (
              <li key={person.id}>
                <strong>{firstName(person.name)}</strong>{" "}
                <span className={`state-${person.kind}`}>{person.state}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="fact-tile">
          <h3>Rooms free</h3>
          <div>{roomsFreeLabel(freeRooms, state.rooms)}</div>
        </div>
      </div>
      <div className="option-list">
        <h3 className="options-head">OPTIONS · SELECT ONE TO PREVIEW</h3>
        {onlyCancel && (
          <p className="resolve-note">
            No conflict-free reassignment for this session. Auto resolve all can try moving another session to make room (within the clinic’s cascade depth).
          </p>
        )}
        {cards.map((card) => {
          const pressed = card.key === optionKey;
          return (
            <button
              type="button"
              key={card.key}
              className={`option-card${pressed ? " is-selected" : ""}`}
              aria-pressed={pressed}
              onClick={() => onOption(pressed ? null : card.key)}
            >
              <span className="option-top">
                <strong>{card.title}</strong>
                {card.tag && (
                  <span className={`option-tag${card.lastResort ? " is-last" : ""}`}>{card.tag}</span>
                )}
              </span>
              <span className="option-rows">
                <span>
                  <span className="k">{card.lastResort ? "Effect" : "Rank"}</span>{" "}
                  <span className={card.lastResort ? "v-muted" : "v-good"}>
                    {card.rank}
                  </span>
                </span>
                <span>
                  <span className="k">{card.lastResort ? "Therapist" : "Availability"}</span>{" "}
                  <span className="v-good">{card.free}</span>
                </span>
                <span>
                  <span className="k">Room</span> <span className="v-good">{card.room}</span>
                </span>
              </span>
              <span className="option-step">1. {card.step}</span>
            </button>
          );
        })}
      </div>
      <div className="detail-actions">
        <button
          type="button"
          className="primary"
          disabled={!picked || busy}
          onClick={() => void stage()}
        >
          {picked ? "Add 1 change to draft" : "Select an option"}
        </button>
        <button type="button" onClick={onBack}>
          Skip
        </button>
      </div>
    </section>
  );
}

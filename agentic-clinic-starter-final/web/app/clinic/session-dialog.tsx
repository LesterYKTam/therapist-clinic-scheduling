"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Client, ClinicState, DraftForm, Session, Therapist } from "./types";
import { useDialog } from "./use-dialog";

// The Add session / Edit session dialog. Edits to an existing session also
// offer the cancel and "this + future" variants.
export function SessionDialog({
  state,
  pod,
  draft,
  setDraft,
  change,
  clients,
  staff,
  canUse,
  editing,
  defaultEnd,
  beginEdit,
  onBack,
  onSubmit,
}: {
  state: ClinicState;
  pod: string;
  draft: DraftForm;
  setDraft: Dispatch<SetStateAction<DraftForm>>;
  change: (name: string, value: string) => void;
  clients: Client[];
  staff: Therapist[];
  canUse: (therapist: Therapist) => boolean | undefined;
  editing: string | null;
  defaultEnd: (date: string) => string;
  beginEdit: (session: Session, future?: boolean, cancel?: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const editedSession = () => state.sessions.find((item) => item.id === editing)!;
  const { dialogProps, titleProps } = useDialog(onBack);
  return (
    <div className="modal">
      <div className="dialog" {...dialogProps}>
        <h2 {...titleProps}>{editing ? "Edit session" : "Add session"}</h2>
        <label>
          Client
          <select
            value={draft.client}
            onChange={(e) => {
              const chosen = clients.find((item) => item.id === e.target.value);
              const therapist =
                chosen?.assigned.find((id) => staff.some((person) => person.id === id)) || "";
              setDraft((previous) => ({ ...previous, client: e.target.value, therapist }));
            }}
          >
            {clients
              .filter((c) => c.pod === pod)
              .map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name} · Client
                </option>
              ))}
          </select>
        </label>
        <label>
          Therapist
          <select value={draft.therapist} onChange={(e) => change("therapist", e.target.value)}>
            {staff
              .filter((s) => s.pod === pod)
              .map((item) => (
                <option disabled={!canUse(item)} value={item.id} key={item.id}>
                  {item.name} · Therapist · {item.capHours} h/week
                </option>
              ))}
          </select>
        </label>
        <div className="two">
          <label>
            Date
            <input
              type="date"
              value={draft.date}
              onChange={(e) =>
                setDraft((p) => {
                  const nextDate = e.target.value;
                  const nextDefault = defaultEnd(nextDate);
                  return {
                    ...p,
                    date: nextDate,
                    startDate: nextDate,
                    endDate: p.endDate === p.defaultEndDate ? nextDefault : p.endDate,
                    defaultEndDate: nextDefault,
                  };
                })
              }
            />
          </label>
          <label>
            Time
            <input type="time" value={draft.time} onChange={(e) => change("time", e.target.value)} />
          </label>
        </div>
        <div className="two">
          <label>
            Duration
            <input
              type="number"
              min="15"
              max="480"
              step="15"
              value={draft.minutes}
              onChange={(e) => change("minutes", e.target.value)}
            />
          </label>
          <label>
            Location
            <select value={draft.location} onChange={(e) => change("location", e.target.value)}>
              <option value="clinic">Clinic</option>
              <option value="home">Home</option>
            </select>
          </label>
        </div>
        {draft.location === "clinic" && (
          <label>
            Shared room
            <select value={draft.room ?? undefined} onChange={(e) => change("room", e.target.value)}>
              {state.rooms
                .filter((r) => r.active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {!editing && (
          <label className="check">
            <input
              type="checkbox"
              checked={draft.kind === "weekly"}
              onChange={(e) =>
                setDraft((p) => {
                  const nextDefault = defaultEnd(p.date);
                  return {
                    ...p,
                    kind: e.target.checked ? "weekly" : "one-off",
                    startDate: p.date,
                    endDate:
                      p.endDate === p.defaultEndDate || !p.endDate ? nextDefault : p.endDate,
                    defaultEndDate: nextDefault,
                  };
                })
              }
            />{" "}
            Repeat weekly
          </label>
        )}
        {["weekly", "edit-future"].includes(draft.kind) && (
          <label>
            Required end date
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => change("endDate", e.target.value)}
            />
          </label>
        )}
        <button onClick={onBack}>Back</button>
        <button className="primary" onClick={onSubmit}>
          {!editing ? "Stage session" : "Preview change"}
        </button>
        {editing && (
          <div className="manage-modal">
            <button
              onClick={() => {
                beginEdit(editedSession(), false, true);
              }}
            >
              Cancel this
            </button>
            {editedSession()?.seriesId && (
              <>
                <button onClick={() => beginEdit(editedSession(), true)}>Edit this + future</button>
                <button onClick={() => beginEdit(editedSession(), true, true)}>
                  Cancel this + future
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

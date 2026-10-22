"use client";

import { useState } from "react";
import type { ClinicState, Session, StageHandler } from "./types";

type RescheduleForm = {
  therapist: string;
  date: string;
  time: string;
  minutes: number;
  location: string;
  room: string | null;
};

// Stages a move or a duration change for one session in the shared draft.
export function RescheduleDraftForm({
  state,
  pod,
  session,
  onStage,
}: {
  state: ClinicState;
  pod: string;
  session: Session;
  onStage: StageHandler;
}) {
  const saved = state.drafts
    ?.find((item) => item.pod === pod)
    ?.changes.find((item: any) => item.sessionId === session.id);
  const source = saved?.kind === "reschedule" ? saved : session;
  const [form, setForm] = useState<RescheduleForm>({
    therapist: source.therapist,
    date: source.date,
    time: source.time,
    minutes: source.minutes,
    location: source.location,
    room: source.room,
  });
  const client = state.clients.find((item) => item.id === session.client);
  const therapists = state.therapists.filter(
    (item) => item.active && client?.assigned.includes(item.id),
  );
  const put = (key: keyof RescheduleForm, value: string | number) =>
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "location" && value === "home" ? { room: null } : {}),
    }));
  return (
    <div className="person">
      <h3>Move or change duration</h3>
      <label>
        Therapist
        <select value={form.therapist} onChange={(e) => put("therapist", e.target.value)}>
          {therapists.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name} · Therapist
            </option>
          ))}
        </select>
      </label>
      <div className="two">
        <label>
          Date
          <input type="date" value={form.date} onChange={(e) => put("date", e.target.value)} />
        </label>
        <label>
          Time
          <input type="time" value={form.time} onChange={(e) => put("time", e.target.value)} />
        </label>
      </div>
      <div className="two">
        <label>
          Duration in minutes
          <input
            type="number"
            min="1"
            max="480"
            value={form.minutes}
            onChange={(e) => put("minutes", Number(e.target.value))}
          />
        </label>
        <label>
          Location
          <select value={form.location} onChange={(e) => put("location", e.target.value)}>
            <option value="clinic">Clinic</option>
            <option value="home">Home</option>
          </select>
        </label>
      </div>
      {form.location === "clinic" && (
        <label>
          Shared room
          <select value={form.room || ""} onChange={(e) => put("room", e.target.value)}>
            {state.rooms
              .filter((item) => item.active)
              .map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <button
        onClick={() => void onStage(pod, { kind: "reschedule", sessionId: session.id, ...form })}
      >
        Stage reschedule
      </button>
    </div>
  );
}

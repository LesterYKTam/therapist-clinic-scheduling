"use client";

import { useEffect, useState } from "react";
import type { ClinicState } from "./types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

type Collection = "rooms" | "therapists" | "clients";
type SetNext = (update: (old: any) => any) => void;

function CalendarSettings({
  next,
  config,
}: {
  next: ClinicState;
  config: (key: string, value: any) => void;
}) {
  return (
    <section className="card">
      <h2>Calendar settings</h2>
      <label>
        Timezone
        <input value={next.config.timezone} onChange={(e) => config("timezone", e.target.value)} />
      </label>
      <div className="two">
        <label>
          Open
          <input type="time" value={next.config.open} onChange={(e) => config("open", e.target.value)} />
        </label>
        <label>
          Close
          <input type="time" value={next.config.close} onChange={(e) => config("close", e.target.value)} />
        </label>
      </div>
      <label>
        Default recurrence weeks
        <input
          type="number"
          min="1"
          max="104"
          value={next.config.recurrenceWeeks}
          onChange={(e) => config("recurrenceWeeks", Number(e.target.value))}
        />
      </label>
      <label>
        Auto resolve cascade depth
        <select
          value={next.config.cascadeDepth}
          onChange={(e) => config("cascadeDepth", Number(e.target.value))}
        >
          <option value="0">0 · No displaced sessions</option>
          <option value="1">1 · One displaced session</option>
          <option value="2">2 · Up to two displaced sessions</option>
        </select>
      </label>
      <label>
        Week starts
        <select
          value={next.config.weekStart}
          onChange={(e) => config("weekStart", Number(e.target.value))}
        >
          {ALL_DAYS.map((day) => (
            <option key={day} value={day}>
              {WEEKDAYS[day - 1]}
            </option>
          ))}
        </select>
      </label>
      <div className="day-checks">
        {ALL_DAYS.map((day) => (
          <label className="check" key={day}>
            {WEEKDAYS_SHORT[day - 1]}
            <input
              type="checkbox"
              checked={next.config.workingDays.includes(day)}
              onChange={(e) =>
                config(
                  "workingDays",
                  e.target.checked
                    ? [...next.config.workingDays, day].sort()
                    : next.config.workingDays.filter((value) => value !== day),
                )
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function RoomsSection({
  next,
  update,
  onAdd,
}: {
  next: ClinicState;
  update: (collection: Collection, id: string, key: string, value: any) => void;
  onAdd: () => void;
}) {
  return (
    <section className="card">
      <h2>Shared rooms</h2>
      <p>
        Turn off Active to remove a room from future bookings. Existing future reservations must be moved first; past reservations remain readable.
      </p>
      {next.rooms.map((room) => (
        <div className="row" key={room.id}>
          <input
            value={room.name}
            aria-label="Room name"
            onChange={(e) => update("rooms", room.id, "name", e.target.value)}
          />
          <label className="check">
            Active
            <input
              type="checkbox"
              checked={room.active}
              onChange={(e) => update("rooms", room.id, "active", e.target.checked)}
            />
          </label>
        </div>
      ))}
      <button onClick={onAdd}>Add room</button>
    </section>
  );
}

function StaffSection({
  next,
  pod,
  setPod,
  update,
  onAdd,
}: {
  next: ClinicState;
  pod: string;
  setPod: (id: string) => void;
  update: (collection: Collection, id: string, key: string, value: any) => void;
  onAdd: () => void;
}) {
  return (
    <section className="card">
      <h2>Staff</h2>
      {next.therapists.map((staff) => (
        <div className="person" key={staff.id}>
          <input
            value={staff.name}
            aria-label="Staff name"
            onChange={(e) => update("therapists", staff.id, "name", e.target.value)}
          />
          <span>{next.pods.find((item) => item.id === staff.pod)?.name} · Therapist</span>
          <div className="two">
            <label>
              Weekly cap
              <input
                type="number"
                min="1"
                max="80"
                value={staff.capHours}
                onChange={(e) => update("therapists", staff.id, "capHours", Number(e.target.value))}
              />
            </label>
            <label className="check">
              Active
              <input
                type="checkbox"
                checked={staff.active}
                onChange={(e) => update("therapists", staff.id, "active", e.target.checked)}
              />
            </label>
          </div>
        </div>
      ))}
      <label>
        New person pod
        <select value={pod} onChange={(e) => setPod(e.target.value)}>
          {next.pods.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <button onClick={onAdd}>Add therapist</button>
    </section>
  );
}

function ClientsSection({
  next,
  update,
  onAdd,
}: {
  next: ClinicState;
  update: (collection: Collection, id: string, key: string, value: any) => void;
  onAdd: () => void;
}) {
  return (
    <section className="card">
      <h2>Clients and ranked therapists</h2>
      {next.clients.map((client) => (
        <div className="person" key={client.id}>
          <input
            value={client.name}
            aria-label="Client name"
            onChange={(e) => update("clients", client.id, "name", e.target.value)}
          />
          <span>{next.pods.find((item) => item.id === client.pod)?.name} · Client</span>
          <label className="check">
            Active
            <input
              type="checkbox"
              checked={client.active}
              onChange={(e) => update("clients", client.id, "active", e.target.checked)}
            />
          </label>
          {[0, 1, 2].map((rank) => (
            <label key={rank}>
              Rank {rank + 1}
              <select
                value={client.assigned[rank]}
                onChange={(e) =>
                  update(
                    "clients",
                    client.id,
                    "assigned",
                    client.assigned.map((id, index) => (index === rank ? e.target.value : id)),
                  )
                }
              >
                {next.therapists
                  .filter((staff) => staff.pod === client.pod)
                  .map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} · Therapist
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      ))}
      <button onClick={onAdd}>Add client</button>
    </section>
  );
}

// Clinic configuration: calendar settings, rooms, staff, clients. Edits a local
// copy of the state until "Check impact and save setup" is pressed.
export function SetupScreen({
  state,
  onSaved,
  readOnly = false,
}: {
  state: ClinicState;
  onSaved: (next: ClinicState) => void;
  readOnly?: boolean;
}) {
  const [next, setNext] = useState<ClinicState>(() => structuredClone(state));
  const [pod, setPod] = useState(state.pods[0]?.id || "");
  useEffect(() => setNext(structuredClone(state)), [state]);
  const edit: SetNext = (update) => setNext(update);
  const config = (key: string, value: any) =>
    edit((old) => ({ ...old, config: { ...old.config, [key]: value } }));
  const update = (collection: Collection, id: string, key: string, value: any) =>
    edit((old) => ({
      ...old,
      [collection]: old[collection].map((item: any) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
  const addRoom = () =>
    edit((old) => ({
      ...old,
      rooms: [
        ...old.rooms,
        { id: `room-${crypto.randomUUID()}`, name: `Room ${old.rooms.length + 1}`, active: true },
      ],
    }));
  const addTherapist = () =>
    edit((old) => ({
      ...old,
      therapists: [
        ...old.therapists,
        { id: `staff-${crypto.randomUUID()}`, pod, name: "New therapist", capHours: 20, active: true },
      ],
    }));
  const addClient = () =>
    edit((old) => {
      const assigned = old.therapists
        .filter((item: any) => item.pod === pod)
        .slice(0, 3)
        .map((item: any) => item.id);
      return {
        ...old,
        clients: [
          ...old.clients,
          { id: `client-${crypto.randomUUID()}`, pod, name: "New client", active: true, assigned },
        ],
      };
    });
  return (
    <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <header>
        <p className="eyebrow">Infrequent clinic configuration</p>
        <h1>Setup</h1>
        <p>Changes are checked against every committed booking before saving.</p>
        {readOnly && (
          <p>Setup is read-only while you view another pod. Switch back to your own pod to edit.</p>
        )}
      </header>
      <div className="grid">
        <CalendarSettings next={next} config={config} />
        <RoomsSection next={next} update={update} onAdd={addRoom} />
        <StaffSection next={next} pod={pod} setPod={setPod} update={update} onAdd={addTherapist} />
        <ClientsSection next={next} update={update} onAdd={addClient} />
      </div>
      <button className="primary" onClick={() => onSaved(next)}>
        Check impact and save setup
      </button>
    </fieldset>
  );
}

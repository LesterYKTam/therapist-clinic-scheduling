"use client";

import { useState } from "react";
import { authClient } from "../../../lib/auth-client";

type Pod = { id: string; name: string };
type Admin = { id: string; name: string; email: string; podId: string | null };

function PodAssignment({ admin, pods }: { admin: Admin; pods: Pod[] }) {
  const [podId, setPodId] = useState(admin.podId || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <form onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/pod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: admin.id, podId: podId || null }) });
      if (!response.ok) throw new Error((await response.json()).error || "Could not save pod assignment.");
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save pod assignment."); setBusy(false); }
  }}>
    <label htmlFor={`pod-${admin.id}`}>{admin.name} ({admin.email})</label>
    <select id={`pod-${admin.id}`} value={podId} onChange={event => setPodId(event.target.value)}>
      <option value="">Unassigned</option>
      {pods.map(pod => <option key={pod.id} value={pod.id}>{pod.name}</option>)}
    </select>
    <button type="submit" disabled={busy || podId === (admin.podId || "")}>{busy ? "Saving…" : "Save"}</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}

export default function AdminConfigClient({ pods, admins }: { pods: Pod[]; admins: Admin[] }) {
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <main style={{ maxWidth: 820, margin: "40px auto", padding: 24 }}>
    <h1>Admin accounts and pods</h1>
    <p>All admins have the same rights. Assign a pod before an admin accesses people, leave, schedules, drafts or reports. Admins may manage shared rooms.</p>
    <p><a href="/">Return to clinic</a> · <button type="button" onClick={async () => { await authClient.signOut(); window.location.assign("/sign-in"); }}>Sign out</button></p>
    <h2>Pod assignments</h2>
    {admins.map(admin => <PodAssignment key={admin.id} admin={admin} pods={pods} />)}
    <h2>Create admin account</h2>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      const result = await authClient.admin.createUser({ name, email, password, role: "admin" });
      setBusy(false);
      if (result.error) setError(result.error.message || "Could not create admin account.");
      else { setPassword(""); window.location.reload(); }
    }}>
      <label>Name<input required value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>Temporary password<input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create admin"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </main>;
}

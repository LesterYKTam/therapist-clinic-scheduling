"use client";

import { useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function SignInForm({ publicDemo = false }: { publicDemo?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main style={{ maxWidth: 440, margin: "10vh auto", padding: 24 }}>
    <h1>Clinic admin sign in</h1>
    {publicDemo
      ? <div className="notice"><p>Public demo with synthetic data only. Sign in as:</p><ul><li>maple@demo.clinic (Maple pod)</li><li>cedar@demo.clinic (Cedar pod)</li></ul><p>The password is in the project README.</p></div>
      : <p>Use your clinic-managed admin account.</p>}
    <form onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError("");
      const result = await authClient.signIn.email({ email, password });
      setBusy(false);
      if (result.error) setError("Sign in failed. Check your account details.");
      else window.location.assign("/");
    }}>
      <label>Email<input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  </main>;
}

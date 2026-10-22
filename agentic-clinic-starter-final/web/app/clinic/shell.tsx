"use client";

import { authClient } from "../../lib/auth-client";
import type { ClinicState, Screen } from "./types";

const SCREENS: Screen[] = ["calendar", "setup", "reports"];

export function Sidebar({
  screen,
  setScreen,
  editingPod,
  authenticated,
  state,
  pod,
  setPod,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  editingPod: string | null;
  authenticated: boolean;
  state: ClinicState;
  pod: string;
  setPod: (id: string) => void;
}) {
  // Authenticated: the admin's assigned pod; demo mode: the selected pod.
  const contextPod = authenticated && state.assignedPod ? state.assignedPod : pod;
  const contextName = (state.allPods || state.pods).find((item) => item.id === contextPod)?.name || "Selected pod";
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="brand">Stillwell</div>
      <div className="sidebar-context">{contextName} · Admin</div>
      <label className="sidebar-pod">
        View pod
        <select value={pod} disabled={!!editingPod} onChange={(e) => setPod(e.target.value)}>
          {(state.allPods || state.pods).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {authenticated && state.assignedPod && item.id !== state.assignedPod
                ? " (read-only)"
                : ""}
            </option>
          ))}
        </select>
      </label>
      {SCREENS.map((item) => (
        <button
          key={item}
          className={screen === item ? "nav active" : "nav"}
          aria-current={screen === item ? "page" : undefined}
          disabled={!!editingPod && item !== "calendar"}
          onClick={() => setScreen(item)}
        >
          {item === "calendar" ? "Calendar" : item[0].toUpperCase() + item.slice(1)}
        </button>
      ))}
      {authenticated && (
        <>
          <a className="nav" href="/config/admins">
            Admin configuration
          </a>
          <button
            className="sidebar-signout"
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/sign-in");
            }}
          >
            Sign out
          </button>
        </>
      )}
    </nav>
  );
}

export function ConflictStatus({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  return (
    <button
      className={count ? "conflict-status active" : "conflict-status clear"}
      onClick={onOpen}
      aria-label={
        count ? `${count} schedule conflicts. Open Calendar.` : "No conflicts. Open Calendar."
      }
    >
      {count ? `⚠ ${count} Schedule conflicts` : "✓ No conflicts"}
    </button>
  );
}

export function Notices({
  readOnly,
  state,
  podName,
  notice,
  failure,
}: {
  readOnly: boolean;
  state: ClinicState;
  podName: (id?: string) => string | undefined;
  notice: string;
  failure: string;
}) {
  return (
    <>
      {readOnly && (
        <p className="notice" role="status">
          Viewing {podName(state.viewPod)} — read-only. You can edit only {podName(state.assignedPod)}.
        </p>
      )}
      {notice && <p className="notice">{notice}</p>}
      {failure && (
        <p className="notice error" role="alert">
          {failure}
        </p>
      )}
    </>
  );
}

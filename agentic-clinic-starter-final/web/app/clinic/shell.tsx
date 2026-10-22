"use client";

import { authClient } from "../../lib/auth-client";
import type { ClinicState, Screen } from "./types";

const SCREENS: Screen[] = ["calendar", "setup", "reports"];

export function Sidebar({
  screen,
  setScreen,
  editingPod,
  authenticated,
  podLabel,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  editingPod: string | null;
  authenticated: boolean;
  podLabel?: string;
}) {
  return (
    <aside>
      <div className="brand">Stillwell</div>
      <p>CLINIC WORKSPACE</p>
      {SCREENS.map((item) => (
        <button
          key={item}
          className={screen === item ? "nav active" : "nav"}
          disabled={!!editingPod && item !== "calendar"}
          onClick={() => setScreen(item)}
        >
          {item === "calendar" ? "Calendar" : item[0].toUpperCase() + item.slice(1)}
        </button>
      ))}
      {authenticated && (
        <>
          <a href="/config/admins">Admin configuration</a>
          <button
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/sign-in");
            }}
          >
            Sign out
          </button>
        </>
      )}
      <small>
        {podLabel || "Selected pod"} · {authenticated ? "Admin" : "Local admin"}
      </small>
    </aside>
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

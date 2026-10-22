"use client";

import { useEffect, useRef } from "react";
import { authClient } from "../../lib/auth-client";
import { summarizeFailure } from "./notice-text";
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
  reveal = false,
}: {
  readOnly: boolean;
  state: ClinicState;
  podName: (id?: string) => string | undefined;
  notice: string;
  failure: string;
  // Scroll a new result into view and move focus to it (Setup saves from the page bottom).
  reveal?: boolean;
}) {
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!reveal) return;
    const target = failure ? failureRef.current : notice ? noticeRef.current : null;
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [reveal, notice, failure]);
  const summary = summarizeFailure(failure);
  return (
    <>
      {readOnly && (
        <p className="notice" role="status">
          Viewing {podName(state.viewPod)} — read-only. You can edit only {podName(state.assignedPod)}.
        </p>
      )}
      {notice && (
        <p className="notice" id="clinic-notice" role="status" aria-live="polite" tabIndex={-1} ref={noticeRef}>
          {notice}
        </p>
      )}
      {failure && (
        <div className="notice error" role="alert" tabIndex={-1} ref={failureRef}>
          {summary.more ? (
            <>
              <p className="notice-lead">{summary.lead}</p>
              <ul className="notice-list">
                {summary.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <details>
                <summary>and {summary.more} more</summary>
                <ul className="notice-list">
                  {summary.full.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            failure
          )}
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { call, EDITING_POD_KEY } from "./api";
import { today } from "./dates";
import type {
  Client,
  ClinicState,
  DraftForm,
  PreviewResult,
  Screen,
  Therapist,
} from "./types";

// Owns the server state, the screen-level UI state and the "editing pod"
// marker that the browser tab keeps in sessionStorage.
export function useClinic(initial: ClinicState, authenticated: boolean) {
  const [state, setState] = useState<ClinicState>(initial);
  const [screen, setScreen] = useState<Screen>("calendar");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [draft, setDraft] = useState<DraftForm>({
    kind: "one-off",
    client: "a-c1",
    therapist: "a-t1",
    date: today(),
    time: "09:00",
    minutes: 60,
    location: "clinic",
    room: "room-1",
    endDate: "",
  });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [report, setReport] = useState<any>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingPod, setEditingPod] = useState<string | null>(null);
  const [calendarPod, setCalendarPod] = useState<string>(
    initial.viewPod || initial.pods[0]?.id || "",
  );
  // D-B020: another pod is view-only; demo mode has one trusted admin.
  const readOnly = authenticated && !!state.readOnly;
  const podName = (id?: string) =>
    (state.allPods || state.pods).find((item) => item.id === id)?.name || id;

  useEffect(() => {
    const saved = sessionStorage.getItem(EDITING_POD_KEY);
    if (saved && initial.pods.some((item) => item.id === saved)) setEditingPod(saved);
    else sessionStorage.removeItem(EDITING_POD_KEY);
  }, [initial.pods]);

  useEffect(() => {
    if (editingPod) {
      setCalendarPod(editingPod);
      setScreen("calendar");
    }
  }, [editingPod]);

  const staff = useMemo(
    () => state.therapists.filter((item: Therapist) => item.active),
    [state],
  );
  const clients = useMemo(
    () => state.clients.filter((item: Client) => item.active),
    [state],
  );
  const podConflictCount = (state.conflicts || []).filter(
    (issue) =>
      state.clients.find((client) => client.id === issue.session.client)?.pod ===
      calendarPod,
  ).length;

  const reload = async () => {
    const next = await call(
      undefined,
      authenticated && state.viewPod
        ? `?viewPod=${encodeURIComponent(state.viewPod)}`
        : "",
    );
    setState(next);
    const marker = sessionStorage.getItem(EDITING_POD_KEY);
    if (
      !next.readOnly &&
      marker &&
      !next.drafts?.some(
        (item: any) =>
          item.pod === marker && (item.changes.length || item.autoResolveRun),
      )
    ) {
      sessionStorage.removeItem(EDITING_POD_KEY);
      setEditingPod(null);
    }
  };

  // Runs a request, clearing old messages first. Resolves to true on success.
  const perform = async (fn: () => Promise<void>) => {
    setFailure("");
    setNotice("");
    try {
      await fn();
      return true;
    } catch (caught) {
      setFailure(
        caught instanceof Error ? caught.message : "Unable to complete request.",
      );
      return false;
    }
  };

  // Remember (or forget) which pod holds the open shared draft in this tab.
  const markEditingPod = (pod: string) => {
    sessionStorage.setItem(EDITING_POD_KEY, pod);
    setEditingPod(pod);
  };
  const clearEditingPod = () => {
    sessionStorage.removeItem(EDITING_POD_KEY);
    setEditingPod(null);
  };

  const switchPod = (id: string) =>
    perform(async () => {
      if (!authenticated) {
        setCalendarPod(id);
        return;
      }
      const next = await call(undefined, `?viewPod=${encodeURIComponent(id)}`);
      setState(next);
      setCalendarPod(id);
      setPreview(null);
      setEditing(null);
      setReport(null);
    });

  return {
    authenticated,
    state,
    screen,
    setScreen,
    notice,
    setNotice,
    failure,
    draft,
    setDraft,
    preview,
    setPreview,
    report,
    setReport,
    editing,
    setEditing,
    editingPod,
    calendarPod,
    readOnly,
    podName,
    staff,
    clients,
    podConflictCount,
    reload,
    perform,
    markEditingPod,
    clearEditingPod,
    switchPod,
  };
}

export type Clinic = ReturnType<typeof useClinic>;

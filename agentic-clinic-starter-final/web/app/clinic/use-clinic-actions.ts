"use client";

import { call } from "./api";
import type { Clinic } from "./use-clinic";
import type { LeaveInterval, LeaveWindow, Session, StagedChange } from "./types";

// Every request the workspace can make, with the success message it shows.
// Each one re-reads the committed state and sends the revision it was shown.
export function useClinicActions(clinic: Clinic) {
  const {
    state,
    draft,
    setDraft,
    preview,
    setPreview,
    setReport,
    setEditing,
    setNotice,
    editingPod,
    clients,
    reload,
    perform,
    markEditingPod,
    clearEditingPod,
  } = clinic;

  const change = (name: string, value: string) =>
    setDraft((previous) => ({
      ...previous,
      [name]: name === "minutes" ? Number(value) : value,
      ...(name === "location" && value === "home" ? { room: null } : {}),
    }));

  const selectedClient = clients.find((client) => client.id === draft.client);
  const canUse = (therapist: { id: string }) =>
    selectedClient?.assigned.includes(therapist.id);

  const previewDraft = () =>
    perform(async () => {
      if (draft.kind === "one-off" || draft.kind === "weekly") {
        const pod = state.clients.find((item) => item.id === draft.client)?.pod;
        if (!pod) throw new Error("Choose a client in a valid pod.");
        if (editingPod && editingPod !== pod) {
          throw new Error(
            "Commit or discard the current pod draft before editing another pod.",
          );
        }
        await call({
          action: "stage-draft-add",
          pod,
          revision: state.revision,
          ...draft,
        });
        markEditingPod(pod);
        await reload();
        setNotice("Session added to the shared draft. Review conflicts before commit.");
        return;
      }
      if (editingPod) {
        throw new Error(
          "Use the shared draft controls to edit existing sessions before committing.",
        );
      }
      const result = await call({ action: "preview", ...draft });
      setPreview({ ...result, request: draft });
      setNotice("Preview ready. Nothing has been saved.");
    });

  const beginEdit = (session: Session, future = false, cancel = false) => {
    setEditing(session.id);
    setDraft({
      kind: cancel
        ? future
          ? "cancel-future"
          : "cancel-occurrence"
        : future
          ? "edit-future"
          : "edit-occurrence",
      occurrenceId: session.id,
      client: session.client,
      therapist: session.therapist,
      date: session.date,
      startDate: session.date,
      endDate:
        state.series.find((series) => series.id === session.seriesId)?.endDate ||
        session.date,
      time: session.time,
      minutes: session.minutes,
      location: session.location,
      room: session.room,
    });
  };

  const commit = () =>
    perform(async () => {
      await call({
        action: "commit",
        revision: preview!.revision,
        ...preview!.request,
      });
      await reload();
      setPreview(null);
      setNotice("Committed to the calendar.");
    });

  const loadReport = () =>
    perform(async () => {
      const month = (document.getElementById("month") as HTMLInputElement).value;
      const therapist = (
        document.getElementById("reportStaff") as HTMLSelectElement
      ).value;
      const value = await fetch(
        `/api/clinic?reportStaff=${encodeURIComponent(therapist)}&month=${encodeURIComponent(month)}`,
      ).then((r) => r.json());
      if (value.error) throw new Error(value.error);
      setReport(value);
    });

  const recordLeave = (leave: LeaveInterval) =>
    perform(async () => {
      await call({ action: "record-leave", revision: state.revision, leave });
      await reload();
      setNotice("Leave recorded. Schedule conflicts have been refreshed.");
    });

  const amendLeave = (pod: string, leaveId: string, leave: LeaveWindow) =>
    perform(async () => {
      await call({
        action: "amend-leave",
        pod,
        leaveId,
        leave,
        revision: state.revision,
      });
      await reload();
      setNotice("Recorded leave updated. Schedule conflicts have been refreshed.");
    });

  const withdrawLeave = (pod: string, leaveId: string) =>
    perform(async () => {
      await call({
        action: "withdraw-leave",
        pod,
        leaveId,
        revision: state.revision,
      });
      await reload();
      setNotice("Recorded leave withdrawn. Schedule conflicts have been refreshed.");
    });

  const recheckConflicts = () =>
    perform(async () => {
      await reload();
      setNotice("Schedule conflicts rechecked against the latest committed schedule.");
    });

  const removeDraftChange = (pod: string, sessionId: string) =>
    perform(async () => {
      await call({
        action: "remove-draft-change",
        pod,
        sessionId,
        revision: state.revision,
      });
      await reload();
      setNotice(
        "Staged change removed from the shared draft. The committed schedule is unchanged.",
      );
    });

  const stageDraft = (pod: string, change: StagedChange) =>
    perform(async () => {
      await call({ action: "stage-draft", pod, change, revision: state.revision });
      markEditingPod(pod);
      await reload();
      setNotice(
        "Change saved in the shared draft. The committed schedule is unchanged.",
      );
    });

  const previewAutoResolve = (pod: string) =>
    perform(async () => {
      await call({ action: "preview-auto-resolve", pod, revision: state.revision });
      markEditingPod(pod);
      await reload();
      setNotice(
        "Auto resolve proposal is ready for review. The committed calendar is unchanged.",
      );
    });

  const applyAutoResolve = (pod: string) =>
    perform(async () => {
      await call({ action: "apply-auto-resolve", pod, revision: state.revision });
      await reload();
      setNotice(
        "Suggestions added to the shared draft. Review remaining issues before commit.",
      );
    });

  const discardAutoResolve = (pod: string) =>
    perform(async () => {
      await call({ action: "discard-auto-resolve", pod, revision: state.revision });
      await reload();
      setNotice(
        "Suggestions discarded. You can keep editing the shared draft manually.",
      );
    });

  const commitSharedDraft = (pod: string) =>
    perform(async () => {
      await call({ action: "commit-draft", pod, revision: state.revision });
      clearEditingPod();
      await reload();
      setNotice("Shared draft committed to the calendar.");
    });

  const discardSharedDraft = (pod: string) =>
    perform(async () => {
      await call({ action: "discard-draft", pod, revision: state.revision });
      clearEditingPod();
      await reload();
      setNotice("Shared draft discarded. Recorded leave remains in place.");
    });

  const handleNotification = (pod: string, taskId: string) =>
    perform(async () => {
      await call({
        action: "handle-notification",
        pod,
        taskId,
        revision: state.revision,
      });
      await reload();
      setNotice("Notification task marked handled.");
    });

  const saveSetup = (setup: unknown) =>
    perform(async () => {
      await call({ action: "setup", revision: state.revision, setup });
      await reload();
      setNotice("Setup saved.");
    });

  return {
    change,
    canUse,
    previewDraft,
    beginEdit,
    commit,
    loadReport,
    recordLeave,
    amendLeave,
    withdrawLeave,
    recheckConflicts,
    removeDraftChange,
    stageDraft,
    previewAutoResolve,
    applyAutoResolve,
    discardAutoResolve,
    commitSharedDraft,
    discardSharedDraft,
    handleNotification,
    saveSetup,
  };
}

export type ClinicActions = ReturnType<typeof useClinicActions>;

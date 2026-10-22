"use client";

import { CalendarScreen } from "./clinic/calendar-screen";
import { ReportsScreen } from "./clinic/reports-screen";
import { SetupScreen } from "./clinic/setup-screen";
import { ConflictStatus, Notices, Sidebar } from "./clinic/shell";
import type { ClinicState } from "./clinic/types";
import { useClinic } from "./clinic/use-clinic";
import { useClinicActions } from "./clinic/use-clinic-actions";

export default function ClinicClient({
  initial,
  authenticated = false,
}: {
  initial: ClinicState;
  authenticated?: boolean;
}) {
  const clinic = useClinic(initial, authenticated);
  const actions = useClinicActions(clinic);
  const { state, screen, setScreen, editingPod, calendarPod, readOnly } = clinic;
  const conflictStatus = (
    <ConflictStatus
      count={clinic.podConflictCount}
      onOpen={() => {
        setScreen("calendar");
        void actions.recheckConflicts();
      }}
    />
  );
  return (
    <main className="workspace">
      <Sidebar
        screen={screen}
        setScreen={setScreen}
        editingPod={editingPod}
        authenticated={authenticated}
        state={state}
        pod={calendarPod}
        setPod={clinic.switchPod}
      />
      <section className="content">
        {screen !== "calendar" && conflictStatus}
        <Notices
          readOnly={readOnly}
          state={state}
          podName={clinic.podName}
          notice={clinic.notice}
          failure={clinic.failure}
          reveal={screen === "setup"}
        />
        {screen === "calendar" && (
          <CalendarScreen
            {...actions}
            state={state}
            pod={calendarPod}
            conflictStatus={conflictStatus}
            readOnly={readOnly}
            draft={clinic.draft}
            setDraft={clinic.setDraft}
            preview={clinic.preview}
            setPreview={clinic.setPreview}
            editing={clinic.editing}
            setEditing={clinic.setEditing}
            clients={clinic.clients}
            staff={clinic.staff}
            editingPod={editingPod}
          />
        )}
        {screen === "setup" && (
          <SetupScreen state={state} readOnly={readOnly} onSaved={actions.saveSetup} />
        )}
        {screen === "reports" && (
          <ReportsScreen state={state} report={clinic.report} onGenerate={actions.loadReport} />
        )}
      </section>
    </main>
  );
}

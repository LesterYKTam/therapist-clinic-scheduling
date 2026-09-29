import type { NextRequest } from "next/server";
// @ts-expect-error JavaScript store is exercised directly by the Node integration suite.
import { PostgresClinicStore } from "../../../lib/clinic-store.mjs";
// @ts-expect-error JavaScript scheduling policy is covered by the Node integration suite.
import { withConflicts } from "../../../lib/scheduling.mjs";
// @ts-expect-error The pure pod projection is covered by the Node suite.
import { podView } from "../../../lib/pod-view.mjs";
// @ts-expect-error The action policy is exercised by the Node access suite.
import { authorizeClinicAction, mergePodSetup } from "../../../lib/clinic-access.mjs";

// @ts-expect-error Demo-mode guard is exercised by the Node suite.
import { demoModeGate } from "../../../lib/demo-mode.mjs";
// @ts-expect-error Rule-error classification is exercised by the Node suite.
import { isClinicRuleError } from "../../../lib/clinic-error.mjs";
// @ts-expect-error The pure pod projection is covered by the Node suite.
import { podTextRedactor } from "../../../lib/pod-view.mjs";

export const dynamic = "force-dynamic";

function store() { return new PostgresClinicStore(); }
function response(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
function error(error: unknown) { return response({ error: error instanceof Error ? error.message : "Unexpected scheduling error." }, 400); }
const GENERIC_ACTION_ERROR = "Unable to complete this clinic action. Refresh and try again.";
/**
 * Intentional rule violations (ClinicRuleError) reach the user, with other pods' names and ids redacted for pod admins.
 * Everything else (database errors, TypeErrors, bugs) is logged server-side and stays generic.
 */
async function actionFailure(caught: unknown, podId: string | null, clinic: InstanceType<typeof PostgresClinicStore> | undefined) {
  if (!isClinicRuleError(caught)) {
    console.error("Clinic action failed", caught);
    return response({ error: GENERIC_ACTION_ERROR }, 500);
  }
  let message = (caught as Error).message;
  if (podId) {
    try {
      if (!clinic) throw new Error("no store");
      message = podTextRedactor(await clinic.read(), podId)(message);
    } catch (redactionFailure) {
      // Without the committed state we cannot prove the message is free of other pods' data.
      console.error("Could not redact clinic action error", redactionFailure);
      return response({ error: GENERIC_ACTION_ERROR }, 500);
    }
  }
  return response({ error: message }, 400);
}
function requestFrom(body: any) {
  const allowed = ["kind", "client", "therapist", "date", "startDate", "endDate", "time", "minutes", "location", "room", "occurrenceId"];
  return Object.fromEntries(allowed.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

export async function GET(request: NextRequest) {
  const { demo, refusal } = demoModeGate();
  if (refusal) return refusal;
  const clinic = store();
  try {
    if (!demo) {
      const { auth } = await import("../../../lib/auth.ts");
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session || session.user.role !== "admin") return response({ error: "Admin sign in required." }, 401);
      const podId = session.user.podId;
      const state = await clinic.read();
      if (!podId || !state.pods.some((pod: { id: string }) => pod.id === podId)) return response({ error: "An admin pod assignment is required." }, 403);
      const reportStaff = request.nextUrl.searchParams.get("reportStaff");
      const month = request.nextUrl.searchParams.get("month");
      if (reportStaff && month) {
        if (!state.therapists.some((staff: { id: string; pod: string }) => staff.id === reportStaff && staff.pod === podId)) return response({ error: "Staff report is outside your pod." }, 403);
        return response(await clinic.report(reportStaff, month));
      }
      return response(podView(withConflicts(state), podId));
    }
    const reportStaff = request.nextUrl.searchParams.get("reportStaff");
    const month = request.nextUrl.searchParams.get("month");
    return response(reportStaff && month ? await clinic.report(reportStaff, month) : withConflicts(await clinic.read()));
  } catch (caught) {
    if (demo) return error(caught);
    console.error("Clinic read failed", caught);
    return response({ error: "Unable to load clinic data." }, 500); } finally { await clinic.close(); }
}

export async function POST(request: NextRequest) {
  const { demo, refusal } = demoModeGate();
  if (refusal) return refusal;
  let clinic: InstanceType<typeof PostgresClinicStore> | undefined;
  let podId: string | null = null;
  let setupChange: any;
  try {
    const body = await request.json();
    if (demo) clinic = store();
    else {
      const { auth } = await import("../../../lib/auth.ts");
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session || session.user.role !== "admin") return response({ error: "Admin sign in required." }, 401);
      podId = session.user.podId ?? null;
      if (!podId) return response({ error: "An admin pod assignment is required." }, 403);
      clinic = new PostgresClinicStore(undefined, { id: session.user.id, podId });
      try {
        const current = await clinic.read();
        authorizeClinicAction(current, podId, body);
        if (body.action === "setup") setupChange = mergePodSetup(current, podId, body.setup);
      }
      catch (caught) {
        if (!isClinicRuleError(caught)) return await actionFailure(caught, podId, clinic);
        // Authorization and Setup-scope messages are static text with no clinic data.
        return response({ error: (caught as Error).message || "This action is outside your assigned pod." }, 403);
      }
    }
    // No caller-supplied role, person id, pod identity, or state snapshot is authority.
    const actionResponse = async (pending: Promise<any>) => {
      const value = await pending;
      return response(podId ? { state: podView(withConflicts(value.state), podId) } : value);
    };
    if (body.action === "preview") return response(await clinic.preview(requestFrom(body)));
    if (body.action === "commit") return await actionResponse(clinic.commit(requestFrom(body), Number(body.revision)));
    if (body.action === "setup") return await actionResponse(clinic.updateSetup(demo ? body.setup : setupChange, Number(body.revision)));
    if (body.action === "record-leave") return await actionResponse(clinic.recordLeave(body.leave || {}, Number(body.revision)));
    if (body.action === "amend-leave") return await actionResponse(clinic.amendLeave(String(body.pod || ""), String(body.leaveId || ""), body.leave || {}, Number(body.revision)));
    if (body.action === "withdraw-leave") return await actionResponse(clinic.withdrawLeave(String(body.pod || ""), String(body.leaveId || ""), Number(body.revision)));
    if (body.action === "begin-draft") return await actionResponse(clinic.beginDraft(String(body.pod || ""), Number(body.revision)));
    if (body.action === "discard-draft") return await actionResponse(clinic.discardDraft(String(body.pod || ""), Number(body.revision)));
    if (body.action === "preview-auto-resolve") return await actionResponse(clinic.previewAutoResolve(String(body.pod || ""), Number(body.revision)));
    if (body.action === "apply-auto-resolve") return await actionResponse(clinic.applyAutoResolve(String(body.pod || ""), Number(body.revision)));
    if (body.action === "discard-auto-resolve") return await actionResponse(clinic.discardAutoResolve(String(body.pod || ""), Number(body.revision)));
    if (body.action === "stage-draft") return await actionResponse(clinic.stageDraftChange(String(body.pod || ""), body.change || {}, Number(body.revision)));
    if (body.action === "stage-draft-add") return await actionResponse(clinic.stageDraftAdd(String(body.pod || ""), requestFrom(body), Number(body.revision)));
    if (body.action === "remove-draft-change") return await actionResponse(clinic.removeDraftChange(String(body.pod || ""), String(body.sessionId || ""), Number(body.revision)));
    if (body.action === "commit-draft") return await actionResponse(clinic.commitDraft(String(body.pod || ""), Number(body.revision)));
    if (body.action === "handle-notification") return await actionResponse(clinic.handleNotification(String(body.pod || ""), String(body.taskId || ""), Number(body.revision)));
    return response({ error: "Unknown action." }, 400);
  } catch (caught) { return demo ? error(caught) : await actionFailure(caught, podId, clinic); }
  finally { await clinic?.close(); }
}

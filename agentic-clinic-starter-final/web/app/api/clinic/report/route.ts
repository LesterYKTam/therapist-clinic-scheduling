import type { NextRequest } from "next/server";
// @ts-expect-error JavaScript store is exercised directly by the Node integration suite.
import { PostgresClinicStore } from "../../../../lib/clinic-store.mjs";
// @ts-expect-error Response helper is exercised directly by the Node integration suite.
import { reportPdfResponse } from "../../../../lib/report-response.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const demo = process.env.CLINIC_DEMO_MODE === "1";
  let podId: string | null = null;
  if (!demo) {
    const { auth } = await import("../../../../lib/auth.ts");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || session.user.role !== "admin") return Response.json({ error: "Admin sign in required." }, { status: 401 });
    podId = session.user.podId ?? null;
    if (!podId) return Response.json({ error: "An admin pod assignment is required." }, { status: 403 });
  }
  const staff = request.nextUrl.searchParams.get("staff");
  const month = request.nextUrl.searchParams.get("month");
  if (!staff || !month) return Response.json({ error: "Staff and month are required." }, { status: 400 });
  const clinic = new PostgresClinicStore();
  try {
    if (podId) {
      const state = await clinic.read();
      if (!state.therapists.some((person: { id: string; pod: string }) => person.id === staff && person.pod === podId)) return Response.json({ error: "Staff report is outside your assigned pod." }, { status: 403 });
    }
    return await reportPdfResponse(clinic, staff, month);
  } catch (caught) {
    return Response.json({ error: demo && caught instanceof Error ? caught.message : "Unable to generate report." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  } finally { await clinic.close(); }
}

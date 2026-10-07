// @ts-expect-error JavaScript store is covered by isolated PostgreSQL tests.
import { PostgresClinicStore } from "../../../../lib/clinic-store.mjs";

// @ts-expect-error JavaScript helper is covered by the isolated PostgreSQL suite.
import { isPublicDemo, publicDemoRefusal } from "../../../../lib/public-demo.mjs";

export async function POST(request: Request) {
  if (isPublicDemo()) return publicDemoRefusal();
  const { auth, authPool } = await import("../../../../lib/auth.ts");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return Response.json({ error: "Admin sign in required." }, { status: 401 });
  let body: { userId?: unknown; podId?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const podId = body.podId === null ? null : typeof body.podId === "string" ? body.podId : "";
  if (!userId || podId === "") return Response.json({ error: "Choose an admin and pod." }, { status: 400 });
  const clinic = new PostgresClinicStore();
  try {
    const state = await clinic.read();
    if (podId !== null && !state.pods.some((pod: { id: string }) => pod.id === podId)) return Response.json({ error: "Choose a valid pod." }, { status: 400 });
    const result = await authPool.query('UPDATE "user" SET "podId"=$1, "updatedAt"=now() WHERE id=$2 AND role=$3 RETURNING id', [podId, userId, "admin"]);
    if (!result.rowCount) return Response.json({ error: "Admin account not found." }, { status: 404 });
    return Response.json({ userId, podId }, { headers: { "Cache-Control": "no-store" } });
  } finally { await clinic.close(); }
}

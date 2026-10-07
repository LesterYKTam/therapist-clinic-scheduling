// @ts-expect-error JavaScript module is covered by the isolated PostgreSQL suite.
import { resetGate, resetPublicDemo } from "../../../../lib/public-demo-reset.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const noStore = { "Cache-Control": "no-store" };

// Vercel Cron calls GET with "Authorization: Bearer <CRON_SECRET>". Inert (404) unless PUBLIC_DEMO=1 and CRON_SECRET are set.
export async function GET(request: Request) {
  const gate = resetGate(request.headers.get("authorization"));
  if (gate.status === "inactive") return new Response("Not found", { status: 404 });
  if (gate.status === "unauthorized") return Response.json({ error: "Unauthorized." }, { status: 401, headers: { ...noStore, "WWW-Authenticate": "Bearer" } });
  if (gate.status === "misconfigured") return Response.json({ error: gate.message }, { status: 500, headers: noStore });
  try {
    const { auth } = await import("../../../../lib/auth.ts");
    const context = await auth.$context;
    const summary = await resetPublicDemo({ password: process.env.DEMO_ADMIN_PASSWORD, hashPassword: context.password.hash });
    return Response.json(summary, { headers: noStore });
  } catch (error) {
    console.error("Public demo reset failed", error);
    return Response.json({ error: "Demo reset failed. Check the function logs." }, { status: 500, headers: noStore });
  }
}

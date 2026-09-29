import ClinicClient from "./clinic-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
// @ts-expect-error JavaScript store is exercised directly by the Node integration suite.
import { PostgresClinicStore } from "../lib/clinic-store.mjs";
// @ts-expect-error JavaScript scheduling policy is covered by the Node integration suite.
import { withConflicts } from "../lib/scheduling.mjs";
// @ts-expect-error The pod projection is covered by the Node access suite.
import { podView } from "../lib/pod-view.mjs";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (process.env.CLINIC_DEMO_MODE !== "1") {
    const { auth } = await import("../lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (session.user.role !== "admin") return <main><h1>Admin access required</h1></main>;
    const clinic = new PostgresClinicStore();
    try {
      const state = await clinic.read();
      const podId = session.user.podId;
      if (!podId || !state.pods.some((pod: { id: string }) => pod.id === podId)) return <main><h1>Pod assignment required</h1><p>An admin must assign your pod before you can access scheduling.</p><a href="/config/admins">Open admin configuration</a></main>;
      return <ClinicClient initial={podView(withConflicts(state), podId)} authenticated />;
    } finally { await clinic.close(); }
  }
  const clinic = new PostgresClinicStore();
  try { return <ClinicClient initial={withConflicts(await clinic.read())} />; }
  finally { await clinic.close(); }
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminConfigClient from "./admin-config-client";
// @ts-expect-error JavaScript store is covered by isolated PostgreSQL tests.
import { PostgresClinicStore } from "../../../lib/clinic-store.mjs";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const { auth, authPool } = await import("../../../lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (session.user.role !== "admin") return <main><h1>Admin access required</h1></main>;
  const clinic = new PostgresClinicStore();
  try {
    const state = await clinic.read();
    const users = await authPool.query('SELECT id, name, email, "podId" FROM "user" WHERE role=$1 ORDER BY name, email', ["admin"]);
    return <AdminConfigClient pods={state.pods.map((pod: {id:string;name:string}) => ({ id: pod.id, name: pod.name }))} admins={users.rows} />;
  } finally { await clinic.close(); }
}

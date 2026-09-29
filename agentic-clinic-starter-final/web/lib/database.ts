import { Pool } from "pg";
import { Socket } from "node:net";

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

async function databaseSocketIsReachable(connectionString: string): Promise<boolean> {
  const url = new URL(connectionString);
  const socket = new Socket();
  const port = Number(url.port || 5432);

  return new Promise((resolve) => {
    const finish = (reachable: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(750);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
    socket.connect(port, url.hostname);
  });
}

export async function databaseHealth(): Promise<{ ok: boolean; message: string }> {
  const connectionString = databaseUrl();
  if (!(await databaseSocketIsReachable(connectionString))) {
    return { ok: false, message: "PostgreSQL is unavailable. Run npm run infra:up and retry." };
  }

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 2_000,
    query_timeout: 2_000,
    statement_timeout: 2_000,
  });
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Database health probe timed out.")), 2_000);
  });
  try {
    const result = await Promise.race([
      pool.query<{ current_database: string }>("SELECT current_database()"),
      timeout,
    ]);
    return { ok: true, message: `Connected to local PostgreSQL (${result.rows[0].current_database}).` };
  } catch {
    return { ok: false, message: "PostgreSQL is unavailable. Run npm run infra:up and retry." };
  } finally {
    void pool.end().catch(() => undefined);
  }
}

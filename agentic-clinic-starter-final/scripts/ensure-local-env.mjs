import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readEnvironment(path) {
  const values = new Map();
  if (!existsSync(path)) return values;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

function ensureEnvironment(fileName, environment, port) {
  const path = resolve(root, ".local", fileName);
  const values = readEnvironment(path);
  const username = `clinic_${environment}`;
  const database = `clinic_${environment}`;
  const password = values.get("POSTGRES_PASSWORD") || randomBytes(32).toString("base64url");
  const required = new Map([
    ["APP_URL", "http://localhost:3000"],
    ["BETTER_AUTH_URL", "http://localhost:3000"],
    ["BETTER_AUTH_SECRET", randomBytes(32).toString("base64url")],
    ["CLINIC_DEMO_MODE", "1"],
    ["POSTGRES_USER", username],
    ["POSTGRES_PASSWORD", password],
    ["POSTGRES_DB", database],
    ["DATABASE_URL", `postgresql://${username}:${password}@localhost:${port}/${database}`],
  ]);

  for (const [key, value] of required) {
    if (!values.get(key)) values.set(key, value);
  }

  const content = [...values].map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
  writeFileSync(path, content, { encoding: "utf8", mode: 0o600 });
}

ensureEnvironment("dev.env", "dev", 5432);
ensureEnvironment("test.env", "test", 5433);

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const command = process.platform === "win32" ? "npm.cmd" : "npm";

for (const environment of ["dev", "test"]) {
  const file = resolve(root, ".local", `${environment}.env`);
  const url = readFileSync(file, "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  if (!url || !url.includes(`clinic_${environment}`) || !url.includes(`localhost:${environment === "dev" ? "5432" : "5433"}`)) {
    throw new Error(`${environment}.env must point at its dedicated local database.`);
  }
}

const result = spawnSync(command, ["--prefix", "web", "run", "test"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);

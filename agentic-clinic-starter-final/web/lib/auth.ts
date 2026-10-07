import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

// Authentication data is separate from the scheduling snapshot. Pod membership
// is server-owned and must be read again for each authorized clinic request.
// Serverless (Vercel) instances each hold their own pool, so keep it tiny there; Neon should be reached through its pooled host.
export const authPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || (process.env.VERCEL ? 2 : 10),
  idleTimeoutMillis: process.env.VERCEL ? 10_000 : 30_000,
});

// BETTER_AUTH_URL (the public site URL) is read by Better Auth itself; APP_URL is accepted as an extra trusted origin.
const trustedOrigins = [process.env.BETTER_AUTH_URL, process.env.APP_URL].filter((value): value is string => Boolean(value));

export const auth = betterAuth({
  database: authPool,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      podId: { type: "string", required: false, input: false },
    },
  },
  plugins: [admin()],
});

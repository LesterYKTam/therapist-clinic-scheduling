import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

// Authentication data is separate from the scheduling snapshot. Pod membership
// is server-owned and must be read again for each authorized clinic request.
export const authPool = new Pool({ connectionString: process.env.DATABASE_URL });

export const auth = betterAuth({
  database: authPool,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      podId: { type: "string", required: false, input: false },
    },
  },
  plugins: [admin()],
});

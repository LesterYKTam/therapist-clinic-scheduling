import { toNextJsHandler } from "better-auth/next-js";
// @ts-expect-error JavaScript helper is covered by the isolated PostgreSQL suite.
import { isPublicDemo, isAuthRequestAllowedInPublicDemo, publicDemoRefusal } from "../../../../lib/public-demo.mjs";

async function handle(request: Request) {
  // Public demo: allowlist (sign-in, sign-out, get-session). Anything else, including every account-management and admin-plugin endpoint, is refused before Better Auth runs.
  if (isPublicDemo() && !isAuthRequestAllowedInPublicDemo(request.method, new URL(request.url).pathname)) return publicDemoRefusal();
  const { auth } = await import("../../../../lib/auth.ts");
  const handlers = toNextJsHandler(auth);
  return request.method === "POST" ? handlers.POST(request) : handlers.GET(request);
}

export { handle as GET, handle as POST };

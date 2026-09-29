import { toNextJsHandler } from "better-auth/next-js";

async function handle(request: Request) {
  const { auth } = await import("../../../../lib/auth");
  const handlers = toNextJsHandler(auth);
  return request.method === "POST" ? handlers.POST(request) : handlers.GET(request);
}

export { handle as GET, handle as POST };

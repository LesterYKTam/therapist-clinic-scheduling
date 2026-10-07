/** Single source of truth for PUBLIC_DEMO=1: the hardened, internet-facing synthetic demo. Unlike CLINIC_DEMO_MODE it never bypasses sign-in. */
export const PUBLIC_DEMO_BANNER = 'Public demo · synthetic data only · resets nightly';
export const PUBLIC_DEMO_BLOCKED_MESSAGE = 'This is a public demo. Account changes are disabled; the demo resets nightly.';
export const DEMO_ADMINS = [
  { email: 'maple@demo.clinic', name: 'Maple Demo Admin', podId: 'a' },
  { email: 'cedar@demo.clinic', name: 'Cedar Demo Admin', podId: 'b' },
];

export function isPublicDemo(env = process.env) {
  return env.PUBLIC_DEMO === '1';
}

/** The only Better Auth endpoints reachable in a public demo. Everything else (password, email, name, delete, reset, all admin-plugin endpoints) is refused. */
const ALLOWED_AUTH = new Map([
  ['/sign-in/email', ['POST']],
  ['/sign-out', ['POST']],
  ['/get-session', ['GET', 'POST']],
  ['/ok', ['GET']],
]);

/** Pathname below /api/auth (e.g. "/sign-in/email"), normalised: no trailing slash, lower case. */
export function authSubPath(pathname) {
  const sub = pathname.replace(/^\/api\/auth/i, '').replace(/\/+$/, '');
  return (sub || '/').toLowerCase();
}

export function isAuthRequestAllowedInPublicDemo(method, pathname) {
  const methods = ALLOWED_AUTH.get(authSubPath(pathname));
  return Boolean(methods && methods.includes(method.toUpperCase()));
}

export function publicDemoRefusal() {
  return Response.json({ error: PUBLIC_DEMO_BLOCKED_MESSAGE, code: 'PUBLIC_DEMO_READ_ONLY' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}

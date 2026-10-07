/** Single source of truth for CLINIC_DEMO_MODE. Demo mode bypasses sign-in, so it must never run in a production build. */
export const DEMO_MODE_PRODUCTION_MESSAGE = 'Demo mode is not allowed in a production build or the public demo. Remove CLINIC_DEMO_MODE and configure sign-in.';

export function demoModeStatus(env = process.env) {
  const requested = env.CLINIC_DEMO_MODE === '1';
  if (!requested) return 'off';
  if (env.PUBLIC_DEMO === '1') return 'forbidden'; // The public demo always wins: never bypass sign-in.
  return env.NODE_ENV === 'production' ? 'forbidden' : 'on';
}

/** True only when the flag is set and this is not a production build. Throws on the production misconfiguration. */
export function isDemoMode(env = process.env) {
  const status = demoModeStatus(env);
  if (status === 'forbidden') throw new Error(DEMO_MODE_PRODUCTION_MESSAGE);
  return status === 'on';
}

/** Route helper: { demo } normally; { refusal } (a 503 Response carrying no clinic data) when demo mode is set in production. */
export function demoModeGate(env = process.env) {
  if (demoModeStatus(env) === 'forbidden') {
    return { demo: false, refusal: Response.json({ error: DEMO_MODE_PRODUCTION_MESSAGE }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) };
  }
  return { demo: demoModeStatus(env) === 'on', refusal: null };
}

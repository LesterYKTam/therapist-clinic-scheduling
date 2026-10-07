/** Technical guardrail for JSON request bodies (applies in all modes). Far above any real clinic payload. */
export const MAX_BODY_BYTES = 512 * 1024;
export const BODY_TOO_LARGE_MESSAGE = 'Request is too large (limit 512 KB).';

export class BodyTooLargeError extends Error {
  constructor() { super(BODY_TOO_LARGE_MESSAGE); this.name = 'BodyTooLargeError'; }
}

/** Reads and parses a JSON body, enforcing the limit on the declared Content-Length and again while streaming (the header can lie or be missing). */
export async function readJsonLimited(request, maxBytes = MAX_BODY_BYTES) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) return JSON.parse('');
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { try { await reader.cancel(); } catch {} throw new BodyTooLargeError(); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Long "Prefix: item; item; item" messages (e.g. every booking blocking a Setup
// change) are cut to a few lines; the full text stays available.
export type FailureSummary = { lead: string; items: string[]; more: number; full: string[] };

export function summarizeFailure(message: string, limit = 5): FailureSummary {
  const at = message.indexOf(": ");
  const parts = at > 0 ? message.slice(at + 2).split("; ") : [];
  if (parts.length <= limit) return { lead: message, items: [], more: 0, full: [] };
  return {
    lead: message.slice(0, at + 1),
    items: parts.slice(0, limit),
    more: parts.length - limit,
    full: parts,
  };
}

// Tiny shared helper used by admin endpoints to produce a clean from/to map
// of changed fields, ready to drop into ActivityLog.meta.changes.

type Row = Record<string, unknown>;
type Decimalish = { toNumber: () => number };

function normalize(v: unknown): unknown {
  if (v && typeof v === "object" && "toNumber" in v) {
    return (v as Decimalish).toNumber();
  }
  return v;
}

export function diffFields<T extends Row>(
  before: T | null | undefined,
  after: T | null | undefined,
  fields: readonly (keyof T)[],
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (!before || !after) return changes;
  for (const f of fields) {
    const a = normalize(before[f]);
    const b = normalize(after[f]);
    if (a !== b) changes[String(f)] = { from: a, to: b };
  }
  return changes;
}

import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

type LogInput = {
  action: string;        // "created", "updated", "deleted", "approved", "status-changed"
  moduleKey: string;     // "product", "order", "expense", "user", "trade-request" …
  target?: string;       // human-readable name of the affected entity
  targetId?: string;
  meta?: Record<string, unknown>;
};

/**
 * Records an admin/staff/manager action. Customers (USER role) are skipped so
 * the activity log only tracks back-office actions.
 *
 * Failures are swallowed — logging must never break the action it's tracking.
 */
export async function logActivity(
  session: Session | null | undefined,
  input: LogInput,
): Promise<void> {
  try {
    const u = session?.user;
    if (!u?.id) return;
    if (u.role === "USER") return; // skip customer-side activity per requirements
    await prisma.activityLog.create({
      data: {
        userId: u.id,
        userName: u.name ?? u.email ?? "Unknown",
        userEmail: u.email ?? "",
        userRole: u.role ?? "USER",
        action: input.action,
        moduleKey: input.moduleKey,
        target: input.target ?? null,
        targetId: input.targetId ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("activity log failed:", e);
  }
}

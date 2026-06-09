import { auth } from "@/auth";
import { canAccessModule, type ModuleKey } from "@/lib/permissions";

/** Returns the current session if it can access the given report
 *  permission, else null. ADMIN always passes; STAFF/MANAGER need the
 *  module key in their persisted permissions list. Use at the top of
 *  every report page + export route handler. */
export async function requireReportAccess(key: ModuleKey) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = session.user.role as string | undefined;
  const perms = session.user.permissions as string[] | undefined;
  if (!canAccessModule(role, perms, key)) return null;
  return session;
}

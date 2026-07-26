import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/app/account/profile/form";

// Admin profile / account settings. Access is already gated by the /admin
// layout (ADMIN | MANAGER | STAFF only). Reuses the same ProfileForm the
// customer account uses — it PATCHes /api/account/profile for any signed-in
// user — so name / contact / password edits work here too, rendered inside
// the admin shell instead of the storefront account portal.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, email: true, phone: true,
      address: true, addressLine2: true, city: true, county: true, postcode: true, country: true,
    },
  });
  if (!user) return null;

  const roleLabel = session.user.role
    ? session.user.role.charAt(0) + session.user.role.slice(1).toLowerCase()
    : "Staff";

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin · Settings</div>
          <h1 className="font-bold">Account settings</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.name || user.email} · {roleLabel}
          </p>
        </div>
      </div>

      <ProfileForm initial={user} />
    </div>
  );
}

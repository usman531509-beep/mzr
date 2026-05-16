import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/app/account/profile/form";

// Per-request render — pulls the current user's stored profile fields.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, address: true, city: true, country: true },
  });
  if (!user) return null;
  return <ProfileForm initial={user} />;
}

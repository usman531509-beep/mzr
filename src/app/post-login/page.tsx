import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Tiny server-only router that reads the freshly-created session and sends
// the user to the right place: admins → admin panel, customers → wherever they
// came from (or the home page).

export default async function PostLogin({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "ADMIN") redirect("/admin");

  // Everyone else lands on their account portal. A safe internal callback
  // URL still wins so deep links (e.g. /checkout) keep working.
  const target = typeof to === "string" && to.startsWith("/") ? to : "/account";
  redirect(target);
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountShell } from "@/components/account/AccountShell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?from=/account");
  // Admins manage everything from /admin — they don't need a customer account view.
  if (session.user.role === "ADMIN") redirect("/admin");
  return (
    <AccountShell user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AccountShell>
  );
}

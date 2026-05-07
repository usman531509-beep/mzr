import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "MANAGER" && role !== "STAFF")) {
    redirect("/login?from=/admin");
  }
  return (
    <AdminShell
      user={{ name: session.user.name, email: session.user.email }}
      role={role}
      permissions={session.user.permissions ?? []}
    >
      {children}
    </AdminShell>
  );
}

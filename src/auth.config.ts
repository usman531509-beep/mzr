import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe config (no Node-only deps). Used by middleware AND by the full
// runtime in auth.ts. The jwt + session callbacks live here on purpose so
// middleware can read `auth.user.role` — without them, the middleware sees
// no role and bounces admins to /login.

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // real providers added in auth.ts (Node runtime)
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAdmin =
        pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
      const isAccount =
        pathname === "/account" || pathname.startsWith("/account/");
      if (isAdmin) {
        const role = auth?.user?.role;
        return !!auth && (role === "ADMIN" || role === "MANAGER" || role === "STAFF");
      }
      if (isAccount) return !!auth;
      return true;
    },
    jwt({ token, user, trigger, session }) {
      // On sign-in, copy id + role + mustChangePassword from the User object
      // onto the JWT. On `update()` from the client (after the user sets a
      // new password), refresh the flag from the passed session.
      if (user) {
        (token as { id?: string }).id = (user as { id?: string }).id;
        (token as { role?: Role }).role = (user as { role?: Role }).role;
        (token as { mustChangePassword?: boolean }).mustChangePassword =
          (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
        (token as { permissions?: string[] }).permissions =
          (user as { permissions?: string[] }).permissions ?? [];
      }
      if (trigger === "update" && session?.user) {
        if (typeof session.user.mustChangePassword === "boolean") {
          (token as { mustChangePassword?: boolean }).mustChangePassword =
            session.user.mustChangePassword;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token as { id?: string }).id ?? "";
        session.user.role = (token as { role?: Role }).role ?? "USER";
        session.user.mustChangePassword =
          (token as { mustChangePassword?: boolean }).mustChangePassword ?? false;
        session.user.permissions =
          (token as { permissions?: string[] }).permissions ?? [];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

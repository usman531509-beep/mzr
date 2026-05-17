import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { runMigration, MIGRATIONS, type MigrationName } from "@/lib/migrations";

export const dynamic = "force-dynamic";

// Bump the function timeout as high as the hosting plan allows. Larger
// datasets should prefer the CLI scripts under /scripts.
export const maxDuration = 60;

// Both GET and POST trigger the migration so admins can simply paste the
// URL into the browser address bar. Auth is enforced via the session cookie
// (same one the admin panel uses), so non-admins get 403.
//
//   /api/admin/migrations/renumber-orders-pos
//   /api/admin/migrations/backfill-order-numbers
//   /api/admin/migrations/backfill-stock-layers
//
// Side effect via GET is unusual REST-wise but harmless here — every
// migration is idempotent, and the endpoint is admin-only.

async function handle(name: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const isKnown = MIGRATIONS.some((m) => m.name === name);
  if (!isKnown) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown migration: ${name}`,
        available: MIGRATIONS.map((m) => m.name),
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  try {
    const result = await runMigration(prisma, name as MigrationName);
    const durationMs = Date.now() - startedAt;

    await logActivity(session, {
      action: "migration-run",
      moduleKey: "migrations",
      target: name,
      meta: { stats: result.stats, durationMs },
    });

    return NextResponse.json({
      ok: true,
      name,
      durationMs,
      stats: result.stats,
      log: result.log,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Migration failed";
    await logActivity(session, {
      action: "migration-failed",
      moduleKey: "migrations",
      target: name,
      meta: { error: msg, durationMs: Date.now() - startedAt },
    });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  return handle(name);
}

export async function POST(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  return handle(name);
}

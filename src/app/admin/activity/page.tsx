import { prisma } from "@/lib/prisma";
import { Activity as ActivityIcon } from "lucide-react";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Pagination } from "@/components/Pagination";
import { parsePagination } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;


const ROLE_DOT: Record<string, string> = {
  ADMIN:   "bg-red ring-red/15",
  MANAGER: "bg-indigo-500 ring-indigo-500/15",
  STAFF:   "bg-blue-500 ring-blue-500/15",
};

// Role → reference .st pill variant (matches the users table).
const ROLE_ST: Record<string, string> = {
  ADMIN:   "bad",
  MANAGER: "info",
  STAFF:   "info",
};

const FIELD_LABEL: Record<string, string> = {
  stock: "stock",
  lowStockThreshold: "low-stock threshold",
  status: "status",
  role: "role",
  active: "active",
  percent: "discount %",
  name: "name",
  description: "description",
  price: "retail price",
  costPrice: "cost price",
  sku: "SKU",
  oemNumber: "OEM",
  featured: "featured",
  brand: "brand",
  category: "category",
  images: "images",
  compatibilities: "fitments",
  // expense
  title: "title",
  amount: "amount",
  paidOn: "paid on",
  vendor: "vendor",
  paymentMethod: "payment method",
  notes: "notes",
  // user
  email: "email",
  phone: "phone",
  address: "address",
  city: "city",
  country: "country",
  password: "password",
  // bike-model
  yearStart: "year start",
  yearEnd: "year end",
};

// Module key → human label, used by the filter dropdown and the inline badge
// on each timeline row. Independent of ADMIN_MODULES so we can show modules
// like "category", "brand", "bike-model" that don't have their own sidebar
// entries (yet) but still appear in the activity log.
const MODULE_LOG_LABEL: Record<string, string> = {
  product: "Product",
  stock: "Stock",
  category: "Category",
  brand: "Brand",
  "bike-model": "Bike model",
  order: "Order",
  expense: "Expense",
  user: "User",
  "trade-request": "Trade request",
  "trade-discount": "Trade discount",
};

function shortValue(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 37) + "…" : s;
}

function ChangeSummary({ meta }: { meta: unknown }) {
  if (!meta || typeof meta !== "object") return null;
  const changes = (meta as { changes?: Record<string, { from?: unknown; to?: unknown }> }).changes;
  if (!changes) return null;
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;
  return (
    <span className="ml-2 text-[12px] text-muted-foreground">
      {entries.map(([field, c], i) => {
        const label = FIELD_LABEL[field] ?? field;
        return (
          <span key={field}>
            {i > 0 && <span className="px-1">·</span>}
            <span className="opacity-70">{label}: </span>
            <span className="font-mono text-rose-700/80">{shortValue(c?.from)}</span>
            <span className="px-1 opacity-50">→</span>
            <span className="font-mono text-emerald-700">{shortValue(c?.to)}</span>
          </span>
        );
      })}
    </span>
  );
}

const ACTION_LABEL: Record<string, string> = {
  "created": "created",
  "updated": "updated",
  "deleted": "deleted",
  "approved": "approved",
  "rejected": "rejected",
  "activated": "activated",
  "deactivated": "deactivated",
  "status-changed": "changed status of",
  "stock-updated": "updated stock of",
  "permissions-updated": "updated permissions for",
  "password-reset": "reset password for",
  "role-changed": "changed role of",
  "discount-set": "set trade discount for",
  "discount-removed": "removed trade discount for",
};

export default async function ActivityPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const moduleKey = typeof sp.module === "string" ? sp.module : "";
  const role = typeof sp.role === "string" ? sp.role : "";

  const where: Prisma.ActivityLogWhereInput = {
    // Customers (USER role) are filtered out at write-time, but belt-and-braces here.
    NOT: { userRole: "USER" },
  };
  if (q) {
    where.OR = [
      { userName:  { contains: q, mode: "insensitive" } },
      { userEmail: { contains: q, mode: "insensitive" } },
      { target:    { contains: q, mode: "insensitive" } },
      { action:    { contains: q, mode: "insensitive" } },
    ];
  }
  if (moduleKey) where.moduleKey = moduleKey;
  if (role === "ADMIN" || role === "MANAGER" || role === "STAFF") where.userRole = role;

  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 50 });
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin · Audit</div>
          <h1 className="font-bold">Activity log</h1>
          <p className="text-sm text-muted-foreground">
            Back-office activity from admins, managers and staff.
          </p>
        </div>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search user, target, action…"
        filters={[
          {
            param: "role", label: "Role", any: "All roles",
            options: [
              { value: "ADMIN",   label: "Admin" },
              { value: "MANAGER", label: "Manager" },
              { value: "STAFF",   label: "Staff" },
            ],
          },
          {
            param: "module", label: "Module", any: "All modules",
            options: Object.entries(MODULE_LOG_LABEL).map(([value, label]) => ({ value, label })),
          },
        ]}
      />

      {logs.length === 0 ? (
        <div className="panel !mb-0 flex flex-col items-center justify-center gap-2 p-12 text-center text-sm text-muted-foreground">
          <ActivityIcon className="h-6 w-6" />
          <p>No activity recorded for these filters yet.</p>
        </div>
      ) : (
        <div className="table-wrap">
            <ol className="relative">
              {/* Vertical guide line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="relative flex items-start gap-3 border-b border-line px-4 py-2.5 text-sm last:border-b-0 hover:bg-[#fafbfc]"
                >
                  {/* Role-coloured dot, sits on the vertical line; nudge down so
                      it aligns with the first text line when content wraps. */}
                  <span
                    className={`relative z-10 mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${ROLE_DOT[log.userRole] ?? "bg-muted ring-muted/30"}`}
                    aria-hidden
                  />

                  {/* Time */}
                  <span className="hidden w-20 shrink-0 text-[11px] tabular-nums text-muted-foreground sm:block">
                    {new Date(log.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  {/* Date */}
                  <span className="hidden w-24 shrink-0 text-[11px] tabular-nums text-muted-foreground md:block">
                    {new Date(log.createdAt).toLocaleDateString("en-GB")}
                  </span>

                  {/* Activity description; wraps to multiple lines if many fields changed. */}
                  <span className="min-w-0 flex-1">
                    <span className={`st ${ROLE_ST[log.userRole] ?? "muted"} mr-1.5 align-middle`}>
                      {log.userRole}
                    </span>
                    <span className="font-medium">{log.userName}</span>
                    <span className="text-muted-foreground"> {ACTION_LABEL[log.action] ?? log.action} </span>
                    <span className="st muted mx-1 align-middle">
                      {MODULE_LOG_LABEL[log.moduleKey] ?? log.moduleKey}
                    </span>
                    {log.target && <span className="font-medium">{log.target}</span>}
                    <ChangeSummary meta={log.meta} />
                  </span>
                </li>
              ))}
            </ol>
            <Pagination
              total={total}
              pageSize={pageSize}
              currentPage={page}
              className="border-t border-line px-4 py-2"
            />
        </div>
      )}
    </div>
  );
}

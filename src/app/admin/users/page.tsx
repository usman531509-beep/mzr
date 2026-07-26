import Link from "next/link";
import { Phone, Users as UsersIcon, UserCheck, UserX, Briefcase } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { UserCartButton } from "@/components/admin/UserCartButton";
import { UserOrdersButton } from "@/components/admin/UserOrdersButton";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { UserActiveToggle } from "@/components/admin/UserActiveToggle";
import { NewUserButton, EditUserButton } from "@/components/admin/UsersActions";
import { UserPermissionsButton } from "@/components/admin/UserPermissionsButton";
import { Pagination } from "@/components/Pagination";
import { parsePagination } from "@/lib/pagination";
import { auth } from "@/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const trade = typeof sp.trade === "string" ? sp.trade : "";

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role === "USER" || role === "STAFF" || role === "MANAGER" || role === "ADMIN") {
    where.role = role;
  }
  if (trade === "yes") where.tradeApproved = true;
  else if (trade === "no") where.tradeApproved = false;
  const activeFilter = typeof sp.active === "string" ? sp.active : "";
  if (activeFilter === "yes") where.active = true;
  else if (activeFilter === "no") where.active = false;

  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 25 });
  // Stat cards report the *whole* user base, NOT the filtered table — so
  // applying e.g. role=USER doesn't make the "Total" card flip to "only
  // customers". One Promise.all batch keeps the network round-trip count
  // identical to before.
  const [
    users, total, session,
    totalUsers, activeUsers, inactiveUsers, traderUsers,
  ] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        _count: { select: { orders: true } },
        cart: {
          include: { items: { include: { product: true } } },
        },
        // Saved address book — surfaced inside the edit-user dialog so
        // admins can see what addresses the customer has on file.
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
        // Latest trade application (if any). We only show the most recent
        // one in the dialog — older requests live on /admin/trade-requests.
        tradeRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, orderNumber: true, status: true, total: true, createdAt: true,
            createdByAdminId: true,
            customerName: true, customerPhone: true, customerEmail: true,
            shippingAddress: true, shippingCity: true, shippingCountry: true,
            items: {
              select: {
                id: true,
                name: true,
                quantity: true,
                price: true,
                originalPrice: true,
                product: { select: { images: true } },
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
    auth(),
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count({ where: { active: false } }),
    prisma.user.count({ where: { tradeApproved: true } }),
  ]);
  const currentAdminId = session?.user?.id;

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin · People</div>
          <h1 className="font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            All registered customers, staff, managers and admins. Cart contents
            shown inline so you can follow up with customers who haven&apos;t ordered.
          </p>
        </div>
        <NewUserButton />
      </div>

      {/* Top-of-page snapshot of the whole user base. Each card links to
          the corresponding filtered view so the admin can drill in with a
          single click instead of opening the filter dropdowns. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users" className="block transition hover:opacity-90">
          <StatCard
            label="Total users"
            value={totalUsers}
            icon={UsersIcon}
            sub="All registered accounts"
          />
        </Link>
        <Link href="/admin/users?active=yes" className="block transition hover:opacity-90">
          <StatCard
            label="Active"
            value={activeUsers}
            icon={UserCheck}
            accent="success"
            sub={totalUsers > 0
              ? `${Math.round((activeUsers / totalUsers) * 100)}% of users`
              : "—"}
          />
        </Link>
        <Link href="/admin/users?active=no" className="block transition hover:opacity-90">
          <StatCard
            label="Inactive"
            value={inactiveUsers}
            icon={UserX}
            accent={inactiveUsers > 0 ? "warning" : undefined}
            sub={inactiveUsers > 0 ? "Deactivated accounts" : "All accounts active"}
          />
        </Link>
        <Link href="/admin/users?trade=yes" className="block transition hover:opacity-90">
          <StatCard
            label="Trade users"
            value={traderUsers}
            icon={Briefcase}
            accent="primary"
            sub={traderUsers > 0 ? "Approved for wholesale pricing" : "No trade accounts yet"}
          />
        </Link>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search name, email, phone…"
        filters={[
          { param: "role", label: "Role", any: "All roles", options: [
            { value: "USER",    label: "Customers" },
            { value: "STAFF",   label: "Staff" },
            { value: "MANAGER", label: "Managers" },
            { value: "ADMIN",   label: "Admins" },
          ]},
          { param: "trade", label: "Trade", any: "Any trade status", options: [
            { value: "yes", label: "Trade approved" },
            { value: "no",  label: "Not trade" },
          ]},
          { param: "active", label: "Status", any: "Any status", options: [
            { value: "yes", label: "Active" },
            { value: "no",  label: "Inactive" },
          ]},
        ]}
      />

      {users.length === 0 ? (
        <div className="panel !mb-0 p-12 text-center text-sm text-muted-foreground">
          No users yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Cart</th>
                <th className="text-right">Cart total</th>
                <th>Joined</th>
                <th className="text-right">Contact</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const cartItems = u.cart?.items ?? [];
                const itemCount = cartItems.reduce((s, it) => s + it.quantity, 0);
                const cartTotal = cartItems.reduce(
                  (s, it) => s + Number(it.product.price) * it.quantity,
                  0,
                );
                return (
                  <tr key={u.id} className="align-top">
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name ?? "—"}</span>
                        {u.tradeApproved && (
                          <span className="st warn whitespace-nowrap">
                            <Briefcase className="mr-1 inline h-3 w-3 align-[-2px]" /> Trader
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <UserActiveToggle
                        id={u.id}
                        active={u.active}
                        disabled={u.id === currentAdminId}
                      />
                    </td>
                    <td>
                      <UserOrdersButton
                        userName={u.name ?? u.email}
                        orders={u.orders.map((o) => ({
                          id: o.id,
                          orderNumber: o.orderNumber,
                          status: o.status,
                          total: Number(o.total),
                          createdAt: o.createdAt.toISOString(),
                          byAdmin: !!o.createdByAdminId,
                          shipping: [o.customerName, o.shippingAddress, o.shippingCity, o.shippingCountry]
                            .filter(Boolean).join(", "),
                          phone: o.customerPhone,
                          items: o.items.map((i) => ({
                            id: i.id,
                            name: i.name,
                            quantity: i.quantity,
                            price: Number(i.price),
                            originalPrice: Number(i.originalPrice),
                            image: i.product?.images[0] ?? null,
                          })),
                        }))}
                      />
                    </td>
                    <td>
                      <UserCartButton
                        userName={u.name ?? u.email}
                        items={cartItems.map((it) => ({
                          productId: it.productId,
                          name: it.product.name,
                          image: it.product.images[0],
                          price: Number(it.product.price),
                          quantity: it.quantity,
                        }))}
                      />
                    </td>
                    <td className="text-right font-medium">
                      {itemCount === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        `£${cartTotal.toFixed(2)}`
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {u.createdAt.toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      {u.phone ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`tel:${u.phone}`}>
                            <Phone className="mr-1.5 h-3.5 w-3.5" />
                            {u.phone}
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No phone</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <UserPermissionsButton
                          userId={u.id}
                          userName={u.name ?? u.email}
                          role={u.role}
                          permissions={u.permissions}
                        />
                        <EditUserButton
                          isSelf={u.id === currentAdminId}
                          user={{
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            role: u.role,
                            phone: u.phone,
                            address: u.address,
                            addressLine2: u.addressLine2,
                            city: u.city,
                            county: u.county,
                            postcode: u.postcode,
                            country: u.country,
                            active: u.active,
                            tradeApproved: u.tradeApproved,
                            tradeApprovedAt: u.tradeApprovedAt?.toISOString() ?? null,
                            mustChangePassword: u.mustChangePassword,
                            createdAt: u.createdAt.toISOString(),
                            tradeRequest: u.tradeRequests[0]
                              ? {
                                  id: u.tradeRequests[0].id,
                                  status: u.tradeRequests[0].status,
                                  createdAt: u.tradeRequests[0].createdAt.toISOString(),
                                  decidedAt: u.tradeRequests[0].decidedAt?.toISOString() ?? null,
                                  decisionNote: u.tradeRequests[0].decisionNote,
                                  contactName: u.tradeRequests[0].contactName,
                                  email: u.tradeRequests[0].email,
                                  phone: u.tradeRequests[0].phone,
                                  companyName: u.tradeRequests[0].companyName,
                                  companyWebsite: u.tradeRequests[0].companyWebsite,
                                  vatNumber: u.tradeRequests[0].vatNumber,
                                  businessType: u.tradeRequests[0].businessType,
                                  monthlyVolume: u.tradeRequests[0].monthlyVolume,
                                  address: u.tradeRequests[0].address,
                                  addressLine2: u.tradeRequests[0].addressLine2,
                                  city: u.tradeRequests[0].city,
                                  county: u.tradeRequests[0].county,
                                  postcode: u.tradeRequests[0].postcode,
                                  country: u.tradeRequests[0].country,
                                  notes: u.tradeRequests[0].notes,
                                }
                              : null,
                            addresses: u.addresses.map((a) => ({
                              id: a.id,
                              label: a.label,
                              recipientName: a.recipientName,
                              phone: a.phone,
                              line1: a.line1,
                              line2: a.line2,
                              city: a.city,
                              county: a.county,
                              postcode: a.postcode,
                              country: a.country,
                              isDefault: a.isDefault,
                            })),
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            total={total}
            pageSize={pageSize}
            currentPage={page}
            className="border-t border-line px-3 py-2"
          />
        </div>
      )}
    </div>
  );
}

// Role → reference .st pill (users.html): admins red, staff/managers blue
// info, customers grey muted.
function RoleBadge({ role }: { role: "USER" | "STAFF" | "MANAGER" | "ADMIN" }) {
  const variant =
    role === "ADMIN" ? "bad"
    : role === "MANAGER" || role === "STAFF" ? "info"
    : "muted";
  return <span className={`st ${variant}`}>{role}</span>;
}

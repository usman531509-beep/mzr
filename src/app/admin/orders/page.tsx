import { prisma } from "@/lib/prisma";
import { parsePagination } from "@/lib/pagination";
import { OrdersClient } from "./client";

type SP = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export default async function AdminOrders({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 25 });

  const [orders, total, couriers] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                sku: true,
                oemNumber: true,
                brand: { select: { name: true } },
                compatibilities: {
                  take: 3,
                  orderBy: { yearTo: "desc" },
                  select: {
                    yearFrom: true,
                    yearTo: true,
                    bikeModel: { select: { name: true, brand: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
        user: { select: { email: true } },
        createdByAdmin: { select: { name: true, email: true } },
        courier: { select: { id: true, name: true, trackingUrl: true } },
      },
      skip,
      take,
    }),
    prisma.order.count(),
    prisma.courier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, trackingUrl: true },
    }),
  ]);

  return (
    <OrdersClient
      couriers={couriers}
      pagination={{ page, pageSize, total }}
      initial={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        shippingFee: Number(o.shippingFee),
        discount: Number(o.discount),
        customer: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        address: [
          o.shippingAddress,
          o.shippingAddressLine2,
          o.shippingCity,
          o.shippingCounty,
          o.shippingPostcode,
          o.shippingCountry,
        ].filter(Boolean).join(", "),
        shippingAddress:      o.shippingAddress,
        shippingAddressLine2: o.shippingAddressLine2 ?? "",
        shippingCity:         o.shippingCity,
        shippingCounty:       o.shippingCounty ?? "",
        shippingPostcode:     o.shippingPostcode ?? "",
        shippingCountry:      o.shippingCountry,
        notes: o.notes ?? "",
        courierId: o.courierId,
        courierName: o.courier?.name ?? null,
        courierTrackingUrl: o.courier?.trackingUrl ?? null,
        trackingNumber: o.trackingNumber,
        shippedAt: o.shippedAt ? o.shippedAt.toISOString() : null,
        items: o.items.map((i) => ({
          name: i.name,
          qty: i.quantity,
          price: Number(i.price),
          brand: i.product?.brand?.name ?? null,
          sku: i.product?.sku ?? null,
          oem: i.product?.oemNumber ?? null,
          fitments: (i.product?.compatibilities ?? []).map((c) => ({
            brand: c.bikeModel.brand.name,
            model: c.bikeModel.name,
            yearFrom: c.yearFrom,
            yearTo: c.yearTo,
          })),
        })),
        createdAt: o.createdAt.toISOString(),
        createdByAdmin: o.createdByAdmin
          ? (o.createdByAdmin.name ?? o.createdByAdmin.email)
          : null,
        paymentToken: o.paymentToken,
      }))}
    />
  );
}

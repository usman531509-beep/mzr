import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./client";

export default async function AdminOrders() {
  const [orders, couriers] = await Promise.all([
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
                  // The order sheet only renders the top 3 fitments — fetching
                  // more inflates the JOIN result with rows we never display.
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
      take: 100,
    }),
    prisma.courier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, trackingUrl: true },
    }),
  ]);

  return (
    <OrdersClient
      couriers={couriers}
      initial={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        customer: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        address: `${o.shippingAddress}, ${o.shippingCity}, ${o.shippingCountry}`,
        shippingAddress: o.shippingAddress,
        shippingCity: o.shippingCity,
        shippingCountry: o.shippingCountry,
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
      }))}
    />
  );
}

import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./client";

export default async function AdminOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      user: { select: { email: true } },
      createdByAdmin: { select: { name: true, email: true } },
    },
    take: 100,
  });
  return (
    <OrdersClient
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
        items: o.items.map((i) => ({ name: i.name, qty: i.quantity, price: Number(i.price) })),
        createdAt: o.createdAt.toISOString(),
        createdByAdmin: o.createdByAdmin
          ? (o.createdByAdmin.name ?? o.createdByAdmin.email)
          : null,
      }))}
    />
  );
}

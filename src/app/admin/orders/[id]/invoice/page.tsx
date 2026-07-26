import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceView } from "@/components/InvoiceView";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { name: true, email: true, phone: true } },
      createdByAdmin: { select: { name: true, email: true } },
    },
  });
  if (!order) notFound();

  return (
    <div className="bg-white text-black print:bg-white print:text-black">
      <div className="border-b border-gray-200 bg-gray-50 print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3 text-sm">
          <Link href="/admin/orders" className="text-red hover:underline">
            ← Back to orders
          </Link>
          <div className="flex gap-2">
            <PrintButton />
          </div>
        </div>
      </div>
      <InvoiceView
        order={{
          ...order,
          total: order.total.toString(),
          shippingFee: order.shippingFee.toString(),
          discount: order.discount.toString(),
          items: order.items.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price.toString(),
            quantity: it.quantity,
          })),
        }}
      />
    </div>
  );
}

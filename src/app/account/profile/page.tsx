import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/app/account/profile/form";
import { AddressesClient } from "@/components/account/AddressesClient";

// Per-request render — pulls the current user's stored profile fields.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user, addresses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true, email: true, phone: true,
        address: true, addressLine2: true, city: true, county: true, postcode: true, country: true,
      },
    }),
    prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  if (!user) return null;

  return (
    <div>
      <ProfileForm initial={user} />

      <div className="hr" style={{ margin: "28px 0" }} />

      <section>
        <header style={{ marginBottom: 16 }}>
          <h2 className="font-head text-2xl uppercase leading-none tracking-[0.02em]" style={{ margin: 0 }}>
            Saved addresses
          </h2>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
            Save the places you ship to so you don&apos;t have to retype them at
            checkout. Pick a default — that&apos;s the one we pre-select.
          </p>
        </header>

        <AddressesClient
          initial={addresses.map((a) => ({
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
          }))}
        />
      </section>
    </div>
  );
}

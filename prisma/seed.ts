import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Idempotent: only ensures the demo accounts exist. All catalogue data
// (brands, categories, bike models, products) is created via the admin panel.
async function main() {
  const adminPass  = await bcrypt.hash("admin123",  10);
  const userPass   = await bcrypt.hash("user123",   10);
  const traderPass = await bcrypt.hash("trader123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@mzrparts.com" },
    update: {},
    create: {
      email: "admin@mzrparts.com",
      name: "Demo Admin",
      password: adminPass,
      role: "ADMIN",
    },
  });

  const user = await db.user.upsert({
    where: { email: "user@mzrparts.com" },
    update: {},
    create: {
      email: "user@mzrparts.com",
      name: "Demo Customer",
      password: userPass,
      role: "USER",
    },
  });

  const trader = await db.user.upsert({
    where: { email: "trader@mzrparts.com" },
    update: { tradeApproved: true },
    create: {
      email: "trader@mzrparts.com",
      name: "Demo Trader",
      password: traderPass,
      role: "USER",
      tradeApproved: true,
      tradeApprovedAt: new Date(),
    },
  });

  console.log("Seed complete.");
  console.log(`  ADMIN  →  ${admin.email}   /  admin123`);
  console.log(`  USER   →  ${user.email}    /  user123`);
  console.log(`  TRADER →  ${trader.email}  /  trader123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createKnowledge } from "../server/knowledge.js";
import { catalog, knowledge as seedKnowledge } from "../server/catalog.js";
const db = new PrismaClient(),
  knowledge = await createKnowledge("live");
try {
  for (const service of catalog)
    await db.service.upsert({
      where: { id: service.id },
      create: service,
      update: service,
    });
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Set SEED_ADMIN_PASSWORD (12+ characters) before seeding");
  const admin = await db.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || "admin@repairloop.local" },
    create: {
      name: "Studio Admin",
      email: process.env.SEED_ADMIN_EMAIL || "admin@repairloop.local",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
    },
    update: {},
  });
  const existing = await knowledge.list();
  for (const article of seedKnowledge)
    if (!existing.some((r) => r.title === article.title))
      await knowledge.create({ ...article, authorId: admin.id });
  console.log(
    "Catalog, admin (if new), and repair guides seeded. Existing passwords were not changed.",
  );
} finally {
  await db.$disconnect();
  await knowledge.close();
}

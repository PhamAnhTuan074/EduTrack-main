const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SYSTEM_ADMIN_USERNAME || "systemadmin";
  const password = process.env.SYSTEM_ADMIN_PASSWORD || "123456";
  const fullName = process.env.SYSTEM_ADMIN_FULL_NAME || "Quan tri he thong EduTrack";
  const email = process.env.SYSTEM_ADMIN_EMAIL || "systemadmin@edutrack.local";
  const phone = process.env.SYSTEM_ADMIN_PHONE || "0900000000";

  const existingUser = await prisma.user.findFirst({
    where: {
      username,
      role: "SYSTEM_ADMIN",
      organizationId: null
    }
  });

  if (existingUser) {
    console.log(`System admin already exists: ${username}`);
    return;
  }

  await prisma.user.create({
    data: {
      organizationId: null,
      fullName,
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: "SYSTEM_ADMIN",
      email,
      phone
    }
  });

  console.log(`System admin created: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

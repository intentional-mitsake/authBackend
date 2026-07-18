import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const hashedpw = await bcrypt.hash('Admin123!', 10);
    const admin = await prisma.user.create({
        data: {
            username: 'admin',
            email: 'admin@test.com',
            password: hashedpw,
            role: 'ADMIN',
        },
    });
    console.log({ admin });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
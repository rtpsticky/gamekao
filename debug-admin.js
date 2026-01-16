const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admins = await prisma.admin.findMany();
    console.log('Existing Admins:', admins);
}

main().finally(() => prisma.$disconnect());

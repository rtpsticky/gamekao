const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.admin.findUnique({ where: { username: 'admin' } });
    if (admin) {
        const isMatch = await bcrypt.compare('admin123', admin.password);
        console.log('Password "admin123" match:', isMatch);
    } else {
        console.log('Admin not found');
    }
}

main().finally(() => prisma.$disconnect());

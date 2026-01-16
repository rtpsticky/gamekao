const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('admin123', 10);

    try {
        const admin = await prisma.admin.upsert({
            where: { username: 'admin' },
            update: {
                password: password, // Reset password ensuring it matches
            },
            create: {
                username: 'admin',
                password: password,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
            },
        });
        console.log('Admin seeded/updated:', admin);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

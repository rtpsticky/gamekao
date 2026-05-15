import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedUsers() {
    console.log('--- เริ่มการตรวจสอบและลบข้อมูลผู้ใช้ที่ไม่อยู่ในกลุ่ม ---');

    try {
        // 1. ค้นหาผู้ใช้ที่ไม่มีความสัมพันธ์กับกลุ่มใดๆ (GroupMember)
        const orphanedUsers = await prisma.user.findMany({
            where: {
                groups: {
                    none: {}
                }
            },
            select: {
                id: true,
                displayName: true,
                firstName: true,
                lastName: true
            }
        });

        if (orphanedUsers.length === 0) {
            console.log('ไม่พบผู้ใช้ที่ไม่อยู่ในกลุ่ม');
            return;
        }

        console.log(`พบผู้ใช้ที่ไม่อยู่ในกลุ่มทั้งหมด ${orphanedUsers.length} คน:`);
        orphanedUsers.forEach(u => console.log(`- ${u.firstName} ${u.lastName} (${u.id})`));
        console.log('\nกำลังเริ่มลบประวัติการออกกำลังกายและรีเซ็ตคะแนน...');

        for (const user of orphanedUsers) {
            await prisma.$transaction(async (tx) => {
                // ลบรูปภาพหลักฐาน
                const deletedImages = await tx.exerciseImage.deleteMany({
                    where: {
                        exerciseLog: {
                            userId: user.id
                        }
                    }
                });

                // ลบบันทึกการออกกำลังกาย
                const deletedLogs = await tx.exerciseLog.deleteMany({
                    where: {
                        userId: user.id
                    }
                });

                // ลบประวัติคะแนน
                const deletedPoints = await tx.pointHistory.deleteMany({
                    where: {
                        userId: user.id
                    }
                });

                // ลบประวัติการเดินในเกม
                const deletedActions = await tx.gameActionLog.deleteMany({
                    where: {
                        userId: user.id
                    }
                });

                // รีเซ็ตสถานะผู้ใช้
                await tx.user.update({
                    where: { id: user.id },
                    data: {
                        points: 0,
                        currentPosition: 0
                    }
                });

                // รีเซ็ตลูกเต๋า
                await tx.diceInventory.updateMany({
                    where: { userId: user.id },
                    data: {
                        diceCount: 0
                    }
                });

                console.log(`✅ ทำความสะอาดข้อมูลของ ${user.firstName} ${user.lastName} เรียบร้อย (ลบ ${deletedLogs.count} บันทึก)`);
            });
        }

        console.log('\n--- เสร็จสิ้นการทำงาน ---');
    } catch (error) {
        console.error('เกิดข้อผิดพลาดระหว่างการทำงาน:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupOrphanedUsers();

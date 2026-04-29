const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Dice Inventory Recalculation ---');

    // 1. Get all users
    const users = await prisma.user.findMany({
        include: {
            exercises: true,
            gameActions: {
                where: {
                    actionType: 'DICE_ROLL'
                }
            }
        }
    });

    console.log(`Found ${users.length} users to process.`);

    for (const user of users) {
        // 2. Calculate Earned Dice
        // Group exercises by weekNumber and count sessions
        const weekCounts = {};
        user.exercises.forEach(log => {
            const week = log.weekNumber;
            weekCounts[week] = (weekCounts[week] || 0) + 1;
        });

        // Earn 1 dice for each week with at least 3 logs
        let earnedDice = 0;
        Object.values(weekCounts).forEach(count => {
            if (count >= 3) {
                earnedDice += 1;
            }
        });

        // 3. Calculate Spent Dice
        // Each DICE_ROLL action log represents 1 dice spent
        const spentDice = user.gameActions.length;

        // 4. Calculate Net Dice
        const finalDiceCount = Math.max(0, earnedDice - spentDice);

        // 5. Update DiceInventory
        await prisma.diceInventory.upsert({
            where: { userId: user.id },
            update: { diceCount: finalDiceCount },
            create: {
                userId: user.id,
                diceCount: finalDiceCount
            }
        });

        if (earnedDice > 0 || spentDice > 0) {
            console.log(`User: ${user.firstName} ${user.lastName} (${user.lineUserId})`);
            console.log(` - Earned: ${earnedDice} (from ${user.exercises.length} logs)`);
            console.log(` - Spent: ${spentDice}`);
            console.log(` - Current Balance: ${finalDiceCount}`);
            console.log('-----------------------------------');
        }
    }

    console.log('--- Dice Inventory Recalculation Completed ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

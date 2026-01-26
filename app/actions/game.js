"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getUserGameData(lineUserId) {
    if (!lineUserId) return { error: "No Line User ID" };

    try {
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: {
                diceInventory: true,
                groups: {
                    where: { group: { isActive: true } },
                    include: { group: true },
                    orderBy: { group: { createdAt: 'desc' } }, // Priority: Most recently created active group
                    take: 1
                }
            }
        });

        if (!user) {
            return { error: "User not found" };
        }

        if (user.isActive === false) {
            return { error: "ACCOUNT_INACTIVE" };
        }

        // Check if user is in any active group
        if (!user.groups || user.groups.length === 0) {
            return { error: "NO_GROUP" };
        }

        const activeGroup = user.groups[0].group;

        return {
            currentPosition: user.currentPosition || 0,
            diceCount: user.diceInventory?.diceCount || 0,
            displayName: user.displayName,
            profileImageUrl: user.profileImageUrl,
            userId: user.id,
            isActive: user.isActive,
            // Group Info
            group: {
                id: activeGroup.id,
                name: activeGroup.name,
                startDate: activeGroup.startDate,
                endDate: activeGroup.endDate
            }
        };

    } catch (error) {
        console.error("Error fetching user data:", error);
        return { error: "Failed to fetch user data" };
    }
}

export async function saveDiceRoll(lineUserId, steps) {
    if (!lineUserId) return { error: "No Line User ID" };

    try {
        // 1. Get User & Dice
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: { diceInventory: true }
        });

        if (!user) return { error: "User not found" };

        const diceCount = user.diceInventory?.diceCount || 0;
        if (diceCount <= 0) {
            return { error: "No dice left" };
        }

        // 2. Calculate New Position
        // Logic: specific request "Walker" usually means just add. 
        // Logic in frontend was clamping at 48.
        const BOARD_SIZE = 48;
        let newPosition = (user.currentPosition || 1) + steps;
        if (newPosition > BOARD_SIZE) newPosition = BOARD_SIZE;

        // 3. Transaction
        await prisma.$transaction(async (tx) => {
            // Decrement Dice
            await tx.diceInventory.update({
                where: { userId: user.id },
                data: { diceCount: { decrement: 1 } }
            });

            // Update Position and Points (10 points per step moved)
            const pointsEarned = steps * 10;
            await tx.user.update({
                where: { id: user.id },
                data: {
                    currentPosition: newPosition,
                    points: { increment: pointsEarned }
                }
            });

            // Record Point History
            await tx.pointHistory.create({
                data: {
                    userId: user.id,
                    amount: pointsEarned,
                    reason: `Walking ${steps} steps in game`
                }
            });

            // Log Action
            await tx.gameActionLog.create({
                data: {
                    userId: user.id,
                    actionType: "DICE_ROLL",
                    diceResult: steps,
                    fromPosition: user.currentPosition || 0,
                    toPosition: newPosition,
                    description: `Rolled dice: ${steps} steps`
                }
            });
        });

        return { success: true, newPosition };

    } catch (error) {
        console.error("Error saving dice roll:", error);
        return { error: "Failed to save progress" };
    }
}

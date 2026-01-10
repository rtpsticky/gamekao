"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUserGameData(lineUserId) {
    if (!lineUserId) return { error: "No Line User ID" };

    try {
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: { diceInventory: true } // Include dice info
        });

        if (!user) {
            return { error: "User not found" };
        }

        return {
            currentPosition: user.currentPosition || 0, // Default 0 if null, but schema says default 0
            diceCount: user.diceInventory?.diceCount || 0,
            displayName: user.displayName,
            profileImageUrl: user.profileImageUrl,
            userId: user.id // Need internal ID for updates
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

            // Update Position
            await tx.user.update({
                where: { id: user.id },
                data: { currentPosition: newPosition }
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

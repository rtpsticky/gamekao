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
            profileImageUrl: user.profileImageUrl
        };

    } catch (error) {
        console.error("Error fetching user data:", error);
        return { error: "Failed to fetch user data" };
    }
}

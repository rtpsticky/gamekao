"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Ensure default rewards exist (Lazy seeding)
async function ensureRewardsExist() {
    const count = await prisma.reward.count();
    if (count === 0) {
        console.log("Seeding default rewards...");
        await prisma.reward.createMany({
            data: [
                {
                    title: "รางวัลระดับทอง",
                    description: "สำหรับผู้ที่มีคะแนนสูงสุด 10 อันดับแรก",
                    pointCost: 0, // Rank based, free to claim if eligible
                    stock: 10
                },
                {
                    title: "รางวัลระดับเงิน",
                    description: "สำหรับผู้ที่มีคะแนนลำดับที่ 11-50",
                    pointCost: 0,
                    stock: 50
                },
                {
                    title: "รางวัลระดับทองแดง",
                    description: "สำหรับผู้ที่มีคะแนนลำดับที่ 51 ขึ้นไป",
                    pointCost: 0,
                    stock: 100
                }
            ]
        });
    }
}

export async function getLeaderboardData(lineUserId) {
    if (!lineUserId) return { error: "No Line User ID" };

    try {
        const currentUser = await prisma.user.findUnique({
            where: { lineUserId },
            select: { id: true, points: true, displayName: true, profileImageUrl: true }
        });

        if (!currentUser) return { error: "User not found" };

        const allUsers = await prisma.user.findMany({
            select: {
                id: true,
                displayName: true,
                profileImageUrl: true,
                points: true,
            },
            orderBy: { points: 'desc' },
            take: 100 // Limit leaderboard size for performance
        });

        // Calculate rank efficiently
        const leaderboard = allUsers.map((u, index) => ({
            rank: index + 1,
            ...u,
            isMe: u.id === currentUser.id
        }));

        const myRankEntry = leaderboard.find(u => u.id === currentUser.id) || {
            rank: await prisma.user.count({ where: { points: { gt: currentUser.points } } }) + 1,
            ...currentUser,
            isMe: true
        };

        return {
            leaderboard: leaderboard.slice(0, 20), // Return top 20 for display
            myStats: myRankEntry
        };

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return { error: "Failed to fetch leaderboard" };
    }
}

export async function getRewardsData(lineUserId) {
    await ensureRewardsExist(); // Make sure rewards exist

    if (!lineUserId) return { error: "No Line User ID" };

    try {
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: { rewards: true }
        });

        if (!user) return { error: "User not found" };

        // Determine User Rank for unlocking logic
        // Count users with strictly more points to get rank (1-based)
        const rank = await prisma.user.count({
            where: { points: { gt: user.points } }
        }) + 1;

        const rewards = await prisma.reward.findMany({
            orderBy: { title: 'asc' } // Simple ordering, or add a 'tier' field to schema if needed
        });

        // Map rewards to include status based on rank
        // Logic: 
        // Reward 1 (Top Tier): Rank 1-10
        // Reward 2 (Mid Tier): Rank 11-50
        // Reward 3 (Low Tier): Rank 51+

        // We need to identify which reward is which. 
        // Since we don't have a 'tier' field, we'll assume order or title.
        // For robustness, let's sort by STOCK (assuming higher tier = lower stock) or just Title.
        // Let's use string matching or index for now since we just seeded them.

        // Let's refine the logic to be index based for this MVP if titles change.
        // Assuming database returns in creation order or similar if we sort by id/title.
        // Let's assume:
        // Index 0 -> Gold (Rank 1-10)
        // Index 1 -> Silver (Rank 11-50)
        // Index 2 -> Bronze (Rank 51+)

        const hasClaimedAny = user.rewards.some(r => r.isRedeemed || true); // If record exists, they claimed/selected it.
        const claimedRewardId = user.rewards.length > 0 ? user.rewards[0].rewardId : null;

        const mappedRewards = rewards.map((r) => {
            let isUnlockable = false;
            let conditionText = "";

            if (r.title.includes("ทอง")) {
                isUnlockable = rank <= 10;
                conditionText = "สำหรับลำดับที่ 1-10";
            } else if (r.title.includes("เงิน")) {
                isUnlockable = rank >= 11 && rank <= 50;
                conditionText = "สำหรับลำดับที่ 11-50";
            } else {
                isUnlockable = rank >= 51;
                conditionText = "สำหรับลำดับที่ 51 ขึ้นไป";
            }

            return {
                ...r,
                isUnlockable,
                conditionText,
                isClaimed: r.id === claimedRewardId,
                canClaim: !hasClaimedAny && isUnlockable && r.stock > 0
            };
        });

        return {
            rewards: mappedRewards,
            userRank: rank,
            hasClaimedAny
        };

    } catch (error) {
        console.error("Error fetching rewards:", error);
        return { error: "Failed to fetch rewards" };
    }
}

export async function claimReward(lineUserId, rewardId) {
    if (!lineUserId) return { error: "No Line User ID" };

    try {
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: { rewards: true }
        });

        if (!user) return { error: "User not found" };

        if (user.rewards.length > 0) {
            return { error: "You have already claimed a reward." };
        }

        const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
        if (!reward) return { error: "Reward not found" };
        if (reward.stock <= 0) return { error: "Out of stock" };

        // Verify Rank Requirement again
        const rank = await prisma.user.count({
            where: { points: { gt: user.points } }
        }) + 1;

        let isUnlockable = false;
        if (reward.title.includes("ทอง")) isUnlockable = rank <= 10;
        else if (reward.title.includes("เงิน")) isUnlockable = rank >= 11 && rank <= 50;
        else isUnlockable = rank >= 51;

        if (!isUnlockable) {
            return { error: "Rank requirement not met." };
        }

        // Transaction to claim
        await prisma.$transaction(async (tx) => {
            await tx.userReward.create({
                data: {
                    userId: user.id,
                    rewardId: reward.id,
                    isRedeemed: true // Mark as chosen/redeemed immediately
                }
            });

            await tx.reward.update({
                where: { id: rewardId },
                data: { stock: { decrement: 1 } }
            });

            // Log points usage if cost > 0 (currently 0)
            if (reward.pointCost > 0) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { points: { decrement: reward.pointCost } }
                });
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Error claiming reward:", error);
        return { error: "Redemption failed" };
    }
}

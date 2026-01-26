"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

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

// Helper to get active group for a user
async function getUserActiveGroup(userId) {
    const groupMember = await prisma.groupMember.findFirst({
        where: { userId, group: { isActive: true } },
        orderBy: { group: { createdAt: 'desc' } }, // Use most recent group
        include: { group: true }
    });
    return groupMember?.group || null;
}

export async function getLeaderboardData(lineUserId) {
    if (!lineUserId) return { error: "No Line User ID" };

    try {
        const currentUser = await prisma.user.findUnique({
            where: { lineUserId },
            select: { id: true, points: true, displayName: true, profileImageUrl: true, isActive: true }
        });

        if (!currentUser) return { error: "User not found" };
        if (currentUser.isActive === false) return { error: "ACCOUNT_INACTIVE" };

        // Determine scope: Group vs Global
        const activeGroup = await getUserActiveGroup(currentUser.id);

        if (!activeGroup) {
            return { error: "NO_GROUP" };
        }

        const whereCondition = {
            isActive: true, // Only active users show on leaderboard
            groups: {
                some: { groupId: activeGroup.id }
            }
        };

        const allUsers = await prisma.user.findMany({
            where: whereCondition,
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

        let myRankEntry = leaderboard.find(u => u.id === currentUser.id);

        // If user is not in top 100, fetch their specific rank count
        if (!myRankEntry) {
            const higherPointsCount = await prisma.user.count({
                where: {
                    ...whereCondition,
                    points: { gt: currentUser.points }
                }
            });

            myRankEntry = {
                rank: higherPointsCount + 1,
                ...currentUser,
                isMe: true
            };
        }

        return {
            leaderboard: leaderboard.slice(0, 20), // Return top 20 for display
            myStats: myRankEntry,
            group: { // Return group info
                id: activeGroup.id,
                name: activeGroup.name,
                startDate: activeGroup.startDate,
                endDate: activeGroup.endDate
            }
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
        if (user.isActive === false) return { error: "ACCOUNT_INACTIVE" };

        // Determine User Rank for unlocking logic (Scoped to Group)
        const activeGroup = await getUserActiveGroup(user.id);

        if (!activeGroup) {
            return { error: "NO_GROUP" };
        }

        const whereCondition = {
            isActive: true,
            groups: { some: { groupId: activeGroup.id } }
        };

        // Count users with strictly more points to get rank (1-based)
        const rank = await prisma.user.count({
            where: {
                ...whereCondition,
                points: { gt: user.points }
            }
        }) + 1;

        // Fetch Rewards
        const rewards = await prisma.reward.findMany();

        // Custom Sort: Gold -> Silver -> Bronze -> Others (Based on minRank)
        rewards.sort((a, b) => a.minRank - b.minRank);

        // Map rewards logic (Cumulative Eligibility)
        const hasClaimedAny = user.rewards.some(r => r.isRedeemed || true);
        const claimedRewardId = user.rewards.length > 0 ? user.rewards[0].rewardId : null;

        const mappedRewards = rewards.map((r) => {
            let isUnlockable = true;
            let conditionText = "";

            if (r.minRank > 0 && r.maxRank) {
                isUnlockable = rank >= r.minRank && rank <= r.maxRank;
                conditionText = `สำหรับลำดับที่ ${r.minRank}-${r.maxRank}`;
            } else if (r.minRank > 0) {
                isUnlockable = rank >= r.minRank;
                conditionText = `สำหรับลำดับที่ ${r.minRank} ขึ้นไป`;
            } else if (r.maxRank) {
                isUnlockable = rank <= r.maxRank;
                conditionText = `สำหรับลำดับที่ 1-${r.maxRank}`;
            } else {
                isUnlockable = true;
                conditionText = "สำหรับผู้เล่นทุกคน";
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

        // Verify Rank Requirement again (Scoped)
        const groupId = await getUserActiveGroup(user.id).then(g => g?.id);
        const whereCondition = groupId
            ? { groups: { some: { groupId } }, isActive: true }
            : { isActive: true };

        const rank = await prisma.user.count({
            where: {
                ...whereCondition,
                points: { gt: user.points }
            }
        }) + 1;

        let isUnlockable = true;

        if (reward.minRank > 0 && reward.maxRank) {
            isUnlockable = rank >= reward.minRank && rank <= reward.maxRank;
        } else if (reward.minRank > 0) {
            isUnlockable = rank >= reward.minRank;
        } else if (reward.maxRank) {
            isUnlockable = rank <= reward.maxRank;
        }

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

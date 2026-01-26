'use server';

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from 'next/cache';

export async function getRewards(query = '') {
    try {
        const rewards = await prisma.reward.findMany({
            where: {
                title: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            orderBy: {
                order: 'asc'
            }
        });
        return { rewards };
    } catch (error) {
        console.error("Error fetching rewards:", error);
        return { error: "Failed to fetch rewards" };
    }
}

export async function createReward(data) {
    try {
        await prisma.reward.create({
            data: {
                title: data.title,
                description: data.description,
                pointCost: parseInt(data.pointCost),
                stock: parseInt(data.stock),
                order: parseInt(data.order) || 0,
                minRank: parseInt(data.minRank) || 0,
                maxRank: data.maxRank ? parseInt(data.maxRank) : null
            }
        });
        revalidatePath('/admin/rewards');
        return { success: true };
    } catch (error) {
        console.error("Error creating reward:", error);
        return { error: "Failed to create reward" };
    }
}

export async function updateReward(id, data) {
    try {
        await prisma.reward.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                pointCost: parseInt(data.pointCost),
                stock: parseInt(data.stock),
                order: parseInt(data.order) || 0,
                minRank: parseInt(data.minRank) || 0,
                maxRank: data.maxRank ? parseInt(data.maxRank) : null
            }
        });
        revalidatePath('/admin/rewards');
        return { success: true };
    } catch (error) {
        console.error("Error updating reward:", error);
        return { error: "Failed to update reward" };
    }
}

export async function deleteReward(id) {
    try {
        await prisma.reward.delete({
            where: { id }
        });
        revalidatePath('/admin/rewards');
        return { success: true };
    } catch (error) {
        console.error("Error deleting reward:", error);
        return { error: "Failed to delete reward" };
    }
}

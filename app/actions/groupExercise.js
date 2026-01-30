"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getGroupExercises(groupId) {
    try {
        const exercises = await prisma.groupExercise.findMany({
            where: { groupId },
            orderBy: [
                { weekNumber: 'asc' },
                { createdAt: 'asc' }
            ]
        });
        return { exercises };
    } catch (error) {
        console.error("Error fetching group exercises:", error);
        return { error: "Failed to fetch exercises" };
    }
}

export async function createGroupExercise(data) {
    const { groupId, weekNumber, name, description, videoUrl } = data;

    if (!groupId || !weekNumber || !name) {
        return { error: "Missing required fields" };
    }

    try {
        await prisma.groupExercise.create({
            data: {
                groupId,
                weekNumber: parseInt(weekNumber),
                name,
                description,
                videoUrl
            }
        });
        revalidatePath(`/admin/groups/${groupId}`);
        return { success: true };
    } catch (error) {
        console.error("Error creating exercise:", error);
        return { error: "Failed to create exercise" };
    }
}

export async function updateGroupExercise(id, data) {
    const { name, description, videoUrl, weekNumber } = data;

    try {
        const exercise = await prisma.groupExercise.update({
            where: { id },
            data: {
                name,
                description,
                videoUrl,
                weekNumber: weekNumber ? parseInt(weekNumber) : undefined
            }
        });
        revalidatePath(`/admin/groups/${exercise.groupId}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating exercise:", error);
        return { error: "Failed to update exercise" };
    }
}

export async function deleteGroupExercise(id) {
    try {
        const exercise = await prisma.groupExercise.delete({
            where: { id }
        });
        revalidatePath(`/admin/groups/${exercise.groupId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting exercise:", error);
        return { error: "Failed to delete exercise" };
    }
}

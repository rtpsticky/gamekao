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

export async function copyWeekExercises(groupId, sourceWeek, targetWeek) {
    if (!groupId || !sourceWeek || !targetWeek) {
        return { error: "Missing required fields" };
    }

    if (sourceWeek === targetWeek) {
        return { error: "Source and target weeks cannot be the same" };
    }

    try {
        // 1. Get exercises from source week
        const sourceExercises = await prisma.groupExercise.findMany({
            where: {
                groupId,
                weekNumber: parseInt(sourceWeek)
            }
        });

        if (sourceExercises.length === 0) {
            return { error: "No exercises found in source week" };
        }

        // 2. Prepare data for new exercises
        // We create them one by one or createMany if supported (Prisma createMany is supported in most SQL DBs)
        const newExercisesData = sourceExercises.map(ex => ({
            groupId,
            weekNumber: parseInt(targetWeek),
            name: ex.name,
            description: ex.description,
            videoUrl: ex.videoUrl
        }));

        await prisma.groupExercise.createMany({
            data: newExercisesData
        });

        revalidatePath(`/admin/groups/${groupId}`);
        return { success: true, count: newExercisesData.length };
    } catch (error) {
        console.error("Error copying exercises:", error);
        return { error: "Failed to copy exercises" };
    }
}

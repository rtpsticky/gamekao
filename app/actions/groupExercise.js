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

export async function getUserCurrentWeekExercises(lineUserId) {
    if (!lineUserId) {
        return { error: "User not identified" };
    }

    try {
        // 1. Find User and their Active Group
        // We find the user and include their groups, filtering for the active one.
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: {
                groups: {
                    where: {
                        group: {
                            isActive: true
                        }
                    },
                    include: {
                        group: true
                    },
                    take: 1 // Assume user is only in one active group at a time
                }
            }
        });

        if (!user) {
            return { error: "User not found" };
        }

        if (!user.groups || user.groups.length === 0) {
            return { error: "User is not in any active group" };
        }

        const group = user.groups[0].group;

        // 2. Calculate Current Week
        // Logic similar to admin/groups/page.jsx but server-side
        const startDate = new Date(group.startDate);
        const endDate = group.endDate ? new Date(group.endDate) : null;
        const now = new Date();

        // Normalize time to midnight for comparison
        startDate.setHours(0, 0, 0, 0);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        let currentWeek = 0;

        if (today < startDate) {
            // Not started yet
            currentWeek = 0;
        } else if (endDate && today > endDate) {
            // Ended
            currentWeek = 999;
        } else {
            const diffTime = today.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
            currentWeek = Math.floor(diffDays / 7) + 1;
        }

        if (currentWeek === 0) {
            return { message: "Group has not started yet", exercises: [] };
        }

        // 3. Fetch Exercises for current week
        const exercises = await prisma.groupExercise.findMany({
            where: {
                groupId: group.id,
                weekNumber: currentWeek
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return {
            success: true,
            exercises,
            week: currentWeek,
            groupName: group.name
        };

    } catch (error) {
        console.error("Error fetching user exercises:", error);
        return { error: "Internal server error" };
    }
}

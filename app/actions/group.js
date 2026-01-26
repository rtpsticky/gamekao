"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Group CRUD ---

export async function getGroups() {
    try {
        const groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { groups };
    } catch (error) {
        console.error("Error fetching groups:", error);
        return { error: "Failed to fetch groups" };
    }
}

export async function createGroup(data) {
    try {
        const { name, startDate, endDate } = data;
        await prisma.group.create({
            data: {
                name,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isActive: true
            }
        });
        revalidatePath('/admin/groups');
        return { success: true };
    } catch (error) {
        console.error("Error creating group:", error);
        return { error: "Failed to create group" };
    }
}

export async function updateGroup(id, data) {
    try {
        const { name, startDate, endDate, isActive } = data;
        await prisma.group.update({
            where: { id },
            data: {
                name,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                isActive: isActive // Can be boolean
            }
        });
        revalidatePath('/admin/groups');
        return { success: true };
    } catch (error) {
        console.error("Error updating group:", error);
        return { error: "Failed to update group" };
    }
}

export async function deleteGroup(id) {
    try {
        // Option 1: Delete all memberships first (Cascade manually if not set in DB)
        // Check schema: cascade isn't explicitly defined in provided snippets, but relation exists.
        // Safer to delete members relation first.
        await prisma.groupMember.deleteMany({
            where: { groupId: id }
        });

        await prisma.group.delete({
            where: { id }
        });
        revalidatePath('/admin/groups');
        return { success: true };
    } catch (error) {
        console.error("Error deleting group:", error);
        return { error: "Failed to delete group" };
    }
}

export async function getGroupDetails(id) {
    try {
        const group = await prisma.group.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });
        return { group };
    } catch (error) {
        console.error("Error fetching group details:", error);
        return { error: "Failed to fetch group details" };
    }
}

// --- Member Management ---

export async function getAvailableUsersForGroup(groupId, query = "") {
    try {
        // 1. Get IDs of users already in the group
        const existingMembers = await prisma.groupMember.findMany({
            where: { groupId },
            select: { userId: true }
        });
        const existingUserIds = existingMembers.map(m => m.userId);

        // 2. Find users NOT in that list
        // If query provided, filter by name as well
        const whereClause = {
            id: { notIn: existingUserIds },
            isActive: true
        };

        if (query) {
            whereClause.OR = [
                { displayName: { contains: query, mode: 'insensitive' } },
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
            ];
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            take: 100, // Limit to prevent overload, maybe support pagination later
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                displayName: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
            }
        });

        return { users };
    } catch (error) {
        console.error("Error fetching available users:", error);
        return { error: "Failed to fetch users" };
    }
}

export async function addMembersToGroup(groupId, userIds) {
    try {
        // Bulk create
        // Prisma createMany is supported for simple relations
        await prisma.groupMember.createMany({
            data: userIds.map(userId => ({
                groupId,
                userId
            })),
            skipDuplicates: true // In case of race conditions
        });

        revalidatePath(`/admin/groups/${groupId}`);
        return { success: true };
    } catch (error) {
        console.error("Error adding members:", error);
        return { error: "Failed to add members" };
    }
}

export async function removeMemberFromGroup(groupId, userId) {
    try {
        await prisma.groupMember.delete({
            where: {
                groupId_userId: {
                    groupId,
                    userId
                }
            }
        });
        revalidatePath(`/admin/groups/${groupId}`);
        return { success: true };
    } catch (error) {
        console.error("Error removing member:", error);
        return { error: "Failed to remove member" };
    }
}

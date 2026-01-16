"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function toggleUserStatus(userId, currentStatus) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: !currentStatus }
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error("Error toggling user status:", error);
        return { success: false, error: "Failed to update status" };
    }
}

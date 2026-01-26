import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

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

"use server";

"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function registerUser(formData) {
    const lineUserId = formData.get("lineUserId");
    const displayName = formData.get("displayName");
    const profileImageUrl = formData.get("profileImageUrl");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const age = parseInt(formData.get("age"), 10);
    const gender = formData.get("gender");

    if (!lineUserId || !firstName || !lastName || !age || !gender) {
        return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { lineUserId },
        });

        if (existingUser) {
            // User already exists, maybe update or just redirect?
            // For now, let's treat it as a success/login if they are just re-registering or updating.
            // Or return an error if strict registration.
            // Let's update the info if they submit again.
            await prisma.user.update({
                where: { lineUserId },
                data: {
                    firstName,
                    lastName,
                    age,
                    gender,
                    displayName: displayName || existingUser.displayName,
                    profileImageUrl: profileImageUrl || existingUser.profileImageUrl,
                }
            });
        } else {
            await prisma.user.create({
                data: {
                    lineUserId,
                    displayName,
                    profileImageUrl,
                    firstName,
                    lastName,
                    age,
                    gender,
                },
            });
        }

    } catch (error) {
        console.error("Registration error:", error);
        return { error: "เกิดข้อผิดพลาดในการลงทะเบียน โปรดลองใหม่อีกครั้ง" };
    }

    return { success: true };
}

export async function checkUserRegistered(lineUserId) {
    if (!lineUserId) return false;
    const user = await prisma.user.findUnique({
        where: { lineUserId },
    });
    return !!user;
}

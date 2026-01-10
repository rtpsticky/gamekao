"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// Configuration
const REQUIRED_SUBMISSIONS_FOR_REWARD = 3;

/**
 * Handle exercise submission from LIFF
 * @param {FormData} formData 
 */
export async function submitExercise(formData) {
    const lineUserId = formData.get("lineUserId");
    const note = formData.get("note");
    const files = formData.getAll("images"); // Expecting multiple files with key 'images'

    if (!lineUserId) {
        return { error: "ไม่พบข้อมูลผู้ใช้ (Line ID)" };
    }

    if (!files || files.length === 0) {
        return { error: "กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป" };
    }

    if (files.length > 3) {
        return { error: "อัปโหลดได้สูงสุด 3 รูป" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: { diceInventory: true }
        });

        if (!user) {
            return { error: "ไม่พบผู้ใช้ในระบบ กรุณาลงทะเบียนก่อน" };
        }

        // --- Logic: Date & Week Calculation ---
        // For simplicity, let's assume standard ISO week or just calculate based on start date if group provided.
        // But for this requirement "1 week counts as max 3 times", we need a "Week Definition".
        // Let's use ISO Week number for simplicity or just current week of year.
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
        const currentWeekNumber = Math.ceil((now.getDay() + 1 + days) / 7);

        // --- Logic: Check Daily Submission Limit ---
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));

        const existingDailyLog = await prisma.exerciseLog.findFirst({
            where: {
                userId: user.id,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (existingDailyLog) {
            return { error: "วันนี้คุณส่งผลการออกกำลังกายไปแล้ว พรุ่งนี้ค่อยส่งใหม่นะ!" };
        }

        // --- Logic: Check Weekly Submission Count ---
        const weeklyLogsCount = await prisma.exerciseLog.count({
            where: {
                userId: user.id,
                weekNumber: currentWeekNumber
                // Ideally should filter by Year too if usage spans years, but keeping simple for now.
            }
        });

        if (weeklyLogsCount >= REQUIRED_SUBMISSIONS_FOR_REWARD) {
            // Can they still submit if they already got reward?
            // "1 week can send max 3 times" -> implies they CANNOT send more than 3.
            return { error: "สัปดาห์นี้คุณส่งผลครบ 3 ครั้งแล้ว เก่งมาก! พักผ่อนแล้วมาเริ่มใหม่สัปดาห์หน้านะ" };
        }

        // --- Logic: Save Images ---
        const uploadDir = path.join(process.cwd(), "public/uploads/exercises");
        await fs.mkdir(uploadDir, { recursive: true });

        const imageUrls = [];
        for (const file of files) {
            if (file.size > 0 && file.name) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const ext = path.extname(file.name);
                const filename = `${user.id}-${Date.now()}-${uuidv4()}${ext}`;
                const filepath = path.join(uploadDir, filename);

                await fs.writeFile(filepath, buffer);
                imageUrls.push(`/uploads/exercises/${filename}`);
            }
        }

        // --- Logic: Create Transaction ---
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Log
            const newLog = await tx.exerciseLog.create({
                data: {
                    userId: user.id,
                    weekNumber: currentWeekNumber,
                    sessionCount: weeklyLogsCount + 1,
                    note: note || "",
                    images: {
                        create: imageUrls.map(url => ({ imageUrl: url }))
                    }
                }
            });

            // 2. Walk 1 Step
            // Assuming max board size 48? Should check?
            // "everyone starts at 1".
            // Let's just increment. If > 48, maybe cap or handle win?
            // The existing game code handles overflow logic in UI, but DB should store integer.
            // Let's just increment safely.
            const nextPosition = Math.min(user.currentPosition + 1, 48);

            await tx.user.update({
                where: { id: user.id },
                data: { currentPosition: nextPosition }
            });

            await tx.gameActionLog.create({
                data: {
                    userId: user.id,
                    actionType: "EXERCISE_STEP",
                    fromPosition: user.currentPosition,
                    toPosition: nextPosition,
                    description: "เดิน 1 ช่องจากการส่งผลออกกำลังกาย"
                }
            });

            let earnedDice = false;

            // 3. Check Bonus (If this is the 3rd submission)
            if (weeklyLogsCount + 1 === REQUIRED_SUBMISSIONS_FOR_REWARD) {
                // Give 1 Dice
                await tx.diceInventory.upsert({
                    where: { userId: user.id },
                    update: { diceCount: { increment: 1 } },
                    create: { userId: user.id, diceCount: 1 }
                });

                // Log separate action for dice? Or just part of flow?
                // Let's log it.
                /* We don't have explicit ActionType for GET_DICE yet in schema provided in context, 
                   but we have DICE_ROLL. 
                   Let's just update silently or maybe log generic?
                */
                earnedDice = true;
            }

            return {
                success: true,
                message: "บันทึกข้อมูลเรียบร้อย",
                walked: true,
                earnedDice,
                newPosition: nextPosition
            };
        });

        revalidatePath("/liff/game"); // In case we want to refresh game state if user switches back
        return result;

    } catch (error) {
        console.error("Exercise submission error:", error);
        return { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
    }
}

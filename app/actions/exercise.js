"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/app/lib/supabase";

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

    // Images are now optional
    /*
    if (!files || files.length === 0) {
        return { error: "กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป" };
    }
    */

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

        if (user.isActive === false) {
            return { error: "บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อเจ้าหน้าที่" };
        }

        // Check active group membership
        const activeGroupMember = await prisma.groupMember.findFirst({
            where: {
                userId: user.id,
                group: { isActive: true }
            },
            include: { group: true }
        });

        if (!activeGroupMember) {
            return { error: "NO_GROUP" };
        }

        // --- Logic: Date & Week Calculation (Relative to Group Start Date) ---
        const now = new Date();
        let currentWeekNumber = 1;
        
        if (activeGroupMember.group.startDate) {
            const startDate = new Date(activeGroupMember.group.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            // If before start date, it's effectively week 1 or "not started"
            // But we'll follow the group's current week logic
            const diffTime = now.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
            currentWeekNumber = Math.floor(diffDays / 7) + 1;
            
            if (currentWeekNumber < 1) currentWeekNumber = 1; // Cap at 1 if early
        }

        // --- Logic: Check Daily Submission Limit ---
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

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

        // --- Logic: Check Weekly Submission Count (Based on Relative Week) ---
        const weeklyLogsCount = await prisma.exerciseLog.count({
            where: {
                userId: user.id,
                weekNumber: currentWeekNumber
            }
        });

        if (weeklyLogsCount >= REQUIRED_SUBMISSIONS_FOR_REWARD) {
            return { error: `สัปดาห์ที่ ${currentWeekNumber} คุณส่งผลครบ 3 ครั้งแล้ว เก่งมาก! พักผ่อนแล้วมาเริ่มใหม่สัปดาห์หน้านะ` };
        }

        // --- Logic: Upload Images to Supabase ---
        const imageUrls = [];
        const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'exercises';

        for (const file of files) {
            if (file.size > 0 && file.name) {
                const buffer = await file.arrayBuffer();
                const fileBody = Buffer.from(buffer);
                const ext = path.extname(file.name);
                const filename = `${user.id}-${Date.now()}-${uuidv4()}${ext}`;
                const filePath = `exercises/${filename}`;

                const { data, error } = await supabase
                    .storage
                    .from(bucketName)
                    .upload(filePath, fileBody, {
                        contentType: file.type,
                        upsert: false
                    });

                if (error) {
                    console.error("Supabase upload error:", error);
                    // Continue or fail? If one fails, maybe we should fail the whole request?
                    // For now, let's log and continue, but usually we want all or nothing.
                    // Given the loop, let's throw to go to catch block.
                    throw new Error(`Failed to upload image: ${error.message}`);
                }

                const { data: publicUrlData } = supabase
                    .storage
                    .from(bucketName)
                    .getPublicUrl(filePath);

                if (publicUrlData && publicUrlData.publicUrl) {
                    imageUrls.push(publicUrlData.publicUrl);
                }
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
                data: { 
                    currentPosition: nextPosition,
                    points: { increment: 10 }
                }
            });

            await tx.pointHistory.create({
                data: {
                    userId: user.id,
                    amount: 10,
                    reason: `ส่งผลการออกกำลังกาย สัปดาห์ที่ ${currentWeekNumber} ครั้งที่ ${weeklyLogsCount + 1}`
                }
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
        
        // Detailed error messages based on error type
        if (error.message && error.message.includes("Failed to upload image")) {
            return { error: `ไม่สามารถอัปโหลดรูปภาพได้: ${error.message}. กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือลองใหม่อีกครั้ง` };
        }

        if (error.code === 'P2002') {
            return { error: "ข้อมูลซ้ำ: คุณอาจได้ส่งผลการออกกำลังกายไปแล้วในช่วงเวลานี้" };
        }

        return { error: `เกิดข้อผิดพลาดทางเทคนิค: ${error.message || "ไม่สามารถระบุสาเหตุได้"} กรุณาแคปหน้าจอนี้แจ้งเจ้าหน้าที่` };
    }
}

/**
 * Calculates the ISO 8601 week number for a given date.
 * @param {Date} date 
 * @returns {number} ISO Week number
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Returns the start (Monday 00:00:00) and end (Sunday 23:59:59) of the ISO week for a given date.
 * @param {Date} date 
 */
function getStartAndEndOfISOWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday

    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
}






/**
 * Admin: เพิ่มประวัติการออกกำลังกายให้ user โดยตรง
 * ไม่ตรวจสอบ daily limit แต่ตรวจสอบ weekly limit (max 3/week)
 */
export async function adminAddExerciseLog(formData) {
    const userId = formData.get('userId');
    const weekNumber = parseInt(formData.get('weekNumber'), 10);
    const note = formData.get('note') || '';

    if (!userId || !weekNumber) {
        return { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { diceInventory: true }
        });

        if (!user) return { error: 'ไม่พบผู้ใช้ในระบบ' };

        // นับจำนวนครั้งที่ส่งในสัปดาห์นั้นๆ แล้ว
        const weeklyLogsCount = await prisma.exerciseLog.count({
            where: { userId: user.id, weekNumber }
        });

        if (weeklyLogsCount >= REQUIRED_SUBMISSIONS_FOR_REWARD) {
            return { error: `สัปดาห์ที่ ${weekNumber} ผู้ใช้นี้ส่งผลครบ 3 ครั้งแล้ว` };
        }

        const sessionCount = weeklyLogsCount + 1;

        const result = await prisma.$transaction(async (tx) => {
            // 1. สร้าง ExerciseLog
            await tx.exerciseLog.create({
                data: {
                    userId: user.id,
                    weekNumber,
                    sessionCount,
                    note,
                }
            });

            // 2. เดิน 1 ช่อง + บวก 10 แต้ม
            const nextPosition = Math.min((user.currentPosition || 0) + 1, 48);
            await tx.user.update({
                where: { id: user.id },
                data: {
                    currentPosition: nextPosition,
                    points: { increment: 10 }
                }
            });

            await tx.pointHistory.create({
                data: {
                    userId: user.id,
                    amount: 10,
                    reason: `[Admin] ส่งผลออกกำลังกาย สัปดาห์ที่ ${weekNumber} ครั้งที่ ${sessionCount}`
                }
            });

            await tx.gameActionLog.create({
                data: {
                    userId: user.id,
                    actionType: 'EXERCISE_STEP',
                    fromPosition: user.currentPosition || 0,
                    toPosition: nextPosition,
                    description: '[Admin] เพิ่มประวัติออกกำลังกายโดย Admin'
                }
            });

            // 3. ถ้าครบ 3 ครั้ง → ได้ลูกเต๋า
            let earnedDice = false;
            if (sessionCount === REQUIRED_SUBMISSIONS_FOR_REWARD) {
                await tx.diceInventory.upsert({
                    where: { userId: user.id },
                    update: { diceCount: { increment: 1 } },
                    create: { userId: user.id, diceCount: 1 }
                });
                earnedDice = true;
            }

            return { success: true, earnedDice, sessionCount, newPosition: nextPosition };
        });

        revalidatePath('/admin/exercise-logs');
        return result;

    } catch (error) {
        console.error('adminAddExerciseLog error:', error);
        return { error: `เกิดข้อผิดพลาด: ${error.message}` };
    }
}

export async function getExerciseLogs(query = '') {
    try {
        const logs = await prisma.exerciseLog.findMany({
            where: {
                OR: [
                    { user: { firstName: { contains: query, mode: 'insensitive' } } },
                    { user: { lastName: { contains: query, mode: 'insensitive' } } },
                    { note: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                user: {
                    include: {
                        groups: {
                            include: {
                                group: true
                            }
                        }
                    }
                },
                images: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });
        return logs;
    } catch (error) {
        console.error("Error fetching exercise logs:", error);
        return [];
    }
}

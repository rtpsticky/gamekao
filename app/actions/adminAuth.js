'use server'
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { verifyPassword } from "@/app/lib/password";
import { createSession, deleteSession } from "@/app/lib/session";
import { redirect } from "next/navigation";

export async function login(prevState, formData) {
    const username = formData.get('username')?.trim();
    const password = formData.get('password')?.trim();

    if (!username || !password) {
        return { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
    }

    try {
        const admin = await prisma.admin.findUnique({
            where: { username },
        });

        if (!admin) {
            console.log('Login failed: User not found', username);
            return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
        }

        const isValid = await verifyPassword(password, admin.password);

        if (!isValid) {
            console.log('Login failed: Password mismatch for', username);
            return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
        }

        await createSession(admin.id, admin.role);
    } catch (error) {
        console.error('Login error:', error);
        return { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }

    redirect('/admin');
}

export async function logout() {
    await deleteSession();
    redirect('/admin/login');
}

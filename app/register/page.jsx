"use client";

import { useState, useEffect } from "react";
import liff from "@line/liff";
import { registerUser } from "../actions/register";

export default function RegisterPage() {
    const [liffLoaded, setLiffLoaded] = useState(false);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Initialize LIFF
        // Replace 'YOUR_LIFF_ID' with the user's LIFF ID if provided, otherwise use a placeholder and handle the error nicely.
        // For local development without a real LIFF ID, we might want to simulate or allow manual bypass.
        // However, the real app needs a LIFF ID.
        // I will use a dummy ID for now and add a check.
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "YOUR_LIFF_ID";

        liff
            .init({ liffId })
            .then(() => {
                setLiffLoaded(true);
                if (liff.isLoggedIn()) {
                    liff.getProfile().then((profile) => {
                        setProfile(profile);
                    });
                } else {
                    liff.login();
                }
            })
            .catch((err) => {
                console.error("LIFF Intialization failed", err);
                setError("ไม่สามารถเชื่อมต่อกับ LINE ได้ (LIFF Init Failed)");
                // Allow testing in browser without LIFF if needed (optional)
                // setLiffLoaded(true); 
            });
    }, []);

    if (!liffLoaded && !error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-600">กำลังโหลด...</div>
            </div>
        );
    }

    if (error) {
        // Fallback for development/testing if LIFF ID is invalid
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="bg-white p-6 rounded-lg shadow-md max-w-sm w-full text-center">
                    <h1 className="text-red-500 font-bold mb-4">เกิดข้อผิดพลาด</h1>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <p className="text-sm text-gray-500">กรุณาตรวจสอบ LIFF ID ในการตั้งค่า</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 py-10 px-4 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">ลงทะเบียน</h1>

                {profile && (
                    <div className="flex flex-col items-center mb-6">
                        <img
                            src={profile.pictureUrl}
                            alt={profile.displayName}
                            className="w-20 h-20 rounded-full border-4 border-indigo-100 mb-2"
                        />
                        <p className="text-gray-600">สวัสดี, <span className="font-semibold text-indigo-600">{profile.displayName}</span></p>
                    </div>
                )}

                <form action={registerUser} className="space-y-5">
                    {/* Hidden fields for LINE data */}
                    <input type="hidden" name="lineUserId" value={profile?.userId || "TEST_USER_ID"} />
                    <input type="hidden" name="displayName" value={profile?.displayName || "Test User"} />
                    <input type="hidden" name="profileImageUrl" value={profile?.pictureUrl || ""} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อจริง</label>
                        <input
                            type="text"
                            name="firstName"
                            required
                            placeholder="กรอกชื่อจริง"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                        <input
                            type="text"
                            name="lastName"
                            required
                            placeholder="กรอกนามสกุล"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">อายุ</label>
                        <input
                            type="number"
                            name="age"
                            required
                            min="1"
                            max="120"
                            placeholder="กรอกอายุ"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                        <select
                            name="gender"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            defaultValue=""
                        >
                            <option value="" disabled>เลือกเพศ</option>
                            <option value="male">ชาย</option>
                            <option value="female">หญิง</option>
                            <option value="other">อื่นๆ</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200 mt-4"
                    >
                        ลงทะเบียน
                    </button>
                </form>
            </div>
        </div>
    );
}

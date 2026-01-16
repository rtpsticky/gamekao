'use client'

import { useActionState } from 'react';
import { login } from '@/app/actions/adminAuth';

export default function LoginPage() {
    const [state, action, isPending] = useActionState(login, null);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">ผู้ดูแลระบบ</h1>
                <form action={action} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้งาน</label>
                        <input
                            type="text"
                            name="username"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="Username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                        <input
                            type="password"
                            name="password"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="Password"
                        />
                    </div>
                    {state?.error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{state.error}</div>
                    )}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        {isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>
            </div>
        </div>
    );
}

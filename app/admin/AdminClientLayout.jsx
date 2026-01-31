'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/app/actions/adminAuth';

export default function AdminClientLayout({ children, session }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-20 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                    <span className="font-extrabold text-blue-600">GameKao Admin</span>
                </div>
            </div>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden animate-in fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:relative inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col z-30 transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-extrabold text-blue-600 tracking-tight">GameKao</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Admin Panel</p>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <SidebarLink href="/admin" label="ภาพรวมระบบ" icon="📊" onClick={() => setIsSidebarOpen(false)} />
                    <SidebarLink href="/admin/users" label="จัดการผู้ใช้" icon="👥" onClick={() => setIsSidebarOpen(false)} />
                    <SidebarLink href="/admin/groups" label="จัดการกลุ่ม" icon="🏘️" onClick={() => setIsSidebarOpen(false)} />
                    <SidebarLink href="/admin/rewards" label="ของรางวัล" icon="🎁" onClick={() => setIsSidebarOpen(false)} />
                    {session.role === 'SUPER_ADMIN' && (
                        <SidebarLink href="/admin/manage-admins" label="ผู้ดูแลระบบ" icon="🛡️" onClick={() => setIsSidebarOpen(false)} />
                    )}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <div className="mb-4 px-4">
                        <p className="text-sm font-medium text-gray-700 truncate">{session.role}</p>
                        <p className="text-xs text-gray-400">ID: {session.userId.slice(0, 8)}...</p>
                    </div>
                    <form action={logout}>
                        <button className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                            <span className="mr-3">🚪</span>
                            ออกจากระบบ
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 mt-16 md:mt-0 w-full relative">
                <div className="p-4 md:p-8 pb-20 max-w-[100vw] overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}

function SidebarLink({ href, label, icon, onClick }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200 group"
        >
            <span className="mr-3 text-xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    );
}

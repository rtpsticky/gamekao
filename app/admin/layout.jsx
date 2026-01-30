import Link from 'next/link';
import { logout } from '@/app/actions/adminAuth';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }) {
    const session = await getSession();
    // If no session, likely on login page or about to be redirected by page logic
    // We render children without sidebar for public admin pages (like login)
    if (!session) {
        return <div className="min-h-screen bg-gray-50">{children}</div>;
    }

    // If session exists, render with sidebar

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-xl hidden md:flex flex-col z-10">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-extrabold text-blue-600 tracking-tight">GameKao</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Admin Panel</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <SidebarLink href="/admin" label="ภาพรวมระบบ" icon="📊" />
                    <SidebarLink href="/admin/users" label="จัดการผู้ใช้" icon="👥" />
                    <SidebarLink href="/admin/groups" label="จัดการกลุ่ม" icon="🏘️" />
                    <SidebarLink href="/admin/rewards" label="ของรางวัล" icon="🎁" />
                    {session.role === 'SUPER_ADMIN' && (
                        <SidebarLink href="/admin/manage-admins" label="ผู้ดูแลระบบ" icon="🛡️" />
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
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="p-8 pb-20">
                    {children}
                </div>
            </main>
        </div>
    );
}

function SidebarLink({ href, label, icon }) {
    return (
        <Link
            href={href}
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200 group"
        >
            <span className="mr-3 text-xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    );
}

import Link from 'next/link';
import { logout } from '@/app/actions/adminAuth';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import AdminClientLayout from './AdminClientLayout';

export default async function AdminLayout({ children }) {
    const session = await getSession();
    // If no session, likely on login page or about to be redirected by page logic
    // We render children without sidebar for public admin pages (like login)
    if (!session) {
        return <div className="min-h-screen bg-gray-50">{children}</div>;
    }

    // If session exists, render with responsive sidebar
    return <AdminClientLayout session={session}>{children}</AdminClientLayout>;
}

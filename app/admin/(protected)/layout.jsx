import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({ children }) {
    const session = await getSession();
    if (!session) {
        redirect('/admin/login');
    }

    return <>{children}</>;
}

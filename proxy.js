import { NextResponse } from 'next/server'

export function proxy(request) {
    // Check if the request is for /admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Skip checking for the login page itself
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }

        const session = request.cookies.get('admin_session')?.value;

        if (!session) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
}

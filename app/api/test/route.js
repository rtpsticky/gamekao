import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const targetUrl = 'https://jefferson-penciliform-elodia.ngrok-free.dev';
        const response = await fetch(targetUrl);

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        return NextResponse.json({
            success: true,
            target: targetUrl,
            status: response.status,
            data: data
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

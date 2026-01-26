import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const { MessagingApiClient } = messagingApi;

const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.CHANNEL_SECRET;

const client = new MessagingApiClient({
    channelAccessToken: channelAccessToken,
});

export async function POST(req) {
    if (!channelAccessToken || !channelSecret) {
        return NextResponse.json({ error: 'Missing LINE Bot credentials' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const events = body.events;

        await Promise.all(events.map(async (event) => {
            await handleEvent(event);
        }));

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Error handling events:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function handleEvent(event) {
    if (event.type === 'follow') {
        return checkAndSendRegistrationPrompt(event);
    }

    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    return checkAndSendRegistrationPrompt(event);
}

async function checkAndSendRegistrationPrompt(event) {
    const userId = event.source.userId;
    if (!userId) return Promise.resolve(null);

    // Check if user exists in DB
    const user = await prisma.user.findUnique({
        where: { lineUserId: userId },
    });

    // If user is ALREADY registered, do nothing (or reply something else if needed)
    if (user) {
        return Promise.resolve(null);
    }

    // If user is NOT registered, reply with Flex Message
    const flexMessage = {
        type: "flex",
        altText: "กรุณาลงทะเบียน",
        contents: {
            type: "bubble",
            hero: {
                type: "image",
                url: "https://epid-odpc2.ddc.moph.go.th/kao/assets/images/logo.png", // Use a placeholder or app logo if available
                size: "full",
                aspectRatio: "20:13",
                aspectMode: "cover"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "ยินดีต้อนรับสู่ Game Kao!",
                        weight: "bold",
                        size: "xl",
                        wrap: true
                    },
                    {
                        type: "text",
                        text: "คุณยังไม่ได้ลงทะเบียน กรุณาลงทะเบียนก่อนนะครับ 👇",
                        margin: "md",
                        wrap: true,
                        color: "#666666"
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                    {
                        type: "button",
                        style: "primary",
                        height: "sm",
                        action: {
                            type: "uri",
                            label: "ลงทะเบียน",
                            uri: "https://liff.line.me/2008850670-wvq6YQdb"
                        },
                        color: "#00B900"
                    }
                ],
                flex: 0
            }
        }
    };

    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [flexMessage],
    });
}

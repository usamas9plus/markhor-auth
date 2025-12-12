// File: app/api/admin/generate/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adminSecret, licenseKey, days } = body;

    // Security Check
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Wrong Secret' }, { status: 401 });
    }

    if (!licenseKey || !days) {
        return NextResponse.json({ error: 'Missing licenseKey or days' }, { status: 400 });
    }

    // Calculate seconds (Days * 24 hours * 60 mins * 60 secs)
    const seconds = days * 24 * 60 * 60;

    // Save to Database with expiration
    await redis.set(`license:${licenseKey}`, 'active', { ex: seconds });

    return NextResponse.json({ 
      success: true, 
      message: `Key ${licenseKey} created`,
      expiresInDays: days 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
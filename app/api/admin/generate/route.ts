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

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Wrong Secret' }, { status: 401 });
    }

    if (!licenseKey || days === undefined) {
      return NextResponse.json({ error: 'Missing licenseKey or days' }, { status: 400 });
    }

    const numDays = Number(days);
    const now = Date.now();
    // numDays -1 means permanent key
    const expiresAt = numDays === -1 ? -1 : now + (numDays * 24 * 60 * 60 * 1000);

    // Save to master persistent licenses_db hash
    await redis.hset('licenses_db', { [licenseKey]: expiresAt });

    // Also set legacy key for backwards compatibility
    if (numDays !== -1) {
      const seconds = numDays * 24 * 60 * 60;
      await redis.set(`license:${licenseKey}`, 'active', { ex: seconds });
    } else {
      await redis.set(`license:${licenseKey}`, 'active');
    }

    return NextResponse.json({ 
      success: true, 
      message: `Key ${licenseKey} created`,
      expiresAt,
      expiresInDays: numDays 
    });
  } catch (error) {
    console.error('Error generating key:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
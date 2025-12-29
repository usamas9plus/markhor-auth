import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { adminSecret, licenseKey, newDays } = await req.json();

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!licenseKey || !newDays) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const seconds = Number(newDays) * 86400;

    // Check if key exists first
    const exists = await redis.exists(`license:${licenseKey}`);
    if (!exists) {
        return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // Update the expiration time
    await redis.expire(`license:${licenseKey}`, seconds);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

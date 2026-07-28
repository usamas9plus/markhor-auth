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

    const now = Date.now();
    const daysNum = Number(newDays);
    const addMs = daysNum * 86400 * 1000;
    
    const currentExpiresAtVal = await redis.hget('licenses_db', licenseKey);
    let currentExpiresAt = currentExpiresAtVal ? Number(currentExpiresAtVal) : 0;
    const baseTime = (currentExpiresAt > now) ? currentExpiresAt : now;
    const newExpiresAt = baseTime + addMs;

    // Update persistent DB and legacy keys
    await redis.hset('licenses_db', { [licenseKey]: newExpiresAt });

    const newTtlSec = Math.max(1, Math.floor((newExpiresAt - now) / 1000));
    await redis.set(`license:${licenseKey}`, 'active', { ex: newTtlSec });

    return NextResponse.json({ success: true, newExpiresAt, newTtlSeconds: newTtlSec });
  } catch (error) {
    console.error('Error updating key:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

// File: app/api/admin/extend/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { adminSecret, licenseKey, days = 30 } = await req.json();

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Incorrect Secret' }, { status: 401 });
    }

    if (!licenseKey) {
      return NextResponse.json({ error: 'Missing licenseKey' }, { status: 400 });
    }

    const now = Date.now();
    const currentExpiresAtVal = await redis.hget('licenses_db', licenseKey);
    let currentExpiresAt = currentExpiresAtVal ? Number(currentExpiresAtVal) : 0;

    // If key wasn't in licenses_db yet, check legacy key
    if (!currentExpiresAt) {
      const ttlSec = await redis.ttl(`license:${licenseKey}`);
      if (ttlSec > 0) currentExpiresAt = now + (ttlSec * 1000);
    }

    // Calculate new expiration timestamp
    const addMs = Number(days) * 24 * 60 * 60 * 1000;
    const baseTime = (currentExpiresAt > now) ? currentExpiresAt : now;
    const newExpiresAt = baseTime + addMs;

    // Update persistent licenses_db
    await redis.hset('licenses_db', { [licenseKey]: newExpiresAt });

    // Update legacy key with new TTL
    const newTtlSec = Math.max(1, Math.floor((newExpiresAt - now) / 1000));
    await redis.set(`license:${licenseKey}`, 'active', { ex: newTtlSec });

    return NextResponse.json({
      success: true,
      message: `Extended ${licenseKey} by ${days} days`,
      key: licenseKey,
      newExpiresAt,
      newTtlSeconds: newTtlSec
    });
  } catch (error) {
    console.error('Error extending key:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

// File: app/api/verify/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json({ valid: false, message: 'Missing key' }, { status: 400 });
    }

    const now = Date.now();
    const dbExpiresAt = await redis.hget('licenses_db', licenseKey);

    // If key found in persistent hash:
    if (dbExpiresAt !== null && dbExpiresAt !== undefined) {
      const expiresAtNum = Number(dbExpiresAt);

      if (expiresAtNum === -1) {
        return NextResponse.json({ valid: true, expiresInSeconds: -1 });
      }

      if (now > expiresAtNum) {
        return NextResponse.json({ valid: false, message: 'License Expired' }, { status: 401 });
      }

      const expiresInSeconds = Math.max(0, Math.floor((expiresAtNum - now) / 1000));
      return NextResponse.json({ valid: true, expiresInSeconds });
    }

    // Fallback: Check legacy key
    const legacyExists = await redis.exists(`license:${licenseKey}`);
    if (legacyExists) {
      const ttl = await redis.ttl(`license:${licenseKey}`);
      if (ttl === -2) {
        return NextResponse.json({ valid: false, message: 'License Expired' }, { status: 401 });
      }
      return NextResponse.json({ valid: true, expiresInSeconds: ttl });
    }

    return NextResponse.json({ valid: false, message: 'Invalid License Key' }, { status: 401 });
  } catch (error) {
    console.error('Error verifying key:', error);
    return NextResponse.json({ valid: false, message: 'Server Error' }, { status: 500 });
  }
}
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

    // Check Redis database to see if key exists
    const exists = await redis.exists(`license:${licenseKey}`);

    if (!exists) {
      return NextResponse.json({ valid: false, message: 'Invalid Key' }, { status: 401 });
    }

    // Get remaining time (TTL)
    const ttl = await redis.ttl(`license:${licenseKey}`);

    return NextResponse.json({ 
      valid: true, 
      expiresInSeconds: ttl 
    });

  } catch (error) {
    return NextResponse.json({ valid: false, message: 'Server error' }, { status: 500 });
  }
}
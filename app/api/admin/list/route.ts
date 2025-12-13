// File: app/api/admin/list/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { adminSecret } = await req.json();

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all keys starting with "license:"
    const keys = await redis.keys('license:*');
    const licenses = [];

    // Loop through keys to get their expiration time
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      licenses.push({
        key: key.replace('license:', ''), // Remove prefix for cleaner look
        ttl: ttl // Seconds remaining (-1 means forever, -2 means expired)
      });
    }

    // Sort by newest/longest remaining
    licenses.sort((a, b) => b.ttl - a.ttl);

    return NextResponse.json({ licenses });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
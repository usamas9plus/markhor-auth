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

    const now = Date.now();
    // 1. Get all persistent keys from licenses_db hash
    const allDbLicenses: Record<string, number | string> = (await redis.hgetall('licenses_db')) || {};

    // 2. Check for any legacy "license:*" keys and import them to master DB if missing
    const legacyKeys = await redis.keys('license:*');
    for (const key of legacyKeys) {
      const cleanKey = key.replace('license:', '');
      if (allDbLicenses[cleanKey] === undefined) {
        const ttlSec = await redis.ttl(key);
        const expiresAt = ttlSec === -1 ? -1 : (ttlSec > 0 ? now + (ttlSec * 1000) : now - 1000);
        allDbLicenses[cleanKey] = expiresAt;
        // Save to persistent hash so it never disappears
        await redis.hset('licenses_db', { [cleanKey]: expiresAt });
      }
    }

    const licenses = [];
    for (const [keyName, expiresAtVal] of Object.entries(allDbLicenses)) {
      const expiresAt = Number(expiresAtVal);
      let ttlSeconds = -2; // Default Expired

      if (expiresAt === -1) {
        ttlSeconds = -1; // Permanent
      } else if (expiresAt > now) {
        ttlSeconds = Math.floor((expiresAt - now) / 1000);
      } else {
        ttlSeconds = -2; // Expired
      }

      licenses.push({
        key: keyName,
        expiresAt,
        ttl: ttlSeconds,
        isExpired: ttlSeconds === -2
      });
    }

    // Sort: Active first (by remaining time desc), then expired (by key name asc)
    licenses.sort((a, b) => {
      if (a.ttl === b.ttl) return a.key.localeCompare(b.key);
      return b.ttl - a.ttl;
    });

    return NextResponse.json({ licenses });
  } catch (error) {
    console.error('Error listing keys:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
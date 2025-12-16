// File: app/api/verify/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// --- CONFIGURATION ---
// Change this to force an update for all users with older versions
const LATEST_VERSION = "1.0.0";
const DOWNLOAD_URL = "https://github.com/your-repo/releases/latest/download/MarkhorServer.exe";
// ---------------------

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { licenseKey, version } = body;

    // 1. Force Update Check
    // If the client version does not match the latest version, block access.
    // Use semver comparison if you want to support >= logic, but strict equality is safer for forced updates.
    if (version !== LATEST_VERSION) {
      return NextResponse.json({
        valid: true, // Key might be valid, but app is old. Or set false.
        update_required: true,
        download_url: DOWNLOAD_URL,
        reason: "Update Required"
      });
    }

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
      expiresInSeconds: ttl,
      update_required: false
    });

  } catch (error) {
    return NextResponse.json({ valid: false, message: 'Server error' }, { status: 500 });
  }
}

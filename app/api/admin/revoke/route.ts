// File: app/api/admin/revoke/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { adminSecret, licenseKey } = await req.json();

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!licenseKey) {
      return NextResponse.json({ error: 'Missing licenseKey' }, { status: 400 });
    }

    // Delete from persistent hash and legacy keys
    await redis.hdel('licenses_db', licenseKey);
    await redis.del(`license:${licenseKey}`);

    return NextResponse.json({ success: true, message: `Key ${licenseKey} revoked` });
  } catch (error) {
    console.error('Error revoking key:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
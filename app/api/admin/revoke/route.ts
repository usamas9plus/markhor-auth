// File: app/api/admin/revoke/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  const { adminSecret, licenseKey } = await req.json();

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delete the key
  await redis.del(`license:${licenseKey}`);

  return NextResponse.json({ success: true });
}
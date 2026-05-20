import { requireUser } from "@/lib/auth-helpers";
import { getDb, pushSubscriptions } from "@saifit/db";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const subscribeSchema = v.object({
  endpoint: v.pipe(v.string(), v.minLength(1), v.maxLength(2048)),
  p256dh: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
  auth: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
});

export async function POST(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = v.safeParse(subscribeSchema, body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();
  const { endpoint, p256dh, auth: authKey } = result.output;

  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth: authKey })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh, auth: authKey },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = v.safeParse(v.object({ endpoint: v.pipe(v.string(), v.minLength(1)) }), body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, result.output.endpoint));

  return NextResponse.json({ ok: true });
}

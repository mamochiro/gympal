import { requireUser } from "@/lib/auth-helpers";
import { getDb, userPrograms } from "@saifit/db";
import { apiSchemas } from "@saifit/shared";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const startSchema = v.object({
  templateId: apiSchemas.uuid,
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

  const result = v.safeParse(startSchema, body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();

  // Deactivate any existing active program
  await db
    .update(userPrograms)
    .set({ isActive: false, endedAt: new Date() })
    .where(and(eq(userPrograms.userId, user.id), eq(userPrograms.isActive, true)));

  // Create new program
  const [newProgram] = await db
    .insert(userPrograms)
    .values({
      userId: user.id,
      templateId: result.output.templateId,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ data: newProgram }, { status: 201 });
}

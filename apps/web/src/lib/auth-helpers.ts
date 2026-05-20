import { auth } from "@/lib/auth";
import { getDb, users } from "@saifit/db";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

type AppUser = NonNullable<Awaited<ReturnType<typeof findUser>>>;
type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type RequireUserResult = { session: Session; user: AppUser };

function findUser(betterAuthId: string) {
  return getDb().query.users.findFirst({ where: eq(users.betterAuthId, betterAuthId) });
}

export async function requireUser(request: NextRequest): Promise<RequireUserResult | NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await findUser(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return { session, user };
}

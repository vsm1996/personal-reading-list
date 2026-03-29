import { badRequest, getAuthUser, unauthorized } from "@/lib/api-auth";
import { ValidationError, requireIntInRange } from "@/lib/validate";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

// GET /api/goals?year=2026
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const goal = await prisma.readingGoal.findFirst({
    where: { profileId: user.id, year },
  });

  return NextResponse.json(goal ?? null);
}

// POST /api/goals — create or update annual reading goal
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  let year: number;
  let targetCount: number;

  try {
    const body = (await request.json()) as { year?: unknown; targetCount?: unknown };
    year = requireIntInRange(body.year, "year", 2000, 2100);
    targetCount = requireIntInRange(body.targetCount, "targetCount", 1, 9999);
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    return badRequest("Invalid request body.");
  }

  const goal = await prisma.readingGoal.upsert({
    where: { profileId_year: { profileId: user.id, year } },
    create: { profileId: user.id, year, targetCount },
    update: { targetCount },
  });

  return NextResponse.json(goal);
}

import { getAuthUser, unauthorized, badRequest } from "@/lib/api-auth";
import { getFinishedBooksThisYear } from "@/lib/data/goals";
import { NextResponse } from "next/server";

// GET /api/goals/year-books?year=2024
// Returns books finished in the given year for the authenticated user.
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : NaN;

  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return badRequest("Invalid year.");
  }

  const books = await getFinishedBooksThisYear(user.id, year);
  return NextResponse.json(books);
}

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@bookshelf/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// GET /api/shelves — list all shelves with counts
export async function GET() {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const shelves = await prisma.shelf.findMany({
    where: { profileId: user.id },
    orderBy: { position: "asc" },
    include: { _count: { select: { userBooks: true } } },
  });

  return NextResponse.json(shelves);
}

// POST /api/shelves — create a custom shelf
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json() as { name: string };
  if (!body.name?.trim()) {
    return new NextResponse("Name is required", { status: 400 });
  }

  // Position after the last existing shelf
  const lastShelf = await prisma.shelf.findFirst({
    where: { profileId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const shelf = await prisma.shelf.create({
    data: {
      profileId: user.id,
      name: body.name.trim(),
      position: (lastShelf?.position ?? -1) + 1,
      isDefault: false,
    },
    include: { _count: { select: { userBooks: true } } },
  });

  return NextResponse.json(shelf, { status: 201 });
}

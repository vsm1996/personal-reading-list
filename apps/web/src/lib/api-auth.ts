/**
 * Shared helpers for authenticated API route handlers.
 *
 * Every route that requires a signed-in user should call getAuthUser() and
 * short-circuit with unauthorized() on a null result.  Centralising this
 * means tests only need to mock one module, and the session refresh logic
 * (cookie read → Supabase getUser()) lives in exactly one place.
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Returns the authenticated Supabase user, or null if the session is absent/invalid. */
export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ─── Standard error responses ─────────────────────────────────────────────────

export const unauthorized = (message = "Unauthorized") =>
  new NextResponse(message, { status: 401 });

export const forbidden = (message = "Forbidden") =>
  new NextResponse(message, { status: 403 });

export const badRequest = (message: string) =>
  new NextResponse(message, { status: 400 });

export const notFound = (message = "Not found") =>
  new NextResponse(message, { status: 404 });

export const conflict = (body: Record<string, unknown>) =>
  NextResponse.json(body, { status: 409 });

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Handles:
//   - Email confirmation (signup)
//   - Password reset (recovery)
//   - OAuth callbacks (future)
//
// Supabase redirects here with ?code=... after the user clicks an email link.
// We exchange the code for a session, then forward to the intended destination.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Exchange failed — send back to sign-in with a generic error
  return NextResponse.redirect(
    `${origin}/sign-in?error=Could+not+authenticate.+Please+try+again.`
  );
}

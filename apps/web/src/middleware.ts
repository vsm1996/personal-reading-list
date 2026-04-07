import { createClient } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Route protection rules.
 *
 * PROTECTED_PATHS: require an authenticated session; redirect to /sign-in if absent.
 * AUTH_PATHS: already-authenticated users should not see these; redirect to /library.
 *
 * Update these arrays when adding new top-level routes.
 */
const PROTECTED_PATHS = ["/library", "/search", "/goals", "/stats"] as const;
const AUTH_PATHS = ["/sign-in", "/sign-up"] as const;

function matchesAny(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // getSession() triggers refresh-token rotation and writes updated cookies back.
  // Wrapped in try/catch because an invalid/missing refresh token throws AuthApiError.
  try { await supabase.auth.getSession(); } catch { /* stale cookie — treated as signed out */ }

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch { /* stale cookie — treated as signed out */ }

  const { pathname } = request.nextUrl;

  if (matchesAny(pathname, PROTECTED_PATHS) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (matchesAny(pathname, AUTH_PATHS) && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/library";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

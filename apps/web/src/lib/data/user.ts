/**
 * Authenticated user data layer.
 *
 * Wrapped in React cache() so layout + page can both call getAuthenticatedUser()
 * in the same render pass without firing a second Supabase round-trip.
 * See: https://react.dev/reference/react/cache
 */

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch {
    return null;
  }
});

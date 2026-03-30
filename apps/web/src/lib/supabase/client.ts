import { createBrowserClient } from "@supabase/ssr";

// Use literal property access so Turbopack can statically inline these
// values into the client bundle. process.env[dynamicKey] is not analyzed.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

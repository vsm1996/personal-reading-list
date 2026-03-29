import { env } from "@/lib/env";
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(env.supabaseUrl, env.supabaseKey);

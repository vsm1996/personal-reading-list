import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default async function globalTeardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_EMAIL;

  if (!supabaseUrl || !serviceRoleKey || !email) return;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  const user = existing?.users.find((u) => u.email === email);
  if (user) {
    await supabase.auth.admin.deleteUser(user.id);
    console.log(`[E2E teardown] Deleted test user: ${email}`);
  }
}

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey || !email || !password) {
    throw new Error(
      "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_EMAIL, E2E_PASSWORD\n" +
        "See apps/web/e2e/.env.test.example"
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete any existing test user (clean slate between runs)
  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users.find((u) => u.email === email);
  if (existingUser) {
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  // Create fresh test user with email already confirmed
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create E2E test user: ${error.message}`);
  }

  console.log(`[E2E setup] Created test user: ${email}`);
}

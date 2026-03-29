/**
 * Centralised environment variable access.
 *
 * Import from here instead of accessing process.env directly so that:
 *  - Missing config is caught at startup with a clear message
 *  - Every consumer gets a typed, non-nullable value
 *  - Tests can stub this module in one place
 *
 * Only NEXT_PUBLIC_ vars live here — they are safe in both client and server
 * bundles. Server-only vars (DATABASE_URL, DIRECT_URL) are consumed by Prisma
 * directly and do not need to be re-exported.
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required environment variable "${key}" is not set.\n` +
        `Copy apps/web/.env.local.example → apps/web/.env.local and fill in the values.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
} as const;

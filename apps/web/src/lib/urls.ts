/**
 * URL utilities.
 *
 * getBaseUrl() replaces direct window.location.origin references, which
 * break in Node.js test environments and during SSR.  In both environments
 * this function returns a consistent, correct base URL.
 */

export function getBaseUrl(): string {
  // Browser
  if (typeof window !== "undefined") return window.location.origin;

  // Vercel / serverless (set automatically by the platform)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Local dev fallback
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

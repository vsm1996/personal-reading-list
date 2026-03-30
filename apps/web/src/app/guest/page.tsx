"use client";

/**
 * Guest sign-in page.
 * Uses Supabase anonymous sign-in — must be enabled in Supabase Dashboard:
 *   Authentication → Settings → "Allow anonymous sign-ins"
 *
 * After sign-in the profile trigger fires (creates profile + default shelves),
 * then we seed 45 curated books and redirect to /library.
 */

import { createClient } from "@/lib/supabase/client";
import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function GuestPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "seeding" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startGuestSession() {
      const supabase = createClient();

      // Step 1 — anonymous sign-in
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError || cancelled) {
        if (!cancelled) {
          setErrorMsg(
            authError?.message?.includes("not enabled")
              ? "Anonymous sign-in is not enabled. Enable it in your Supabase Dashboard under Authentication → Settings."
              : authError?.message ?? "Sign-in failed. Please try again."
          );
          setStatus("error");
        }
        return;
      }

      // Step 2 — seed the curated library
      setStatus("seeding");
      const seedRes = await fetch("/api/seed-guest", { method: "POST" });
      if (!seedRes.ok && !cancelled) {
        // Non-fatal — still go to library; the user just won't have books pre-loaded
        console.warn("Guest seeding failed:", await seedRes.text());
      }

      if (!cancelled) router.push("/library");
    }

    startGuestSession();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg-primary)] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-subtle)]">
        <BookOpen size={24} className="text-[var(--color-accent)]" />
      </div>

      {status === "error" ? (
        <>
          <h1 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
            Couldn&apos;t start guest session
          </h1>
          <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{errorMsg}</p>
          <a
            href="/"
            className="rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Back to home
          </a>
        </>
      ) : (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {status === "seeding"
              ? "Setting up your library…"
              : "Starting guest session…"}
          </p>
        </>
      )}
    </main>
  );
}

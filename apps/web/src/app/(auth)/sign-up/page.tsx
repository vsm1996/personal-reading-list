"use client";

import { createClient } from "@/lib/supabase/client";
import { getBaseUrl } from "@/lib/urls";
import Link from "next/link";
import { useState } from "react";

type State = "idle" | "loading" | "success";

export default function SignUpPage() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After email confirmation, land on the library
        emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/library`,
      },
    });

    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }

    setState("success");
  }

  if (state === "success") {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-subtle)]">
          <svg
            className="h-6 w-6 text-[var(--color-accent)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 font-heading text-xl font-semibold text-[var(--color-text-primary)]">
          Check your email
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          We sent you a confirmation link. Click it to activate your account and
          start building your library.
        </p>
        <p className="mt-6 text-xs text-[var(--color-text-tertiary)]">
          Already confirmed?{" "}
          <Link
            href="/sign-in"
            className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-md">
      <h2 className="mb-6 font-heading text-xl font-semibold text-[var(--color-text-primary)]">
        Create an account
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Minimum 8 characters
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "loading"}
          className="w-full rounded-md bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {state === "loading" ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-tertiary)]">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

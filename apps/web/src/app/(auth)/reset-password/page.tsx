"use client";

import { createClient } from "@/lib/supabase/client";
import { getBaseUrl } from "@/lib/urls";
import Link from "next/link";
import { useState } from "react";

type State = "idle" | "loading" | "success";

export default function ResetPasswordPage() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError(null);

    const email = (
      (e.currentTarget).elements.namedItem("email") as HTMLInputElement
    ).value;

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBaseUrl()}/auth/callback?next=/auth/update-password`,
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
      <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle">
          <svg
            className="h-6 w-6 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="mb-2 font-heading text-xl font-semibold text-text-primary">
          Check your email
        </h2>
        <p className="text-sm text-text-secondary">
          If that address is registered, you&apos;ll receive a reset link shortly.
        </p>
        <p className="mt-6 text-xs text-text-tertiary">
          <Link
            href="/sign-in"
            className="text-accent hover:text-accent-hover"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-8 shadow-md">
      <h2 className="mb-2 font-heading text-xl font-semibold text-text-primary">
        Reset password
      </h2>
      <p className="mb-6 text-sm text-text-secondary">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "loading"}
          className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {state === "loading" ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-tertiary">
        <Link
          href="/sign-in"
          className="text-accent hover:text-accent-hover"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

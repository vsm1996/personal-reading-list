"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-primary)] px-6 text-center">
      <p className="font-heading text-5xl font-bold text-[var(--color-error)] opacity-30">
        Oops
      </p>
      <h1 className="mt-4 font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
        An unexpected error occurred. Your data is safe — please try again.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-[var(--color-text-tertiary)]">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-8 rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        Try again
      </button>
    </main>
  );
}

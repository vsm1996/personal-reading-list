import Link from "next/link";

// Landing page — static, no auth required.
// Core requirement #9: hero, feature highlights, dual CTAs, visual showcase.
// TODO: replace placeholder content with full landing page design.

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[var(--container-page)] px-6 py-20">
        <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)]">
          Your reading life,<br />beautifully organized.
        </h1>
        <p className="mt-4 text-base text-[var(--color-text-secondary)]">
          Track books, build shelves, set goals, and explore your year in reading.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/sign-up"
            className="rounded-md bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Sign Up
          </Link>
          <Link
            href="/guest"
            className="rounded-md border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            Try as Guest
          </Link>
        </div>
      </div>
    </main>
  );
}

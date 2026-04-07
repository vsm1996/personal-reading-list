import Link from "next/link";
import { BookOpen, Target, Search, Layers } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/data/user";
import { redirect } from "next/navigation";

// Landing page — redirects authenticated users straight to /library.
// Designed around the earth palette and Lora/Inter type pairing.

export default async function LandingPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect("/library");
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg-primary/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[var(--container-page)] items-center justify-between px-6 py-4">
          <span className="font-heading text-lg font-semibold text-text-primary">
            Bookshelf
          </span>
          <nav aria-label="Site">
            <ul className="flex items-center gap-2 list-none">
              <li>
                <Link
                  href="/sign-in"
                  className="rounded-md px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
                >
                  Get started
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[var(--container-page)] px-6 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="hero-slide mb-4 text-sm font-medium tracking-widest text-accent uppercase" style={{ animationDelay: "var(--renge-duration-0)" }}>
                Personal Reading Tracker
              </p>
              <h1 className="hero-slide font-heading text-4xl font-bold leading-tight text-text-primary lg:text-5xl" style={{ animationDelay: "var(--renge-duration-1)" }}>
                Your reading life,
                <br />
                <span className="text-accent">beautifully</span> organized.
              </h1>
              <p className="hero-slide mt-5 max-w-md text-base leading-relaxed text-text-secondary" style={{ animationDelay: "var(--renge-duration-2)" }}>
                Search millions of books, build your personal shelves, track your progress,
                and hit your annual reading goal — all in one quiet, focused space.
              </p>
              <div className="hero-slide mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "var(--renge-duration-3)" }}>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
                >
                  Start for free
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
                >
                  Sign in
                </Link>
                <Link
                  href="/guest"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Try as guest →
                </Link>
              </div>
            </div>

            {/* Decorative book-spine illustration */}
            <div
              className="hidden lg:flex justify-center"
              aria-hidden
            >
              <BookSpineIllustration />
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section className="border-t border-border bg-bg-secondary">
          <div className="mx-auto max-w-[var(--container-page)] px-6 py-16">
            <h2 className="mb-10 text-center font-heading text-2xl font-semibold text-text-primary">
              Everything your reading life needs
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 list-none">
              <li>
                <FeatureCard
                  icon={<Search size={20} />}
                  title="Search millions of books"
                  body="Instantly find any book via Open Library. Missing covers, incomplete metadata — handled gracefully."
                />
              </li>
              <li>
                <FeatureCard
                  icon={<Layers size={20} />}
                  title="Organize your shelves"
                  body="Want to Read, Currently Reading, Read — plus unlimited custom shelves for any mood or genre."
                />
              </li>
              <li>
                <FeatureCard
                  icon={<BookOpen size={20} />}
                  title="Track your progress"
                  body="Log your current page and watch the progress bar fill up. Reach 100% and your book moves to Read automatically."
                />
              </li>
              <li>
                <FeatureCard
                  icon={<Target size={20} />}
                  title="Hit your reading goal"
                  body="Set an annual goal, see your pace, and celebrate every book that brings you closer to it."
                />
              </li>
            </ul>
          </div>
        </section>

        {/* ── Quote / ethos ─────────────────────────────────────────────────── */}
        <section className="page-enter mx-auto max-w-[var(--container-content)] px-6 py-20 text-center">
          <blockquote>
            <p className="font-heading text-xl font-medium leading-relaxed text-text-primary lg:text-2xl">
              &ldquo;A room without books is like a body without a soul.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-text-tertiary">
              Marcus Tullius Cicero
            </footer>
          </blockquote>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="border-t border-border bg-bg-secondary">
          <div className="mx-auto max-w-[var(--container-content)] px-6 py-16 text-center">
            <h2 className="font-heading text-2xl font-semibold text-text-primary">
              Ready to start your reading journey?
            </h2>
            <p className="mt-3 text-sm text-text-secondary">
              Free to use. No social feed. No algorithms. Just your books.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
              >
                Create your library
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-primary"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-text-tertiary">
        Built with Next.js · Book data from{" "}
        <a
          href="https://openlibrary.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-text-primary"
        >
          Open Library
        </a>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-primary p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-subtle text-accent">
        {icon}
      </div>
      <h3 className="mb-2 font-heading text-sm font-semibold text-text-primary">
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}

/**
 * Decorative stacked book-spine illustration built from CSS.
 * Uses earth-palette hues pulled from the Renge token values.
 */
function BookSpineIllustration() {
  const spines = [
    { h: 220, w: 32, color: "var(--color-accent)",       label: "A" },
    { h: 180, w: 28, color: "oklch(52% 0.07 58)",        label: "B" },  // fg-muted earth (no token)
    { h: 240, w: 36, color: "oklch(40% 0.1 30)",         label: "C" },  // bark brown (no token)
    { h: 200, w: 30, color: "oklch(60% 0.16 40)",        label: "D" },  // earthy ochre (no token)
    { h: 260, w: 34, color: "oklch(35% 0.12 30)",        label: "E" },  // chocolate (no token)
    { h: 190, w: 28, color: "oklch(55% 0.12 90)",        label: "F" },  // olive green (no token)
    { h: 230, w: 32, color: "var(--color-accent-hover)", label: "G" },
  ];

  return (
    <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-bg-secondary p-8 shadow-lg">
      {spines.map((s, i) => (
        <div
          key={i}
          className="spine-rise flex shrink-0 items-center justify-center rounded-sm shadow-book"
          style={{
            height: s.h,
            width: s.w,
            backgroundColor: s.color,
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            animationDelay: `${i * 60}ms`,
          }}
          aria-hidden
        >
          <span
            className="select-none font-heading text-[9px] font-semibold tracking-widest opacity-30"
            style={{ color: "white" }}
          >
            {s.label.repeat(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

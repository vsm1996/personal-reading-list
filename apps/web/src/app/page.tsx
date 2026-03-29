import Link from "next/link";
import { BookOpen, Target, Search, Layers } from "lucide-react";

// Static landing page — no auth, no data fetching.
// Designed around the earth palette and Lora/Inter type pairing.

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[var(--container-page)] items-center justify-between px-6 py-4">
          <span className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
            Bookshelf
          </span>
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-md px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[var(--container-page)] px-6 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-medium tracking-widest text-[var(--color-accent)] uppercase">
                Personal Reading Tracker
              </p>
              <h1 className="font-heading text-4xl font-bold leading-tight text-[var(--color-text-primary)] lg:text-5xl">
                Your reading life,
                <br />
                <span className="text-[var(--color-accent)]">beautifully</span> organized.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-text-secondary)]">
                Search millions of books, build your personal shelves, track your progress,
                and hit your annual reading goal — all in one quiet, focused space.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="rounded-md bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  Start for free
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-md border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  Sign in
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
        <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="mx-auto max-w-[var(--container-page)] px-6 py-16">
            <h2 className="mb-10 text-center font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
              Everything your reading life needs
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Search size={20} />}
                title="Search millions of books"
                body="Instantly find any book via Open Library. Missing covers, incomplete metadata — handled gracefully."
              />
              <FeatureCard
                icon={<Layers size={20} />}
                title="Organize your shelves"
                body="Want to Read, Currently Reading, Read — plus unlimited custom shelves for any mood or genre."
              />
              <FeatureCard
                icon={<BookOpen size={20} />}
                title="Track your progress"
                body="Log your current page and watch the progress bar fill up. Reach 100% and your book moves to Read automatically."
              />
              <FeatureCard
                icon={<Target size={20} />}
                title="Hit your reading goal"
                body="Set an annual goal, see your pace, and celebrate every book that brings you closer to it."
              />
            </div>
          </div>
        </section>

        {/* ── Quote / ethos ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[var(--container-content)] px-6 py-20 text-center">
          <blockquote>
            <p className="font-heading text-xl font-medium leading-relaxed text-[var(--color-text-primary)] lg:text-2xl">
              &ldquo;A room without books is like a body without a soul.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-[var(--color-text-tertiary)]">
              Marcus Tullius Cicero
            </footer>
          </blockquote>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="mx-auto max-w-[var(--container-content)] px-6 py-16 text-center">
            <h2 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
              Ready to start your reading journey?
            </h2>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              Free to use. No social feed. No algorithms. Just your books.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-md bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Create your library
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-primary)]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] px-6 py-6 text-center text-xs text-[var(--color-text-tertiary)]">
        Built with Next.js · Book data from{" "}
        <a
          href="https://openlibrary.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[var(--color-text-primary)]"
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
        {icon}
      </div>
      <h3 className="mb-2 font-heading text-sm font-semibold text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
    </div>
  );
}

/**
 * Decorative stacked book-spine illustration built from CSS.
 * Uses earth-palette hues pulled from the Renge token values.
 */
function BookSpineIllustration() {
  const spines = [
    { h: 220, w: 32, color: "oklch(46% 0.16 58)",  label: "A" },  // accent
    { h: 180, w: 28, color: "oklch(52% 0.07 58)",  label: "B" },  // fg-muted
    { h: 240, w: 36, color: "oklch(40% 0.1 30)",   label: "C" },  // bark brown
    { h: 200, w: 30, color: "oklch(60% 0.16 40)",  label: "D" },  // earthy ochre
    { h: 260, w: 34, color: "oklch(35% 0.12 30)",  label: "E" },  // chocolate
    { h: 190, w: 28, color: "oklch(55% 0.12 90)",  label: "F" },  // olive green
    { h: 230, w: 32, color: "oklch(38% 0.18 55)",  label: "G" },  // accent-hover
  ];

  return (
    <div className="flex items-end gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 shadow-[var(--shadow-lg)]">
      {spines.map((s, i) => (
        <div
          key={i}
          className="flex shrink-0 items-center justify-center rounded-sm shadow-[var(--shadow-book)]"
          style={{
            height: s.h,
            width: s.w,
            backgroundColor: s.color,
            writingMode: "vertical-rl",
            textOrientation: "mixed",
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

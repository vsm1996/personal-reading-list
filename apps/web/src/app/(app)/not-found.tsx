import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
        <BookOpen size={24} className="text-[var(--color-text-tertiary)]" />
      </div>
      <h1 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
        Not found
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        This book or shelf doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/library"
        className="mt-6 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        Back to Library
      </Link>
    </div>
  );
}

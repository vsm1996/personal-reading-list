import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center">
      <p className="font-heading text-7xl font-bold text-accent opacity-30">
        404
      </p>
      <h1 className="mt-4 font-heading text-2xl font-semibold text-text-primary">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
      >
        Go home
      </Link>
    </main>
  );
}

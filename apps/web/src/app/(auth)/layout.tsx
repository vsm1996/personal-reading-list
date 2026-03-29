// Auth layout — centered, minimal, no sidebar.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
            Bookshelf
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}

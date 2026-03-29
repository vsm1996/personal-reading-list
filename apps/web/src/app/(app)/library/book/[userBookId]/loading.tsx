export default function BookDetailLoading() {
  return (
    <div className="mx-auto max-w-[var(--container-library)] animate-pulse px-6 py-8">
      {/* Back link */}
      <div className="mb-6 h-4 w-24 rounded bg-[var(--color-bg-tertiary)]" />

      <div className="grid gap-10 lg:grid-cols-[auto_1fr_320px]">
        {/* Cover */}
        <div className="mx-auto h-[240px] w-40 rounded bg-[var(--color-bg-tertiary)] lg:mx-0" />

        {/* Metadata */}
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded bg-[var(--color-bg-tertiary)]" />
          <div className="h-5 w-1/2 rounded bg-[var(--color-bg-tertiary)]" />
          <div className="h-4 w-1/3 rounded bg-[var(--color-bg-tertiary)]" />
          <div className="mt-6 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 rounded bg-[var(--color-bg-tertiary)]" style={{ width: `${90 - i * 8}%` }} />
            ))}
          </div>
        </div>

        {/* Panel */}
        <div className="h-[480px] rounded-xl bg-[var(--color-bg-tertiary)]" />
      </div>
    </div>
  );
}

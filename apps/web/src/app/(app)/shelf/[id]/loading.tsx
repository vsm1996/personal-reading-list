/**
 * Skeleton screen for the shelf detail page.
 * Shown by Next.js while the async Server Component resolves.
 */
export default function ShelfDetailLoading() {
  return (
    <div className="mx-auto max-w-[var(--container-library)] animate-pulse px-6 py-8">
      {/* Back link skeleton */}
      <div className="mb-6 h-4 w-16 rounded bg-bg-tertiary" />

      {/* Header skeleton */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-bg-tertiary" />
          <div className="h-4 w-20 rounded bg-bg-tertiary" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-24 rounded-md bg-bg-tertiary" />
          ))}
        </div>
      </div>

      {/* Book grid skeleton */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i}>
            <div className="aspect-[2/3] w-full rounded bg-bg-tertiary" />
            <div className="mt-2 space-y-1.5">
              <div className="h-3 w-full rounded bg-bg-tertiary" />
              <div className="h-3 w-2/3 rounded bg-bg-tertiary" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

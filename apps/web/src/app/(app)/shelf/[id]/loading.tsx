/**
 * Skeleton screen for the shelf detail page.
 * Mirrors the exact DOM structure and sizes of the loaded page so there
 * is no layout shift when the server component resolves.
 *
 * Key constraint: BookCover size="md" renders at w-full h-[120px] (not
 * aspect-ratio based), so the skeleton placeholder must match that height.
 */
export default function ShelfDetailLoading() {
  return (
    <div className="mx-auto max-w-[var(--container-library)] animate-pulse px-6 py-8">
      {/* Back link skeleton — mirrors "← Library" */}
      <div className="mb-6 h-4 w-16 rounded bg-bg-tertiary" />

      {/* Header skeleton — mirrors flex-wrap items-center justify-between gap-4 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-[5px]">
          {/* shelf name (text-2xl font-heading) */}
          <div className="h-7 w-36 rounded bg-bg-tertiary" />
          {/* book count (text-sm mt-0.5) */}
          <div className="mt-0.5 h-4 w-16 rounded bg-bg-tertiary" />
        </div>

        {/* Sort controls — mirrors "Sort: [Recently added] [Title] [Rating]" */}
        <div className="flex items-center gap-1">
          <div className="h-4 w-7 rounded bg-bg-tertiary" /> {/* "Sort:" label */}
          {["w-28", "w-14", "w-16"].map((w, i) => (
            <div key={i} className={`h-7 ${w} rounded-md bg-bg-tertiary`} />
          ))}
        </div>
      </div>

      {/* Book grid — minmax(120px,1fr) gap-6, same as loaded page */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i}>
            {/* Cover — h-[120px] w-full matches BookCover size="md" w-full */}
            <div className="h-[120px] w-full rounded-sm bg-bg-tertiary" />

            {/* Progress bar slot — mirrors the 0.5px bar shown when percentage > 0 */}
            <div className="mt-1.5 h-0.5 w-3/4 rounded-full bg-bg-tertiary" />

            {/* Text block — mirrors mt-2 with title (2 lines), author, rating */}
            <div className="mt-2 space-y-1.5">
              <div className="h-3 w-full rounded bg-bg-tertiary" />
              <div className="h-3 w-4/5 rounded bg-bg-tertiary" />
              <div className="h-3 w-1/2 rounded bg-bg-tertiary" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

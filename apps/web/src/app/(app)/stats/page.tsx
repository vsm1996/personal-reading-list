import { getAuthenticatedUser } from "@/lib/data/user";
import {
  getReadingStats,
  getMonthlyReads,
  getRatingDistribution,
  getTopAuthors,
  getReadingHeatmap,
} from "@/lib/data/stats";
import { buildHeatmapGrid, heatmapColor } from "@/lib/heatmap";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Stats" };

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary px-5 py-4 text-center">
      <p className="font-heading text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-tertiary">{label}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
      {children}
    </h2>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  const year = new Date().getFullYear();

  const [stats, monthlyReads, ratingDist, topAuthors, heatmapData] =
    await Promise.all([
      getReadingStats(user.id),
      getMonthlyReads(user.id, year),
      getRatingDistribution(user.id),
      getTopAuthors(user.id),
      getReadingHeatmap(user.id),
    ]);

  // ── Bar chart dimensions ──
  const BAR_WIDTH = 28;
  const BAR_GAP = 6;
  const CHART_HEIGHT = 120;
  const maxMonthly = Math.max(...monthlyReads.map((m) => m.count), 1);

  // ── Rating chart dimensions ──
  const RATING_BAR_MAX_WIDTH = 200;
  const maxRating = Math.max(...ratingDist.map((r) => r.count), 1);

  // ── Heatmap ──
  const { weeks } = buildHeatmapGrid(heatmapData);

  return (
    <div className="page-enter mx-auto max-w-[var(--container-content)] px-6 py-8">
      <h1 className="mb-8 font-heading text-2xl font-semibold text-text-primary">
        Reading Stats
      </h1>

      {/* ── Summary cards ── */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Total Books" value={String(stats.totalBooks)} />
        <SummaryCard label="Books Read" value={String(stats.booksRead)} />
        <SummaryCard
          label="Pages Read"
          value={stats.totalPages.toLocaleString()}
        />
        <SummaryCard
          label="Avg Rating"
          value={stats.avgRating !== null ? `${stats.avgRating} ★` : "—"}
        />
        <SummaryCard
          label="Currently Reading"
          value={String(stats.currentlyReading)}
        />
      </div>

      {/* ── Monthly reads bar chart ── */}
      <section className="mb-10 rounded-xl border border-border bg-bg-secondary p-6">
        <SectionHeading>Monthly Reads — {year}</SectionHeading>
        <div className="overflow-x-auto">
          <svg
            width={(BAR_WIDTH + BAR_GAP) * 12 - BAR_GAP + 20}
            height={CHART_HEIGHT + 36}
            aria-label={`Monthly reads bar chart for ${year}`}
            role="img"
          >
            {monthlyReads.map((m, i) => {
              const barH = Math.round((m.count / maxMonthly) * CHART_HEIGHT);
              const x = i * (BAR_WIDTH + BAR_GAP) + 10;
              const y = CHART_HEIGHT - barH;
              return (
                <g key={m.month}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={BAR_WIDTH}
                    height={barH === 0 ? 2 : barH}
                    rx={4}
                    className="fill-accent opacity-80"
                  >
                    <title>{`${MONTH_LABELS[m.month - 1]}: ${m.count} book${m.count !== 1 ? "s" : ""}`}</title>
                  </rect>
                  {/* Month label */}
                  <text
                    x={x + BAR_WIDTH / 2}
                    y={CHART_HEIGHT + 18}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-text-tertiary"
                  >
                    {MONTH_LABELS[m.month - 1]}
                  </text>
                  {/* Count label above bar (only if > 0) */}
                  {m.count > 0 && (
                    <text
                      x={x + BAR_WIDTH / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize={10}
                      className="fill-text-secondary"
                    >
                      {m.count}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* ── Rating distribution ── */}
      <section className="mb-10 rounded-xl border border-border bg-bg-secondary p-6">
        <SectionHeading>Rating Distribution</SectionHeading>
        <svg
          width={RATING_BAR_MAX_WIDTH + 120}
          height={ratingDist.length * 32}
          aria-label="Rating distribution horizontal bar chart"
          role="img"
        >
          {[...ratingDist].reverse().map((r, i) => {
            const barW = Math.round((r.count / maxRating) * RATING_BAR_MAX_WIDTH);
            const y = i * 32 + 6;
            const stars = "★".repeat(r.stars) + "☆".repeat(5 - r.stars);
            return (
              <g key={r.stars}>
                {/* Star label */}
                <text
                  x={0}
                  y={y + 13}
                  fontSize={12}
                  className="fill-text-secondary"
                >
                  {stars}
                </text>
                {/* Bar */}
                <rect
                  x={80}
                  y={y}
                  width={barW === 0 ? 2 : barW}
                  height={18}
                  rx={4}
                  className="fill-accent opacity-80"
                >
                  <title>{`${r.stars} star${r.stars !== 1 ? "s" : ""}: ${r.count} book${r.count !== 1 ? "s" : ""}`}</title>
                </rect>
                {/* Count */}
                <text
                  x={80 + (barW === 0 ? 2 : barW) + 8}
                  y={y + 13}
                  fontSize={11}
                  className="fill-text-tertiary"
                >
                  {r.count}
                </text>
              </g>
            );
          })}
        </svg>
      </section>

      {/* ── Two-column: Top Authors + Heatmap ── */}
      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        {/* Top Authors */}
        <section className="rounded-xl border border-border bg-bg-secondary p-6">
          <SectionHeading>Top Authors</SectionHeading>
          {topAuthors.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              No finished books yet.
            </p>
          ) : (
            <ol className="space-y-2">
              {topAuthors.map((a, idx) => (
                <li
                  key={a.author}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 shrink-0 text-right text-xs text-text-tertiary">
                      {idx + 1}.
                    </span>
                    <span className="truncate text-sm text-text-primary">
                      {a.author}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary">
                    {a.count} {a.count === 1 ? "book" : "books"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Reading Heatmap */}
        <section className="rounded-xl border border-border bg-bg-secondary p-6">
          <SectionHeading>Reading Activity</SectionHeading>
          <p className="mb-3 text-xs text-text-tertiary">
            Last 52 weeks — each cell is a day, colour shows progress entries logged.
          </p>
          {/* Scrollable container so it doesn't overflow on small screens */}
          <div className="overflow-x-auto">
            <div
              className="flex gap-[3px]"
              style={{ width: `${weeks.length * 13}px` }}
              aria-label="Reading activity heatmap"
            >
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      title={`${cell.date}: ${cell.count} entr${cell.count === 1 ? "y" : "ies"}`}
                      className={`h-[10px] w-[10px] rounded-[2px] ${heatmapColor(cell.count)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
            <span>Less</span>
            <div className="h-[10px] w-[10px] rounded-[2px] bg-bg-tertiary" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-accent/20" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-accent/50" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-accent" />
            <span>More</span>
          </div>
        </section>
      </div>
    </div>
  );
}

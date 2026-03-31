/**
 * Reading activity heatmap utilities.
 *
 * Pure functions — no React, no server dependencies. Rendered server-side in
 * the Stats page but intentionally kept framework-agnostic so they can be
 * unit-tested without any Next.js or DOM context.
 */

export type HeatmapCell = { day: number; date: string; count: number };
export type HeatmapWeek = HeatmapCell[];

/**
 * Build a 52-column × 7-row heatmap grid aligned to Sunday weeks,
 * ending on the most recent Sunday on or before today.
 *
 * @param data - Array of `{ date: "YYYY-MM-DD", count: number }` entries from
 *               the database. Dates outside the 52-week window are silently
 *               ignored. Each date should appear at most once; if duplicates
 *               exist, the last entry wins.
 *
 * The grid is stored in column-major order: `weeks[col][row]` where
 * `col` 0 is the oldest week and `col` 51 is the most recent. Within each
 * column, `row` 0 is Sunday and `row` 6 is Saturday.
 *
 * `cell.day` is the 0-indexed day of the week (0 = Sunday, 6 = Saturday).
 * `cell.date` is an ISO date string (`YYYY-MM-DD`).
 * `cell.count` is the number of progress entries logged on that day (0 if none).
 */
export function buildHeatmapGrid(
  data: { date: string; count: number }[],
): { weeks: HeatmapWeek[] } {
  const countMap: Record<string, number> = {};
  for (const { date, count } of data) {
    countMap[date] = count;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const mostRecentSunday = new Date(today);
  mostRecentSunday.setDate(today.getDate() - dayOfWeek);

  const weeks: HeatmapWeek[] = [];
  for (let col = 51; col >= 0; col--) {
    const week: HeatmapCell[] = [];
    for (let row = 0; row < 7; row++) {
      const d = new Date(mostRecentSunday);
      d.setDate(mostRecentSunday.getDate() - col * 7 + row);
      const key = d.toISOString().slice(0, 10);
      week.push({ day: row, date: key, count: countMap[key] ?? 0 });
    }
    weeks.push(week);
  }

  return { weeks };
}

/**
 * Returns a Tailwind class string for a heatmap cell based on its activity count.
 *
 * Thresholds:
 *   0       → muted background (no activity)
 *   1 – 2   → 20% accent opacity (low activity)
 *   3 – 5   → 50% accent opacity (medium activity)
 *   6+      → full accent colour (high activity)
 *
 * Classes use CSS variable references so they automatically adapt to light/dark
 * theme changes without any client-side JavaScript.
 */
export function heatmapColor(count: number): string {
  if (count === 0) return "bg-bg-tertiary";
  if (count <= 2)  return "bg-accent/20";
  if (count <= 5)  return "bg-accent/50";
  return "bg-accent";
}

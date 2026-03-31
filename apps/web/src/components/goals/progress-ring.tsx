/**
 * SVG progress ring — server-rendered, zero JS.
 * Displays a circular progress indicator with a centred count/total label.
 */

type Props = {
  pct: number;
  booksRead: number;
  targetCount: number;
};

export function ProgressRing({ pct, booksRead, targetCount }: Props) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        className="-rotate-90"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx="80" cy="80" r={r}
          fill="none" strokeWidth="10"
          className="stroke-bg-tertiary"
        />
        {/* Progress arc */}
        <circle
          cx="80" cy="80" r={r}
          fill="none" strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="stroke-accent"
          style={{ transition: `stroke-dasharray var(--renge-duration-4) var(--renge-easing-ease-out)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading text-3xl font-bold text-text-primary">
          {booksRead}
        </span>
        <span className="text-xs text-text-tertiary">
          of {targetCount}
        </span>
      </div>
    </div>
  );
}

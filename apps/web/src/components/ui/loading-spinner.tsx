type Props = {
  size?: "sm" | "md";
  className?: string;
};

const sizes = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-6 w-6 border-2",
};

/** Animated circular spinner using Renge border tokens. */
export function LoadingSpinner({ size = "md", className = "" }: Props) {
  return (
    <div
      aria-label="Loading"
      className={`animate-spin rounded-full border-border border-t-[var(--color-accent)] ${sizes[size]} ${className}`}
    />
  );
}

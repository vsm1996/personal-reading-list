import Link from "next/link";

type Props = { isAnonymous: boolean };

/**
 * Persistent top banner shown to anonymous (guest) users.
 * Reminds them their data is session-only and prompts sign-up.
 */
export function GuestBanner({ isAnonymous }: Props) {
  if (!isAnonymous) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-accent px-4 py-2.5 text-center text-sm text-text-on-accent">
      <span>You&apos;re browsing as a guest — your library won&apos;t be saved.</span>
      <Link
        href="/sign-up"
        className="shrink-0 rounded-md border border-text-on-accent/40 px-3 py-1 text-xs font-semibold text-text-on-accent transition-colors hover:bg-text-on-accent/10"
      >
        Create account →
      </Link>
    </div>
  );
}

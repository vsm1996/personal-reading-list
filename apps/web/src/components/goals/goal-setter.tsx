"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  year: number;
  currentTarget: number | null;
};

const PRESETS = [12, 24, 36, 52];

export function GoalSetter({ year, currentTarget }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState(String(currentTarget ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(target, 10);
    if (!Number.isFinite(n) || n < 1) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, targetCount: n }),
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Failed to save goal.");
    } else {
      setSaved(true);
      router.refresh(); // re-fetch goal progress on the server
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Quick-pick presets */}
      <div className="mb-3 flex flex-wrap gap-2">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setTarget(String(n))}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              target === String(n)
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            {n} books
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]">
          <input
            type="number"
            min={1}
            max={9999}
            value={target}
            onChange={(e) => { setTarget(e.target.value); setSaved(false); }}
            placeholder="e.g. 24"
            className="w-full bg-transparent py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            aria-label="Number of books"
          />
          <span className="shrink-0 text-sm text-[var(--color-text-tertiary)]">books</span>
        </div>

        <button
          type="submit"
          disabled={saving || !target.trim()}
          className="shrink-0 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
      {saved && (
        <p className="mt-2 text-xs text-[var(--color-success)]">Goal saved!</p>
      )}
    </form>
  );
}

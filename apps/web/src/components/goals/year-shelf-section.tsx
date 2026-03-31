"use client";

import { useState } from "react";
import { YearBooksModal } from "./year-books-modal";

type YearEntry = { year: number; count: number };

type Props = {
  years: YearEntry[];
};

export function YearShelfSection({ years }: Props) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  return (
    <>
      <div>
        <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
          Past Years
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {years.map(({ year, count }) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className="rounded-xl border border-border bg-bg-secondary px-4 py-5 text-left transition-colors hover:border-accent hover:bg-accent/5"
            >
              <p className="font-heading text-xl font-bold text-text-primary">{year}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {count} book{count !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      </div>

      {selectedYear !== null && (
        <YearBooksModal
          year={selectedYear}
          onClose={() => setSelectedYear(null)}
        />
      )}
    </>
  );
}

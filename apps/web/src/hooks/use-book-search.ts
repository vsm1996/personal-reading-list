/**
 * Debounced book search hook.
 *
 * Encapsulates all search state so the UI only reacts to { results, loading, error }.
 *
 * Correctness guarantees:
 *  - AbortController cancels in-flight requests on every new keystroke, preventing
 *    a slow earlier response from overwriting a faster later one.
 *  - The debounce timer is cleared on query change and on unmount.
 *  - AbortError is swallowed — it signals cancellation, not a real failure.
 */

import type { BookSearchResult } from "@/types/search";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export type BookSearchState = {
  results: BookSearchResult[];
  loading: boolean;
  /** Human-readable message for errors or empty results; null when healthy. */
  error: string | null;
};

export function useBookSearch(query: string): BookSearchState {
  const [state, setState] = useState<BookSearchState>({
    results: [],
    loading: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim() || query.length < MIN_QUERY_LENGTH) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    // Show spinner immediately during the debounce window
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const timeout = setTimeout(async () => {
      // Cancel any previous in-flight request before starting a new one
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        const data = (await res.json()) as {
          results?: BookSearchResult[];
          error?: string;
        };

        if (!res.ok || data.error) {
          setState({ results: [], loading: false, error: data.error ?? "Search failed. Please try again." });
          return;
        }

        const results = data.results ?? [];
        setState({
          results,
          loading: false,
          error:
            results.length === 0
              ? `No books found for "${query}". Try a different title or check the spelling.`
              : null,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ results: [], loading: false, error: "Could not reach the search API. Check your connection." });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      abortRef.current?.abort();
    };
  }, [query]);

  return state;
}

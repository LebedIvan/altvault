"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { clsx } from "clsx";

export interface Suggestion {
  /** Displayed in dropdown */
  label: string;
  /** Filled into the main field on select */
  value: string;
  /** Filled into externalId on select (if different from value) */
  externalId?: string;
  /** Filled into currentPriceCents on select */
  priceCents?: number | null;
  /** Secondary text shown in dropdown (price, type, etc.) */
  meta?: string;
  /** Small image shown in dropdown */
  iconUrl?: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: Suggestion) => void;
  /** Either a static list or an async fetch function */
  suggestions?: Suggestion[];
  fetchSuggestions?: (query: string) => Promise<Suggestion[]>;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions: staticSuggestions,
  fetchSuggestions,
  placeholder,
  className,
  debounceMs = 300,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter static suggestions
  useEffect(() => {
    if (!staticSuggestions) return;
    const q = value.toLowerCase();
    setItems(
      q.length < 1
        ? []
        : staticSuggestions
            .filter(
              (s) =>
                s.label.toLowerCase().includes(q) ||
                s.value.toLowerCase().includes(q),
            )
            .slice(0, 10),
    );
  }, [value, staticSuggestions]);

  // Debounced async fetch
  const runFetch = useCallback(
    (q: string) => {
      if (!fetchSuggestions || q.length < 2) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          const results = await fetchSuggestions(q);
          setItems(results);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [fetchSuggestions, debounceMs],
  );

  useEffect(() => {
    if (fetchSuggestions) runFetch(value);
  }, [value, fetchSuggestions, runFetch]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) pick(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function pick(item: Suggestion) {
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  }

  const showDropdown = open && (loading || items.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={clsx(
            "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white",
            "placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500",
            loading && "pr-8",
            className,
          )}
        />
        {loading && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs animate-spin">
            ↻
          </span>
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {loading && items.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Поиск...</li>
          )}
          {items.map((item, i) => (
            <li
              key={i}
              onMouseDown={() => pick(item)}
              onMouseEnter={() => setActiveIndex(i)}
              className={clsx(
                "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                i === activeIndex
                  ? "bg-sky-600/20 text-white"
                  : "text-slate-300 hover:bg-slate-800",
              )}
            >
              {item.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.iconUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded object-contain"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.label}</p>
                {item.meta && (
                  <p className="truncate text-xs text-slate-500">{item.meta}</p>
                )}
              </div>
              {item.priceCents != null && (
                <span className="shrink-0 text-xs font-semibold text-emerald-400">
                  {(item.priceCents / 100).toFixed(2)} €
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

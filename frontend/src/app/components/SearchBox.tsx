"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, describeError, formatValue } from "../../lib/api";
import styles from "./SearchBox.module.css";

export interface SearchSuggestion {
  id: number;
  display_name: string;
  formula?: string | null;
  external_id?: string | null;
  molecular_weight?: number | null;
}

interface SearchBoxProps {
  id: string;
  label: string;
  placeholder?: string;
  /** Called on submit or when a suggestion is chosen. */
  onSearch: (term: string) => void;
  /** When provided, suggestions include an "add" action. */
  onSelect?: (molecule: SearchSuggestion) => void;
  isSelected?: (id: number) => boolean;
  /** Overrides the "Clear" action label. */
  submitLabel?: string;
  autoFocus?: boolean;
  maxSuggestions?: number;
  /** Pre-fills the field (e.g. when restoring state from the URL). */
  initialValue?: string;
}

const DEBOUNCE_MS = 180;

export default function SearchBox({
  id,
  label,
  placeholder,
  onSearch,
  onSelect,
  isSelected,
  submitLabel = "Search",
  autoFocus = false,
  maxSuggestions = 8,
  initialValue = "",
}: SearchBoxProps) {
  const [term, setTerm] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchedTerm, setSearchedTerm] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmed = term.trim();
  const canSuggest = trimmed.length >= 2;

  // Live suggestions while typing (debounced). Each effect run owns its fetch via
  // a cancellation flag, so overlapping keystrokes can never leave the loading
  // indicator stuck or apply stale results.
  useEffect(() => {
    if (!canSuggest) {
      // Scheduled asynchronously so the effect never sets state synchronously.
      const clear = setTimeout(() => {
        setSuggestions([]);
        setError(null);
        setLoading(false);
        setActiveIndex(-1);
      }, 0);
      return () => clearTimeout(clear);
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!cancelled) setLoading(true);
      try {
        const response = await api.molecules({ q: trimmed, page: 1, page_size: maxSuggestions });
        if (cancelled) return;
        setSuggestions(response.items.slice(0, maxSuggestions) as SearchSuggestion[]);
        setError(null);
        setActiveIndex(-1);
        setSearchedTerm(trimmed);
      } catch (err) {
        if (cancelled) return;
        setSuggestions([]);
        setError(describeError(err, "Search is unavailable."));
        setSearchedTerm(trimmed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canSuggest, trimmed, maxSuggestions]);

  // Close the dropdown when clicking outside. Typing re-opens it.
  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setHidden(true);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  const items = useMemo<SearchSuggestion[]>(
    () => suggestions,
    [suggestions],
  );

  const showList =
    !hidden &&
    canSuggest &&
    (loading || items.length > 0 || Boolean(error) || searchedTerm === trimmed);

  function closeList() {
    setHidden(true);
    setActiveIndex(-1);
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!trimmed) return;
    if (activeIndex >= 0 && items[activeIndex]) {
      choose(items[activeIndex]);
      return;
    }
    onSearch(trimmed);
    closeList();
  }

  function choose(suggestion: SearchSuggestion) {
    if (onSelect) {
      onSelect(suggestion);
      setTerm("");
    } else {
      // Pages without an add action (library, export) run the search for the
      // chosen molecule and keep its name visible in the field.
      setTerm(suggestion.display_name);
      onSearch(suggestion.display_name);
    }
    setSuggestions([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(items.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % Math.max(items.length, 1));
    } else if (event.key === "Escape") {
      closeList();
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <form className={styles.form} role="search" onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <div className={styles.inputRow}>
          <input
            id={id}
            ref={inputRef}
            type="search"
            aria-label={label}
            autoComplete="off"
            autoFocus={autoFocus}
            placeholder={placeholder}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setHidden(false);
            }}
            onKeyDown={handleKeyDown}
          />
          <button className={styles.submit} type="submit">
            {submitLabel}
          </button>
        </div>
      </form>

      {showList && (
        <ul className={styles.list} role="listbox" aria-label={`${label} suggestions`}>
          {loading && items.length === 0 && (
            <li className={styles.status} role="status">
              Searching…
            </li>
          )}
          {error && (
            <li className={styles.error} role="alert">
              {error}
            </li>
          )}
          {!loading && !error && items.length === 0 && (
            <li className={styles.status} role="status">
              No molecules match “{trimmed}”.
            </li>
          )}
          {items.map((suggestion, index) => {
            const selected = isSelected?.(suggestion.id) ?? false;
            return (
              <li
                key={suggestion.id}
                role="option"
                aria-selected={index === activeIndex}
                className={`${styles.option} ${index === activeIndex ? styles.active : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <button
                  type="button"
                  className={styles.optionButton}
                  disabled={selected}
                  onClick={() => choose(suggestion)}
                >
                  <span className={styles.optionLabel}>
                    <strong>{suggestion.display_name}</strong>
                    <span className={styles.optionMeta}>
                      {suggestion.formula || "no formula"} · MW{" "}
                      {suggestion.molecular_weight === null || suggestion.molecular_weight === undefined
                        ? "—"
                        : formatValue(suggestion.molecular_weight)}
                      {suggestion.external_id ? ` · ${suggestion.external_id}` : ""}
                    </span>
                  </span>
                  <span className={styles.optionAction} aria-hidden="true">
                    {selected ? "selected" : onSelect ? "add +" : "search →"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

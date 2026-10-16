"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, DESCRIPTOR_META, describeError, type Dataset, type Molecule } from "../../lib/api";
import { useOnMountLoad } from "../../lib/hooks";
import SearchBox from "../components/SearchBox";
import {
  BackLink,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  ValueCell,
} from "../components/states";
import styles from "../subpage.module.css";

const DESCRIPTORS = ["molecular_weight", "logp", "hbd", "hba", "tpsa"] as const;
const SORT_FIELDS = ["name", "molecular_weight", "logp", "hbd", "hba", "tpsa", "id"];
const PAGE_SIZE = 15;

/** Maps a descriptor key to the backend filter prefix (mw_min, logp_min, ...). */
function filterKey(descriptor: string, bound: "min" | "max"): string {
  const prefix = descriptor === "molecular_weight" ? "mw" : descriptor;
  return `${prefix}_${bound}`;
}

interface FilterState {
  mw_min: string;
  mw_max: string;
  logp_min: string;
  logp_max: string;
  hbd_min: string;
  hbd_max: string;
  hba_min: string;
  hba_max: string;
  tpsa_min: string;
  tpsa_max: string;
}

const EMPTY_FILTERS: FilterState = {
  mw_min: "",
  mw_max: "",
  logp_min: "",
  logp_max: "",
  hbd_min: "",
  hbd_max: "",
  hba_min: "",
  hba_max: "",
  tpsa_min: "",
  tpsa_max: "",
};

export default function LibraryPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetFilter, setDatasetFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: Molecule[]; total: number; pages: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const requestRef = useRef(0);

  useEffect(() => {
    api.datasets().then((response) => setDatasets(response.items)).catch(() => setDatasets([]));
  }, []);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        page_size: PAGE_SIZE,
        sort_by: sortBy,
        sort_order: sortOrder,
        dataset_id: datasetFilter || undefined,
        q: query || undefined,
      };
      for (const [key, value] of Object.entries(filters)) {
        if (value !== "") params[key] = value;
      }
      const response = await api.molecules(params);
      if (requestId === requestRef.current) setResult(response);
    } catch (err) {
      if (requestId === requestRef.current) {
        setError(describeError(err, "Unable to load molecules."));
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [datasetFilter, page, query, sortBy, sortOrder, filters]);

  useOnMountLoad(load);

  function updateFilter(key: keyof FilterState, value: string) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setQuery("");
    setDatasetFilter("");
    setSortBy("name");
    setSortOrder("asc");
    setPage(1);
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 4) return prev; // comparison supports 2–4 molecules
      return [...prev, id];
    });
  }

  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Molecular Library</h1>
        <p className={styles.subtitle}>
          Server-side search, descriptor filters, sorting, and pagination across{" "}
          {datasets.length > 0 ? `${datasets.map((d) => d.record_count).reduce((a, b) => a + b, 0)} records` : "the dataset"}.
          Select up to four molecules, then open the comparison page.
        </p>

        <section className={styles.section} aria-label="Search the library">
          <h2 className={styles.sectionTitle}>Search</h2>
          <div className={styles.card}>
            <SearchBox
              id="library-search"
              label="Name, SMILES, or external ID"
              placeholder="e.g. caffe — start typing for suggestions"
              submitLabel="Search"
              onSearch={(term) => {
                setPage(1);
                setQuery(term);
              }}
              onSelect={undefined}
            />
            <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
              Suggestions appear as you type (two characters minimum). Press Enter to run the full
              filtered search.
            </p>
          </div>

          <div className={styles.card} style={{ marginTop: "1rem" }}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="library-dataset">Dataset</label>
                <select
                  id="library-dataset"
                  value={datasetFilter}
                  onChange={(e) => {
                    setPage(1);
                    setDatasetFilter(e.target.value);
                  }}
                >
                  <option value="">All datasets</option>
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} ({dataset.record_count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={clearFilters}
                disabled={activeFilterCount === 0 && !query && !datasetFilter}
              >
                Reset all filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
              {query && (
                <span className={styles.hint}>
                  Showing results for “{query}”
                </span>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-label="Numeric descriptor filters">
          <h2 className={styles.sectionTitle}>Descriptor filters</h2>
          <div className={styles.card}>
            <div className={styles.fieldRow}>
              {DESCRIPTORS.map((descriptor) => (
                <div className={styles.field} key={descriptor}>
                  <label htmlFor={`${filterKey(descriptor, "min")}`}>
                    {DESCRIPTOR_META[descriptor].label} ({DESCRIPTOR_META[descriptor].unit})
                  </label>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <input
                      id={filterKey(descriptor, "min")}
                      type="number"
                      step="any"
                      placeholder="min"
                      value={filters[filterKey(descriptor, "min") as keyof FilterState]}
                      onChange={(e) =>
                        updateFilter(filterKey(descriptor, "min") as keyof FilterState, e.target.value)
                      }
                    />
                    <input
                      id={filterKey(descriptor, "max")}
                      aria-label={`${DESCRIPTOR_META[descriptor].label} maximum`}
                      type="number"
                      step="any"
                      placeholder="max"
                      value={filters[filterKey(descriptor, "max") as keyof FilterState]}
                      onChange={(e) =>
                        updateFilter(filterKey(descriptor, "max") as keyof FilterState, e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-label="Library results">
          <div className={styles.tableHeader}>
            <h2 className={styles.sectionTitle}>Results</h2>
            <div className={styles.field}>
              <label htmlFor="library-sort">Sort by</label>
              <select
                id="library-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ minWidth: "180px" }}
              >
                {SORT_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {field.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="library-order">Order</label>
              <select
                id="library-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {loading && <LoadingBlock label="Loading molecular records…" />}
          {error && (
            <>
              <ErrorBlock message={error} />
              <div className={styles.buttonRow}>
                <button className={styles.button} onClick={() => void load()}>
                  Try again
                </button>
              </div>
            </>
          )}

          {!loading && !error && result && result.items.length === 0 && (
            <EmptyBlock title="No molecules match the current filters.">
              Widen the descriptor range, clear the search term, or reset all filters.
            </EmptyBlock>
          )}

          {!loading && !error && result && result.items.length > 0 && (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className={styles.hint}>
                    {result.total} record{result.total === 1 ? "" : "s"} match · page {page} of{" "}
                    {result.pages}
                    {query ? ` · search “${query}”` : ""}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Compare</th>
                      <th scope="col">Name</th>
                      <th scope="col">Formula</th>
                      <th scope="col">MW (g/mol)</th>
                      <th scope="col">LogP</th>
                      <th scope="col">HBD</th>
                      <th scope="col">HBA</th>
                      <th scope="col">TPSA (Å²)</th>
                      <th scope="col">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((molecule) => (
                      <tr key={molecule.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(molecule.id)}
                            onChange={() => toggleSelected(molecule.id)}
                            aria-label={`Select ${molecule.display_name} for comparison`}
                          />
                        </td>
                        <td>
                          <strong>{molecule.display_name}</strong>
                          {molecule.external_id && (
                            <div className={styles.hint}>{molecule.external_id}</div>
                          )}
                        </td>
                        <td>{molecule.formula || "—"}</td>
                        <td>
                          <ValueCell value={molecule.molecular_weight} />
                        </td>
                        <td>
                          <ValueCell value={molecule.logp} />
                        </td>
                        <td>
                          <ValueCell value={molecule.hbd} />
                        </td>
                        <td>
                          <ValueCell value={molecule.hba} />
                        </td>
                        <td>
                          <ValueCell value={molecule.tpsa} />
                        </td>
                        <td>
                          <Link href={`/molecules/${molecule.id}`} className={styles.inlineLink}>
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ← Previous
                </button>
                <span className={styles.hint}>
                  Page {page} of {result.pages}
                </span>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= result.pages}
                >
                  Next →
                </button>
              </div>

              <div className={styles.selectionBar} role="region" aria-label="Comparison selection">
                <span>
                  {selected.length} selected (2–4 required) ·{" "}
                  {selected.length > 0 ? `ids: ${selected.join(", ")}` : "none"}
                </span>
                <div className={styles.buttonRow}>
                  <button className={styles.secondaryButton} onClick={() => setSelected([])}>
                    Clear selection
                  </button>
                  <Link
                    href={`/compare?ids=${selected.join(",")}`}
                    className={styles.button}
                    aria-disabled={selected.length < 2}
                    onClick={(event) => {
                      if (selected.length < 2) {
                        event.preventDefault();
                      }
                    }}
                    style={selected.length < 2 ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                  >
                    Compare {selected.length > 0 ? selected.length : ""} selected →
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

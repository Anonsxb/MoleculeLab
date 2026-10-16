"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, describeError, type Dataset } from "../../lib/api";
import { useOnMountLoad } from "../../lib/hooks";
import SearchBox from "../components/SearchBox";
import { BackLink, ErrorBlock, LoadingBlock } from "../components/states";
import styles from "../subpage.module.css";

interface FilterState {
  q: string;
  dataset_id: string;
  logp_min: string;
  logp_max: string;
  mw_min: string;
  mw_max: string;
  tpsa_max: string;
  hbd_min: string;
}

const EMPTY: FilterState = {
  q: "",
  dataset_id: "",
  logp_min: "",
  logp_max: "",
  mw_min: "",
  mw_max: "",
  tpsa_max: "",
  hbd_min: "",
};

interface ExportMeta {
  dataset_name: string;
  dataset_version: string;
  export_timestamp: string;
  app_version: string;
  rdkit_version: string;
  calculation_methodology: Record<string, string>;
  warnings: string[];
}

export default function ExportPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const [meta, setMeta] = useState<ExportMeta | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.datasets();
      setDatasets(list.items);
      setMeta(await api.exportMeta());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load export metadata.");
    }
  }, []);

  useOnMountLoad(load);

  // Live record count: updates automatically a moment after any filter changes,
  // so there is a single action on this page — downloading the CSV.
  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const params: Record<string, string | number | undefined> = { page: 1, page_size: 1 };
          for (const [key, value] of Object.entries(filters)) {
            if (value !== "") params[key] = value;
          }
          const response = await api.molecules(params);
          setPreviewCount(response.total);
          setError(null);
        } catch (err) {
          setError(describeError(err, "Unable to count matching records."));
        }
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [filters]);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {};
      for (const [key, value] of Object.entries(filters)) {
        if (value !== "") params[key] = value;
      }
      const url = api.exportCsv(params);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Export failed with HTTP ${response.status}.`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "moleculelab_export.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Reproducible Export</h1>
        <p className={styles.subtitle}>
          Export every record that matches the active filters. The CSV carries stable molecule IDs,
          original and canonical SMILES, calculated descriptors, and the RDKit version used — so the
          analysis behind it can be reproduced.
        </p>

        {error && <ErrorBlock message={error} />}

        <section className={styles.section} aria-label="Export filters">
          <h2 className={styles.sectionTitle}>Active filters</h2>
          <div className={styles.card}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <SearchBox
                  id="export-q"
                  label="Search term"
                  placeholder="e.g. caffe — start typing for suggestions"
                  submitLabel="Apply"
                  onSearch={(term) => setFilters({ ...filters, q: term })}
                />
                <p className={styles.hint} style={{ marginTop: "0.5rem" }}>
                  Choosing a suggestion or pressing Enter sets the search term; the record count
                  below updates automatically.
                </p>
              </div>
              <div className={styles.field}>
                <label htmlFor="export-dataset">Dataset</label>
                <select
                  id="export-dataset"
                  value={filters.dataset_id}
                  onChange={(event) => setFilters({ ...filters, dataset_id: event.target.value })}
                >
                  <option value="">All datasets</option>
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="export-logp-min">LogP minimum</label>
                <input
                  id="export-logp-min"
                  type="number"
                  step="any"
                  value={filters.logp_min}
                  onChange={(event) => setFilters({ ...filters, logp_min: event.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="export-logp-max">LogP maximum</label>
                <input
                  id="export-logp-max"
                  type="number"
                  step="any"
                  value={filters.logp_max}
                  onChange={(event) => setFilters({ ...filters, logp_max: event.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="export-mw-min">MW minimum (g/mol)</label>
                <input
                  id="export-mw-min"
                  type="number"
                  step="any"
                  value={filters.mw_min}
                  onChange={(event) => setFilters({ ...filters, mw_min: event.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="export-mw-max">MW maximum (g/mol)</label>
                <input
                  id="export-mw-max"
                  type="number"
                  step="any"
                  value={filters.mw_max}
                  onChange={(event) => setFilters({ ...filters, mw_max: event.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="export-tpsa-max">TPSA maximum (Å²)</label>
                <input
                  id="export-tpsa-max"
                  type="number"
                  step="any"
                  value={filters.tpsa_max}
                  onChange={(event) => setFilters({ ...filters, tpsa_max: event.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="export-hbd-min">HBD minimum</label>
                <input
                  id="export-hbd-min"
                  type="number"
                  step="1"
                  value={filters.hbd_min}
                  onChange={(event) => setFilters({ ...filters, hbd_min: event.target.value })}
                />
              </div>
            </div>
            <div className={styles.buttonRow}>
              <button className={styles.button} onClick={() => void download()} disabled={busy}>
                {busy ? "Preparing CSV…" : "Download filtered CSV"}
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setFilters(EMPTY);
                  setPreviewCount(null);
                }}
                disabled={activeFilterCount === 0}
              >
                Clear filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
            <p className={styles.hint} role="status" style={{ marginTop: "0.75rem" }}>
              {previewCount === null
                ? "Counting matching records…"
                : `${previewCount} record(s) will be included in the download.`}
            </p>
          </div>
        </section>

        <section className={styles.section} aria-label="Analysis provenance">
          <h2 className={styles.sectionTitle}>Analysis provenance</h2>
          {meta ? (
            <div className={styles.specsGrid}>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>Dataset scope</div>
                <div className={styles.specValue}>{meta.dataset_name}</div>
              </div>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>Export timestamp</div>
                <div className={styles.specValue}>{new Date(meta.export_timestamp).toLocaleString()}</div>
              </div>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>App version</div>
                <div className={styles.specValue}>{meta.app_version}</div>
              </div>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>RDKit version</div>
                <div className={styles.specValue}>{meta.rdkit_version}</div>
              </div>
            </div>
          ) : (
            <LoadingBlock label="Loading provenance metadata…" />
          )}
          {meta && (
            <div className={styles.card} style={{ marginTop: "1rem" }}>
              <h3 className={styles.chartTitle}>Calculation methodology</h3>
              <ul className={styles.list}>
                {Object.entries(meta.calculation_methodology).map(([key, method]) => (
                  <li key={key}>
                    <code>{key}</code>: {method}
                  </li>
                ))}
              </ul>
              <h3 className={styles.chartTitle} style={{ marginTop: "1rem" }}>
                Warnings & limitations
              </h3>
              <ul className={styles.list}>
                {meta.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
                <li>Exported values are not experimentally verified unless the source data states it.</li>
              </ul>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.buttonRow}>
            <Link href="/library" className={styles.secondaryButton}>
              ← Back to library
            </Link>
            <Link href="/docs" className={styles.secondaryButton}>
              Methodology documentation →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

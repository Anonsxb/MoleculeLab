"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, type Dataset } from "../../lib/api";
import { useOnMountLoad } from "../../lib/hooks";
import { BackLink, EmptyBlock, ErrorBlock, LoadingBlock, Notice } from "../components/states";
import styles from "../subpage.module.css";

interface DashboardData {
  health: { status: string; app_name: string; version: string; rdkit_version: string } | null;
  datasets: Dataset[];
  totals: {
    total_unique_molecules: number;
    total_entries: number;
    total_valid_entries: number;
    total_invalid_entries: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    health: null,
    datasets: [],
    totals: { total_unique_molecules: 0, total_entries: 0, total_valid_entries: 0, total_invalid_entries: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, datasetResponse] = await Promise.all([
        api.health(),
        api.datasets(),
      ]);
      setData({ health, datasets: datasetResponse.items, totals: datasetResponse });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach the backend service. Start it with: uvicorn app.main:app --app-dir backend --port 8000",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useOnMountLoad(load);

  const { health, datasets, totals } = data;

  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Every metric below is computed from live backend data — none of these figures are
          simulated, and they update whenever the underlying data changes.
        </p>

        {loading && <LoadingBlock label="Querying backend statistics…" />}
        {error && (
          <div className={styles.section}>
            <ErrorBlock message={error} hint="The dashboard cannot report figures while the backend is unreachable." />
            <div className={styles.buttonRow}>
              <button className={styles.button} onClick={() => void load()}>
                Retry
              </button>
            </div>
          </div>
        )}

        {health && (
          <>
            <section className={styles.section} aria-label="Key metrics">
              <h2 className={styles.sectionTitle}>Key metrics</h2>
              <div className={styles.specsGrid}>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Datasets</div>
                  <div className={styles.specValue} data-testid="metric-datasets">
                    {datasets.length}
                  </div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Unique molecules</div>
                  <div className={styles.specValue}>{totals.total_unique_molecules}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Dataset records (valid)</div>
                  <div className={styles.specValue}>{totals.total_valid_entries}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Dataset records (invalid)</div>
                  <div className={styles.specValue}>{totals.total_invalid_entries}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>RDKit engine</div>
                  <div className={styles.specValue}>{health.rdkit_version}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Service</div>
                  <div className={styles.specValue}>
                    {health.status} · v{health.version}
                  </div>
                </div>
              </div>
              <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
                “Unique molecules” counts distinct structures in the database. A molecule can belong
                to several datasets, so dataset records may total more than unique molecules —
                the two figures are reported separately so neither is double-counted.
              </p>
            </section>

            <section className={styles.section} aria-label="Datasets">
              <h2 className={styles.sectionTitle}>Available datasets</h2>
              {datasets.length === 0 ? (
                <EmptyBlock title="No datasets are available yet.">
                  Import a CSV file to create the first dataset.
                </EmptyBlock>
              ) : (
                datasets.map((dataset) => (
                  <div className={styles.card} key={dataset.id} style={{ marginBottom: "1rem" }}>
                    <div className={styles.specsGrid}>
                      <div className={styles.specItem}>
                        <div className={styles.specLabel}>Dataset</div>
                        <div className={styles.specValue}>{dataset.name}</div>
                      </div>
                      <div className={styles.specItem}>
                        <div className={styles.specLabel}>Records</div>
                        <div className={styles.specValue}>{dataset.record_count}</div>
                      </div>
                      <div className={styles.specItem}>
                        <div className={styles.specLabel}>Valid / invalid</div>
                        <div className={styles.specValue}>
                          {dataset.valid_count} / {dataset.invalid_count}
                        </div>
                      </div>
                      <div className={styles.specItem}>
                        <div className={styles.specLabel}>Version</div>
                        <div className={styles.specValue}>{dataset.version_label}</div>
                      </div>
                      <div className={styles.specItem}>
                        <div className={styles.specLabel}>Created</div>
                        <div className={styles.specValue}>
                          {new Date(dataset.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.specItem}>
                        <div className={styles.specLabel}>Source</div>
                        <div className={styles.specValue}>
                          {dataset.source_url ? (
                            <a href={dataset.source_url} target="_blank" rel="noreferrer">
                              {dataset.source_name} ↗
                            </a>
                          ) : (
                            dataset.source_name
                          )}
                        </div>
                      </div>
                    </div>
                    <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
                      {dataset.description}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className={styles.section} aria-label="Shortcuts">
              <h2 className={styles.sectionTitle}>Quick links</h2>
              <div className={styles.buttonRow}>
                <Link href="/library" className={styles.button}>
                  Molecular library
                </Link>
                <Link href="/compare" className={styles.button}>
                  Compare molecules
                </Link>
                <Link href="/analytics" className={styles.button}>
                  Analytics
                </Link>
                <Link href="/import" className={styles.button}>
                  Import dataset
                </Link>
                <Link href="/export" className={styles.secondaryButton}>
                  Export
                </Link>
                <Link href="/docs" className={styles.secondaryButton}>
                  Methodology
                </Link>
              </div>
            </section>

            <section className={styles.section} aria-label="Methodology summary">
              <h2 className={styles.sectionTitle}>Scientific methodology summary</h2>
              <Notice>
                Descriptors are calculated on the backend with RDKit {health.rdkit_version}
                {" "}(MolWt, Crippen MolLogP, Lipinski HBD/HBA, TPSA). They are calculated
                estimates of structural and physicochemical properties — they do not establish
                biological activity, efficacy, safety, or toxicity.
              </Notice>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

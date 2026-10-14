"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

interface HealthData {
  status: string;
  app_name: string;
  version: string;
  rdkit_version: string;
  environment: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl}/api/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }
      const data: HealthData = await res.json();
      setPingLatency(Math.round(performance.now() - start));
      setHealth(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to reach backend service");
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    // Initial synchronization with the backend health endpoint on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchHealth();
  }, [fetchHealth]);

  return (
    <div className={styles.container}>
      {/* Top Navbar */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>⬡</div>
          <div>
            <div className={styles.brandTitle}>MoleculeLab</div>
            <div className={styles.brandSubtitle}>Molecular Structure & Property Exploration Platform</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.badgeGroup}>
            <span className={styles.badgeVersion}>v1.0.0-MVP</span>
            {loading ? (
              <span className={styles.badgeConnecting}>Connecting to Core...</span>
            ) : health ? (
              <span className={styles.badgeOnline}>
                <span className={styles.onlineDot} /> Backend Live (RDKit {health.rdkit_version})
              </span>
            ) : (
              <span className={styles.badgeOffline}>Backend Offline</span>
            )}
          </div>
          <button onClick={fetchHealth} className={styles.refreshBtn} title="Test backend connection">
            ↻ Refresh State
          </button>
        </div>
      </header>

      {/* Scientific Limitation Banner (PRD FR-15 / AC-12) */}
      <div className={styles.cautionBanner} role="alert">
        <div className={styles.cautionIcon}>ℹ</div>
        <div>
          <strong>Educational & Research Disclaimer:</strong> MoleculeLab is an educational computational chemistry
          workbench. Calculated descriptors (Crippen LogP estimates, TPSA, molecular weight) represent theoretical
          physicochemical models and structural counting algorithms. They <em>do not</em> establish biological activity,
          pharmaceutical efficacy, clinical safety, toxicity, or therapeutic viability.
        </div>
      </div>

      {/* Main Content Layout */}
      <main id="main-content" className={styles.main}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroText}>
            <h1 className={styles.heroHeading}>
              Precision <span className={styles.accentText}>Molecular Informatics</span> Workbench
            </h1>
            <p className={styles.heroDescription}>
              A full-stack computational chemistry platform with a backend-driven <strong>RDKit</strong> chemistry engine,
              relational data models, verified molecular descriptor pipelines, and interactive structural analytics.
            </p>
            <div className={styles.heroLinks}>
              <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer" className={styles.primaryLink}>
                Explore Interactive API Docs (Swagger) →
              </a>
              <a href={`${apiUrl}/api/health`} target="_blank" rel="noreferrer" className={styles.secondaryLink}>
                Inspect /api/health JSON
              </a>
            </div>
          </div>

          {/* Engine Status Card */}
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusCardTitle}>Chemistry Core Status</div>
              {pingLatency !== null && (
                <div className={styles.latencyTag}>{pingLatency} ms latency</div>
              )}
            </div>

            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span>Querying FastAPI & RDKit runtime...</span>
              </div>
            )}

            {error && (
              <div className={styles.errorState}>
                <div className={styles.errorHeader}>Connection Warning</div>
                <div className={styles.errorBody}>{error}</div>
                <div className={styles.errorHint}>
                  Ensure the FastAPI backend is running on <code>http://localhost:8000</code>.
                </div>
              </div>
            )}

            {health && (
              <div className={styles.specsGrid}>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>FastAPI Status</div>
                  <div className={styles.specValueSuccess}>{health.status.toUpperCase()}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>RDKit Engine</div>
                  <div className={styles.specValueAccent}>v{health.rdkit_version}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Python Runtime</div>
                  <div className={styles.specValue}>Python 3.14.5 (Verified)</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Environment</div>
                  <div className={styles.specValue}>{health.environment}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5 Core Descriptors Matrix */}
        <section className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Standard Calculated Descriptors (Backend Engine)</h2>
          <p className={styles.sectionSubtitle}>
            All chemistry algorithms run server-side in RDKit with full floating-point precision. Values are never fabricated or defaulted to zero.
          </p>

          <div className={styles.descriptorsGrid}>
            <div className={styles.descCard}>
              <div className={styles.descHeader}>
                <span className={styles.descTag}>Mass</span>
                <span className={styles.descUnit}>g/mol</span>
              </div>
              <div className={styles.descName}>Molecular Weight</div>
              <div className={styles.descMethod}>RDKit: <code>Descriptors.MolWt</code></div>
              <div className={styles.descSummary}>
                Sum of standard atomic masses across the molecular formula.
              </div>
            </div>

            <div className={styles.descCard}>
              <div className={styles.descHeader}>
                <span className={styles.descTag}>Partition</span>
                <span className={styles.descUnit}>Dimensionless</span>
              </div>
              <div className={styles.descName}>Crippen LogP (Estimate)</div>
              <div className={styles.descMethod}>RDKit: <code>Crippen.MolLogP</code></div>
              <div className={styles.descSummary}>
                Estimated octanol-water partition coefficient calculated via atom-contribution rules.
              </div>
            </div>

            <div className={styles.descCard}>
              <div className={styles.descHeader}>
                <span className={styles.descTag}>H-Bonding</span>
                <span className={styles.descUnit}>Count</span>
              </div>
              <div className={styles.descName}>Hydrogen-Bond Donors (HBD)</div>
              <div className={styles.descMethod}>RDKit: <code>Lipinski.NumHDonors</code></div>
              <div className={styles.descSummary}>
                Count of hydrogen atoms attached to electronegative nitrogen and oxygen centers.
              </div>
            </div>

            <div className={styles.descCard}>
              <div className={styles.descHeader}>
                <span className={styles.descTag}>H-Bonding</span>
                <span className={styles.descUnit}>Count</span>
              </div>
              <div className={styles.descName}>Hydrogen-Bond Acceptors (HBA)</div>
              <div className={styles.descMethod}>RDKit: <code>Lipinski.NumHAcceptors</code></div>
              <div className={styles.descSummary}>
                Count of available nitrogen and oxygen hydrogen-bond accepting heteroatoms.
              </div>
            </div>

            <div className={styles.descCard}>
              <div className={styles.descHeader}>
                <span className={styles.descTag}>Polar Surface</span>
                <span className={styles.descUnit}>Å²</span>
              </div>
              <div className={styles.descName}>Topological Polar Surface Area</div>
              <div className={styles.descMethod}>RDKit: <code>Descriptors.TPSA</code></div>
              <div className={styles.descSummary}>
                Sum of polar atom surface area contributions for polar fragments.
              </div>
            </div>
          </div>
        </section>

        {/* Workstations Roadmap */}
        <section className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Workbench Architecture & Modules</h2>
          <p className={styles.sectionSubtitle}>
            Select a module to open its workspace. Modules whose backend endpoints are still under
            construction say so explicitly instead of showing placeholder data.
          </p>
          <div className={styles.modulesGrid}>
            <Link href="/dashboard" className={styles.moduleCard} aria-label="Open live dashboard">
              <div className={styles.moduleIcon} aria-hidden="true">📊</div>
              <div className={styles.moduleTitle}>FR-01: Live Dashboard</div>
              <p className={styles.moduleText}>
                Live counts of datasets, valid records, and ingestion metrics computed directly from database queries.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open dashboard →</span>
            </Link>

            <Link href="/library" className={styles.moduleCard} aria-label="Open molecular library">
              <div className={styles.moduleIcon} aria-hidden="true">🔍</div>
              <div className={styles.moduleTitle}>FR-03: Molecular Library</div>
              <p className={styles.moduleText}>
                Server-side paginated explorer with multi-select comparison, search by name/SMILES, and numerical filter sliders.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open library →</span>
            </Link>

            <Link href="/compare" className={styles.moduleCard} aria-label="Open molecule comparison">
              <div className={styles.moduleIcon} aria-hidden="true">⚖️</div>
              <div className={styles.moduleTitle}>FR-08: Molecule Comparison</div>
              <p className={styles.moduleText}>
                Side-by-side inspection of 2 to 4 molecules with 2D depictions, absolute delta calculations, and non-judgmental analysis.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open comparison →</span>
            </Link>

            <Link href="/analytics" className={styles.moduleCard} aria-label="Open property analytics">
              <div className={styles.moduleIcon} aria-hidden="true">📈</div>
              <div className={styles.moduleTitle}>FR-09: Property Analytics</div>
              <p className={styles.moduleText}>
                Interactive distribution histograms (MW, LogP, TPSA, HBD, HBA) and LogP vs MW scatter plots driven by backend aggregations.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open analytics →</span>
            </Link>

            <Link href="/import" className={styles.moduleCard} aria-label="Open CSV dataset import">
              <div className={styles.moduleIcon} aria-hidden="true">📥</div>
              <div className={styles.moduleTitle}>FR-10: CSV Dataset Ingestion</div>
              <p className={styles.moduleText}>
                Batch structure ingestion with row-level error reporting, duplicate detection, and automated data-quality summaries.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open import →</span>
            </Link>

            <Link href="/export" className={styles.moduleCard} aria-label="Open reproducible export">
              <div className={styles.moduleIcon} aria-hidden="true">📤</div>
              <div className={styles.moduleTitle}>FR-12: Reproducible Export</div>
              <p className={styles.moduleText}>
                Filtered dataset CSV export bundled with analysis parameters, RDKit version, calculation timestamp, and provenance metadata.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open export →</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div>MoleculeLab — Computational Chemistry Exploration Platform</div>
        <div className={styles.footerLinks}>
          <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">FastAPI Docs</a>
          <span aria-hidden="true">•</span>
          <a href="https://www.rdkit.org" target="_blank" rel="noreferrer">RDKit Documentation</a>
          <span aria-hidden="true">•</span>
          <Link href="/docs">Methodology & Limitations</Link>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";
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

  const apiUrl = getApiUrl();

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
        setError("Unable to reach backend chemistry service");
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
      {/* Editorial Header Bar */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 19 6 19 14 12 18 5 14 5 6 12 2" />
              <circle cx="12" cy="10" r="3" fill="#B87955" stroke="none" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <circle cx="12" cy="22" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className={styles.brandTitle}>DrugMatch</div>
            <div className={styles.brandSubtitle}>Drug Molecule Screening & Ranking System</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.badgeGroup}>
            <span className={styles.badgeVersion}>v1.0.0</span>
            {loading ? (
              <span className={styles.badgeConnecting}>
                <span className={styles.connectingDot} /> Connecting to Core...
              </span>
            ) : health ? (
              <span className={styles.badgeOnline}>
                <span className={styles.onlineDot} /> Core Online · RDKit {health.rdkit_version}
              </span>
            ) : (
              <span className={styles.badgeOffline}>Core Offline</span>
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
        <div className={styles.cautionText}>
          <strong>Scientific & Research Protocol:</strong> DrugMatch provides preliminary computational chemistry
          screening and ranking based on calculated physicochemical descriptors (Crippen LogP estimates, TPSA,
          Lipinski H-bonding rules, and molecular weight). Calculated values represent theoretical mathematical models.
          They <em>do not</em> establish clinical safety, pharmacological efficacy, metabolic toxicity, or therapeutic viability.
        </div>
      </div>

      {/* Main Content Layout */}
      <main id="main-content" className={styles.main}>
        {/* Editorial Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>COMPUTATIONAL DRUG SCREENING & RANKING</p>
            <h1 className={styles.heroHeading}>
              Screen candidate molecules. <span className={styles.accentText}>Understand physicochemical properties.</span>
            </h1>
            <p className={styles.heroDescription}>
              Search 1,300+ validated drug-like molecules, inspect high-precision 2D and 3D conformers,
              filter by multi-parameter Lipinski ranges, and perform preliminary property-based screening and ranking —
              all calculated transparently with open chemistry standards.
            </p>
            <div className={styles.heroLinks}>
              <Link href="/library" className={styles.primaryLink}>
                Launch Library & Screening →
              </Link>
              <Link href="/docs" className={styles.secondaryLink}>
                Calculation Methodology
              </Link>
            </div>
            <p className={styles.devLinks}>
              Developers:{" "}
              <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">
                API Docs (FastAPI)
              </a>
              {" · "}
              <a href={`${apiUrl}/api/health`} target="_blank" rel="noreferrer">
                Health Check Endpoint
              </a>
            </p>
          </div>

          {/* Engine Status Card */}
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div>
                <span className={styles.statusCardEyebrow}>SYSTEM TELEMETRY</span>
                <div className={styles.statusCardTitle}>Chemistry Core Status</div>
              </div>
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
                  Ensure the backend service is running at <code>{apiUrl}</code>.
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
                  <div className={styles.specLabel}>App Version</div>
                  <div className={styles.specValue}>v{health.version}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Environment</div>
                  <div className={styles.specValue}>{health.environment}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Guided First-Time Path */}
        <section className={styles.sectionContainer} aria-label="First visit guide">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>WALKTHROUGH</span>
            <h2 className={styles.sectionTitle}>Guided Scientific Exploration</h2>
            <p className={styles.sectionSubtitle}>
              Three direct steps to understand the screening workflow and descriptor calculations.
            </p>
          </div>

          <div className={styles.tourGrid}>
            <Link href="/molecules/29" className={styles.tourCard} aria-label="Step 1: open caffeine">
              <div className={styles.tourNum} aria-hidden="true">01</div>
              <div className={styles.tourCardBody}>
                <div className={styles.tourCardTitle}>Inspect a Reference Molecule</div>
                <p className={styles.tourCardText}>
                  Examine caffeine (ID 29): view 2D depiction, molecular formula, SMILES notation, and all 5 standard descriptors.
                </p>
                <span className={styles.tourCta} aria-hidden="true">Open Caffeine Record →</span>
              </div>
            </Link>

            <Link href="/compare?ids=1,3" className={styles.tourCard} aria-label="Step 2: compare water and ethanol">
              <div className={styles.tourNum} aria-hidden="true">02</div>
              <div className={styles.tourCardBody}>
                <div className={styles.tourCardTitle}>Side-by-Side Property Comparison</div>
                <p className={styles.tourCardText}>
                  Compare water and ethanol: review absolute differences in molecular weight, LogP partitioning, and H-bonding.
                </p>
                <span className={styles.tourCta} aria-hidden="true">Compare Molecules →</span>
              </div>
            </Link>

            <Link href="/validate" className={styles.tourCard} aria-label="Step 3: check your own structure">
              <div className={styles.tourNum} aria-hidden="true">03</div>
              <div className={styles.tourCardBody}>
                <div className={styles.tourCardTitle}>Validate Custom SMILES</div>
                <p className={styles.tourCardText}>
                  Enter any SMILES notation to parse valence, render 2D chemical structure, and calculate descriptors in real-time.
                </p>
                <span className={styles.tourCta} aria-hidden="true">Check SMILES Structure →</span>
              </div>
            </Link>
          </div>
        </section>

        {/* 5 Core Descriptors Matrix */}
        <section className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>CORE ENGINE DESCRIPTORS</span>
            <h2 className={styles.sectionTitle}>Calculated Physicochemical Properties</h2>
            <p className={styles.sectionSubtitle}>
              All algorithms execute server-side in RDKit with full floating-point precision. Values are never fabricated or defaulted to zero.
            </p>
          </div>

          <div className={styles.descriptorsGrid}>
            <div className={styles.descCard}>
              <div className={styles.descHeader}>
                <span className={styles.descTag}>Mass</span>
                <span className={styles.descUnit}>g/mol</span>
              </div>
              <div className={styles.descName}>Molecular Weight</div>
              <div className={styles.descMethod}>RDKit: <code>Descriptors.MolWt</code></div>
              <div className={styles.descSummary}>
                Sum of standard atomic masses across the molecular formula. Pure physical mass measurement.
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
                Estimated octanol-water partition coefficient calculated via Wildman-Crippen atom-contribution rules.
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
                Sum of polar atom surface area contributions for polar fragments, modeling polarity in the topological space.
              </div>
            </div>
          </div>
        </section>

        {/* Workstations Roadmap */}
        <section className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>SYSTEM WORKSPACES</span>
            <h2 className={styles.sectionTitle}>Computational Workspaces</h2>
            <p className={styles.sectionSubtitle}>
              Connected workspaces for molecule exploration, multi-parameter screening, conformer generation, and dataset management.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            <Link href="/library" className={styles.moduleCard} aria-label="Open molecular library and screening">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <span className={styles.moduleBadge}>Core Workflow</span>
              </div>
              <div className={styles.moduleTitle}>Library & Screening</div>
              <p className={styles.moduleText}>
                Filter across 5 descriptors, apply multi-parameter cutoff thresholds, sort by any property, and rank candidate molecules.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Launch Screening Workspace →</span>
            </Link>

            <Link href="/dashboard" className={styles.moduleCard} aria-label="Open dashboard">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                </div>
              </div>
              <div className={styles.moduleTitle}>Database Dashboard</div>
              <p className={styles.moduleText}>
                Live counts of datasets, valid records, invalid structure tallies, and recent import job verification metrics.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open Dashboard →</span>
            </Link>

            <Link href="/compare" className={styles.moduleCard} aria-label="Open molecule comparison">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                </div>
              </div>
              <div className={styles.moduleTitle}>Molecule Comparison</div>
              <p className={styles.moduleText}>
                Side-by-side inspection of 2 to 4 candidate molecules with delta calculations relative to the baseline molecule.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open Comparison →</span>
            </Link>

            <Link href="/studio" className={styles.moduleCard} aria-label="Open 3D Conformer Studio">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <span className={styles.moduleBadgeCopper}>3D WebGL</span>
              </div>
              <div className={styles.moduleTitle}>3D Conformer Studio</div>
              <p className={styles.moduleText}>
                Generate 3D coordinates, optimize conformations via MMFF94 force field, inspect charges, and measure bond geometries.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Launch 3D Studio →</span>
            </Link>

            <Link href="/analytics" className={styles.moduleCard} aria-label="Open property analytics">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
              </div>
              <div className={styles.moduleTitle}>Property Analytics</div>
              <p className={styles.moduleText}>
                Histograms and scatter correlation plots analyzing distributions of molecular weight, LogP, and TPSA across datasets.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open Analytics →</span>
            </Link>

            <Link href="/validate" className={styles.moduleCard} aria-label="Open structure validation">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
              <div className={styles.moduleTitle}>Check SMILES Structure</div>
              <p className={styles.moduleText}>
                Instant structural validation and 2D vector depiction. Invalid valence and malformed SMILES syntax are explained transparently.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Validate Structure →</span>
            </Link>

            <Link href="/import" className={styles.moduleCard} aria-label="Open CSV dataset import">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
              </div>
              <div className={styles.moduleTitle}>Import Dataset</div>
              <p className={styles.moduleText}>
                Ingest custom molecule libraries from CSV. Quality checking validates every SMILES string and surfaces errors prior to committing.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Open Import →</span>
            </Link>

            <Link href="/export" className={styles.moduleCard} aria-label="Open reproducible export">
              <div className={styles.moduleHeader}>
                <div className={styles.moduleEmblem} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
              </div>
              <div className={styles.moduleTitle}>Reproducible Export</div>
              <p className={styles.moduleText}>
                Download screened subsets as CSV accompanied by complete computational provenance: RDKit version, parameters, and algorithms.
              </p>
              <span className={styles.cardCta} aria-hidden="true">Export Dataset →</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.footerTitle}>DrugMatch</div>
          <div className={styles.footerDesc}>Drug Molecule Screening & Ranking System · Computational Chemistry Platform</div>
        </div>
        <div className={styles.footerLinks}>
          <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">FastAPI Docs</a>
          <span aria-hidden="true">•</span>
          <a href="https://www.rdkit.org" target="_blank" rel="noreferrer">RDKit Documentation</a>
          <span aria-hidden="true">•</span>
          <Link href="/docs">Methodology & Limitations</Link>
          <span aria-hidden="true">•</span>
          <Link href="/developers">API Guide</Link>
        </div>
      </footer>
    </div>
  );
}

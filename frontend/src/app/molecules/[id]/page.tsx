"use client";

import { Suspense, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, describeError, formatValue, type MoleculeDetail } from "../../../lib/api";
import { useOnMountLoad } from "../../../lib/hooks";
import { BackLink, EmptyBlock, ErrorBlock, LoadingBlock, MoleculeStructure } from "../../components/states";
import styles from "../../subpage.module.css";

const DESCRIPTOR_ORDER = ["molecular_weight", "logp", "hbd", "hba", "tpsa"] as const;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.linkButton}
      onClick={() => void handleCopy()}
      aria-label={label}
      aria-live="polite"
      style={{ marginTop: "0.4rem" }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

const EXPLANATIONS: Record<string, string> = {  molecular_weight:
    "Sums standard atomic masses across the molecular formula. A purely physical mass measure: larger values mean a heavier molecule and carry no information about activity or safety.",
  logp:
    "A Crippen atom-contribution estimate of octanol–water partitioning. Higher values suggest more lipid-like character within this model. This is a calculated estimate, not an experimental logP.",
  hbd:
    "Counts hydrogen atoms attached to electronegative nitrogen/oxygen centres under RDKit's Lipinski definition. A structural count, not a permeability prediction.",
  hba:
    "Counts nitrogen/oxygen heteroatoms able to accept hydrogen bonds under RDKit's Lipinski definition. Structural counts vary slightly between toolkits.",
  tpsa:
    "Sums the polar surface-area contributions of polar fragments using topological contributions. Describes polarity in the model only — not solubility, permeability, or clinical behaviour.",
};

function MoleculeDetailWorkspace() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [resolvedId] = useState(() => Number(params?.id));
  const moleculeId = resolvedId;
  const [molecule, setMolecule] = useState<MoleculeDetail | null>(null);
  const [reference, setReference] = useState<Record<string, { median: number | null; min: number | null; max: number | null }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, summary] = await Promise.all([
        api.molecule(moleculeId),
        api.summary().catch(() => null),
      ]);
      setMolecule(detail);
      if (summary) {
        const table: Record<string, { median: number | null; min: number | null; max: number | null }> = {};
        for (const descriptor of summary.descriptors) {
          table[descriptor.key] = {
            median: descriptor.median,
            min: descriptor.min,
            max: descriptor.max,
          };
        }
        setReference(table);
      }
    } catch (err) {
      setError(describeError(err, "Unable to load this molecule."));
    } finally {
      setLoading(false);
    }
  }, [moleculeId]);

  useOnMountLoad(load);

  return (
    <div className={styles.container}>
      <BackLink href="/library" label="← Back to library" />
      <main id="main-content">
        {loading && <LoadingBlock label="Loading molecular record…" />}
        {error && (
          <ErrorBlock message={error} hint="The molecule may not exist, or the backend may be unreachable." />
        )}

        {!loading && !error && molecule && (
          <>
            <h1 className={styles.title}>{molecule.display_name}</h1>
            <p className={styles.subtitle}>
              {molecule.formula ? `Formula ${molecule.formula} · ` : ""}
              Internal ID {molecule.id}
              {molecule.external_id ? ` · ${molecule.external_id}` : ""}
            </p>

            <section className={styles.section} aria-label="Two-dimensional structure">
              <h2 className={styles.sectionTitle}>Structure</h2>
              <div className={styles.card}>
                <div style={{ maxWidth: "380px" }}>
                  <MoleculeStructure svg={molecule.structure_svg} label={molecule.display_name} />
                </div>
                <div className={styles.specsGrid} style={{ marginTop: "1.25rem" }}>
                  <div className={styles.specItem}>
                    <div className={styles.specLabel}>Original SMILES</div>
                    <div className={styles.specValue}>{molecule.original_smiles}</div>
                    <CopyButton text={molecule.original_smiles} label="Copy original SMILES" />
                  </div>
                  <div className={styles.specItem}>
                    <div className={styles.specLabel}>Canonical SMILES</div>
                    <div className={styles.specValue}>{molecule.canonical_smiles || "—"}</div>
                    {molecule.canonical_smiles && (
                      <CopyButton text={molecule.canonical_smiles} label="Copy canonical SMILES" />
                    )}
                  </div>
                  <div className={styles.specItem}>
                    <div className={styles.specLabel}>Validation status</div>
                    <div className={styles.specValue}>valid</div>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.section} aria-label="Calculated descriptors">
              <h2 className={styles.sectionTitle}>Calculated descriptors</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Descriptor</th>
                      <th scope="col">Value</th>
                      <th scope="col">Typical (median)</th>
                      <th scope="col">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DESCRIPTOR_ORDER.map((key) => {
                      const entry = molecule.descriptors?.[key];
                      const ref = reference?.[key];
                      return (
                        <tr key={key}>
                          <td>{key.replace("_", " ")}</td>
                          <td>{entry?.value === null || entry?.value === undefined ? "—" : formatValue(entry.value)}</td>
                          <td>
                            {ref?.median === null || ref?.median === undefined
                              ? "—"
                              : formatValue(ref.median)}
                          </td>
                          <td>{entry?.unit || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
                “Typical (median)” is the middle value across all molecules in the database — a
                reference point so you can tell at a glance whether this molecule is above or
                below typical. It is a description of the dataset, not a judgment about the molecule.
              </p>
              <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
                Calculated with RDKit {molecule.descriptor_provenance?.rdkit_version || "unknown"} on{" "}
                {molecule.descriptor_provenance?.calculated_at
                  ? new Date(molecule.descriptor_provenance.calculated_at).toLocaleString()
                  : "an unknown date"}
                . Values are stored at full precision and rounded here for display. Missing values
                are shown as “—” and are never replaced with zero.
              </p>
              <details className={styles.details}>
                <summary>Technical details: exact calculation methods</summary>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Descriptor</th>
                        <th scope="col">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DESCRIPTOR_ORDER.map((key) => (
                        <tr key={key}>
                          <td>{key.replace("_", " ")}</td>
                          <td>
                            <code className={styles.code}>
                              {molecule.descriptors?.[key]?.method || "—"}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>

            <section className={styles.section} aria-label="What each descriptor means">
              <h2 className={styles.sectionTitle}>What these descriptors mean</h2>
              <div className={styles.card}>
                {DESCRIPTOR_ORDER.map((key) => (
                  <p key={key} style={{ marginBottom: "0.75rem", fontSize: "0.86rem", lineHeight: 1.6, color: "#cbd5e1" }}>
                    <strong style={{ color: "#ffffff" }}>{key.replace("_", " ")}:</strong>{" "}
                    {EXPLANATIONS[key]}
                  </p>
                ))}
              </div>
            </section>

            <section className={styles.section} aria-label="Source and comparison">
              <h2 className={styles.sectionTitle}>Source & actions</h2>
              <div className={styles.card}>
                <div className={styles.specsGrid}>
                  <div className={styles.specItem}>
                    <div className={styles.specLabel}>Source</div>
                    <div className={styles.specValue}>
                      {molecule.source_url ? (
                        <a href={molecule.source_url} target="_blank" rel="noreferrer">
                          {molecule.source_name} ↗
                        </a>
                      ) : (
                        molecule.source_name || "—"
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.buttonRow}>
                  <button
                    className={styles.button}
                    onClick={() => router.push(`/compare?ids=${molecule.id}`)}
                  >
                    Use in comparison →
                  </button>
                  <button className={styles.secondaryButton} onClick={() => router.push("/library")}>
                    Back to library
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <EmptyBlock title="Descriptors do not establish biological activity, efficacy, safety, or toxicity." />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function MoleculeDetailPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading molecular record…" />}>
      <MoleculeDetailWorkspace />
    </Suspense>
  );
}

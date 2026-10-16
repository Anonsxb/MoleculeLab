"use client";

import { useState } from "react";
import { api, describeError, formatValue } from "../../lib/api";
import { BackLink, ErrorBlock, LoadingBlock, MoleculeStructure } from "../components/states";
import styles from "../subpage.module.css";

const EXAMPLES = [
  { label: "Ethanol", smiles: "CCO" },
  { label: "Benzene", smiles: "c1ccccc1" },
  { label: "Caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" },
  { label: "Broken (try me)", smiles: "C1CCCCC" },
];

const DESCRIPTOR_ROWS = [
  { key: "molecular_weight", label: "Molecular weight", unit: "g/mol" },
  { key: "logp", label: "LogP (Crippen estimate)", unit: "dimensionless" },
  { key: "hbd", label: "H-bond donors", unit: "count" },
  { key: "hba", label: "H-bond acceptors", unit: "count" },
  { key: "tpsa", label: "TPSA", unit: "Å²" },
];

interface ValidationResult {
  valid: boolean;
  status: string;
  original_smiles: string;
  canonical_smiles?: string | null;
  formula?: string | null;
  descriptors?: Record<string, number | null>;
  structure_svg?: string | null;
  rdkit_version?: string;
  error_message?: string | null;
}

export default function ValidatePage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runValidation(smiles: string) {
    const term = smiles.trim();
    if (!term) {
      setError("Type or paste a SMILES string first — try one of the examples below.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await api.validate(term));
    } catch (err) {
      setResult(null);
      setError(describeError(err, "Validation failed."));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runValidation(input);
  }

  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Check a Structure</h1>
        <p className={styles.subtitle}>
          SMILES is a one-line text notation for molecules — each letter is an atom, lines are
          bonds, and digits close rings (so <code>c1ccccc1</code> is a six-membered ring: benzene).
          Paste any SMILES below and the chemistry engine will parse it, draw it, and calculate
          its properties. Invalid input is explained, never silently fixed.
        </p>

        <section className={styles.section} aria-label="SMILES input">
          <h2 className={styles.sectionTitle}>1. Enter a SMILES string</h2>
          <div className={styles.card}>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="validate-smiles">SMILES string</label>
                <input
                  id="validate-smiles"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="e.g. CCO"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit" disabled={loading}>
                  {loading ? "Checking…" : "Check structure"}
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setInput("");
                    setResult(null);
                    setError(null);
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
            <div className={styles.buttonRow} style={{ marginTop: "0.75rem" }}>
              <span className={styles.hint}>No SMILES handy? Try:</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setInput(example.smiles);
                    void runValidation(example.smiles);
                  }}
                >
                  {example.label} <code>{example.smiles}</code>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-label="Validation result">
          <h2 className={styles.sectionTitle}>2. Result</h2>
          {loading && <LoadingBlock label="Parsing structure…" />}
          {error && <ErrorBlock message={error} />}
          {!loading && !error && !result && (
            <div className={styles.emptyState} role="status">
              <p><strong>Nothing checked yet.</strong></p>
              <p className={styles.hint}>Your result — structure drawing included — appears here.</p>
            </div>
          )}
          {!loading && result && (
            <div className={styles.card}>
              {result.valid ? (
                <>
                  <p style={{ fontSize: "1rem", marginBottom: "1rem" }}>
                    <strong style={{ color: "#34d399" }}>✓ Valid structure.</strong>{" "}
                    <span style={{ color: "#cbd5e1" }}>
                      {result.formula ? `Formula ${result.formula}. ` : ""}
                      Canonical form: <code>{result.canonical_smiles}</code>
                    </span>
                  </p>
                  <div style={{ maxWidth: "380px", marginBottom: "1.25rem" }}>
                    <MoleculeStructure svg={result.structure_svg} label={result.original_smiles} />
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <caption className={styles.hint}>
                        Calculated on the backend with RDKit {result.rdkit_version}. Rounded for
                        display; stored at full precision.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Descriptor</th>
                          <th scope="col">Value</th>
                          <th scope="col">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DESCRIPTOR_ROWS.map((row) => (
                          <tr key={row.key}>
                            <td>{row.label}</td>
                            <td>{formatValue(result.descriptors?.[row.key] ?? null)}</td>
                            <td>{row.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
                    These are calculated estimates for learning — they say nothing about safety,
                    efficacy, or biological activity.{" "}
                    <a href="/docs" className={styles.inlineLink}>What do these numbers mean?</a>
                  </p>
                </>
              ) : (
                <div className={styles.errorState} role="alert">
                  <p>
                    <strong>✕ Not a valid structure.</strong>
                  </p>
                  <p>{result.error_message}</p>
                  <p className={styles.hint} style={{ marginTop: "0.5rem" }}>
                    Common causes: unclosed ring digits (every opened digit like “1” needs a
                    matching close), impossible valences (too many bonds on one atom), or characters
                    that aren&apos;t elements. Your input was kept exactly as typed — nothing was
                    auto-corrected.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

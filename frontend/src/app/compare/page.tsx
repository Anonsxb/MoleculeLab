"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, formatValue, type CompareResult, type MoleculeDetail, type Molecule } from "../../lib/api";
import { useOnMountLoad } from "../../lib/hooks";
import {
  BackLink,
  EmptyBlock,
  ErrorBlock,
  MoleculeStructure,
} from "../components/states";
import styles from "../subpage.module.css";

function CompareWorkspace() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<MoleculeDetail[]>([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Molecule[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromQuery = useCallback(async () => {
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(0, 4);
    if (ids.length < 2) return;
    try {
      const loaded: MoleculeDetail[] = [];
      for (const id of ids) loaded.push(await api.molecule(id));
      setSelected(loaded);
    } catch {
      setError("One or more selected molecules could not be loaded for comparison.");
    }
  }, [searchParams]);

  useOnMountLoad(loadFromQuery);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!search.trim()) return;
    try {
      const response = await api.molecules({ q: search.trim(), page_size: 8 });
      setSuggestions(response.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    }
  }

  function addMolecule(molecule: Molecule | MoleculeDetail) {
    setResult(null);
    setSelected((previous) => {
      if (previous.some((item) => item.id === molecule.id)) return previous;
      if (previous.length >= 4) return previous;
      return [...previous, molecule as MoleculeDetail];
    });
  }

  function removeMolecule(id: number) {
    setResult(null);
    setSelected((previous) => previous.filter((item) => item.id !== id));
  }

  async function runCompare() {
    setError(null);
    setLoading(true);
    try {
      setResult(await api.compare(selected.map((molecule) => molecule.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Compare Molecules</h1>
        <p className={styles.subtitle}>
          Select between two and four molecules to inspect their calculated descriptors side by
          side. Differences are absolute values relative to the first selected molecule. Comparison
          is descriptive only â€” no molecule is ranked as therapeutically superior.
        </p>

        <section className={styles.section} aria-label="Add molecules">
          <h2 className={styles.sectionTitle}>1. Add molecules ({selected.length} of 4)</h2>
          <div className={styles.card}>
            <form className={styles.form} onSubmit={runSearch}>
              <div className={styles.field}>
                <label htmlFor="compare-search">Search by name, SMILES, or external ID</label>
                <input
                  id="compare-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="e.g. ethanol"
                  autoComplete="off"
                />
              </div>
              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit">
                  Find molecules
                </button>
              </div>
            </form>

            {suggestions.length > 0 && (
              <ul className={styles.suggestions} aria-label="Search suggestions">
                {suggestions.map((molecule) => (
                  <li key={molecule.id}>
                    <button
                      className={styles.suggestion}
                      onClick={() => addMolecule(molecule)}
                      disabled={
                        selected.some((item) => item.id === molecule.id) || selected.length >= 4
                      }
                    >
                      <span>
                        <strong>{molecule.display_name}</strong>{" "}
                        <span className={styles.hint}>
                          MW {formatValue(molecule.molecular_weight)} Â·{" "}
                          {molecule.formula || "no formula"}
                        </span>
                      </span>
                      <span aria-hidden="true">
                        {selected.some((item) => item.id === molecule.id) ? "added" : "add +"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={styles.section} aria-label="Selected molecules">
          <h2 className={styles.sectionTitle}>2. Selected molecules</h2>
          {selected.length === 0 ? (
            <EmptyBlock title="No molecules selected yet.">
              Search above and add at least two molecules to enable comparison.
            </EmptyBlock>
          ) : (
            <>
              <div className={styles.compareGrid}>
                {selected.map((molecule) => (
                  <div className={styles.compareCard} key={molecule.id}>
                    <div className={styles.compareCardHeader}>
                      <strong>{molecule.display_name}</strong>
                      <button
                        className={styles.linkButton}
                        onClick={() => removeMolecule(molecule.id)}
                        aria-label={`Remove ${molecule.display_name} from comparison`}
                      >
                        remove âœ•
                      </button>
                    </div>
                    <MoleculeStructure
                      svg={molecule.structure_svg}
                      label={molecule.display_name}
                    />
                    <div className={styles.compareFacts}>
                      <div>
                        <span className={styles.specLabel}>MW (g/mol)</span>
                        <span>{formatValue(molecule.molecular_weight)}</span>
                      </div>
                      <div>
                        <span className={styles.specLabel}>Formula</span>
                        <span>{molecule.formula || "â€”"}</span>
                      </div>
                      <div>
                        <span className={styles.specLabel}>ID</span>
                        <span>{molecule.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.buttonRow} style={{ marginTop: "1rem" }}>
                <button
                  className={styles.button}
                  onClick={() => void runCompare()}
                  disabled={selected.length < 2 || loading}
                >
                  {loading ? "Comparingâ€¦" : `Compare ${selected.length} molecules`}
                </button>
                <button className={styles.secondaryButton} onClick={() => setSelected([])}>
                  Clear all
                </button>
                {selected.length < 2 && (
                  <span className={styles.hint}>At least two molecules are required.</span>
                )}
              </div>
            </>
          )}
        </section>

        <section className={styles.section} aria-label="Comparison results">
          <h2 className={styles.sectionTitle}>3. Comparison results</h2>
          {error && <ErrorBlock message={error} />}
          {!error && !result && !loading && <EmptyBlock title="No comparison run yet." />}
          {result && (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className={styles.hint}>
                    Absolute differences are relative to the first selected molecule
                    {" "}
                    ({result.molecules[0]?.display_name}). A dash marks a missing value.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Descriptor (unit)</th>
                      {result.molecules.map((molecule) => (
                        <th scope="col" key={molecule.id}>
                          {molecule.display_name}
                        </th>
                      ))}
                      <th scope="col">Difference vs first</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.descriptors.map((descriptor) => (
                      <tr key={descriptor.key}>
                        <td>
                          {descriptor.label}{" "}
                          <span className={styles.hint}>({descriptor.unit})</span>
                        </td>
                        {descriptor.values.map((value, index) => (
                          <td key={index}>{formatValue(value, 4)}</td>
                        ))}
                        <td>
                          {descriptor.differences.slice(1).map((value, index) => (
                            <div key={index}>{formatValue(value, 4)}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.summary}>
                Descriptor values and differences are computed by the backend with RDKit. They
                describe calculated structural properties only and establish nothing about
                biological activity, efficacy, safety, or toxicity.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareWorkspace />
    </Suspense>
  );
}

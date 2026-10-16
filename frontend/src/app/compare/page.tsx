"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, describeError, formatValue, type CompareResult, type MoleculeDetail, type Molecule } from "../../lib/api";
import { useOnMountLoad } from "../../lib/hooks";
import SearchBox from "../components/SearchBox";
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

  async function addMolecule(molecule: Molecule | MoleculeDetail | { id: number; display_name: string }) {
    setResult(null);
    setSelected((previous) => {
      if (previous.some((item) => item.id === molecule.id)) return previous;
      if (previous.length >= 4) return previous;
      return [...previous, molecule as MoleculeDetail];
    });
    // Search results omit the 2D depiction, so load the full detail for the card.
    try {
      const detail = await api.molecule(molecule.id);
      setSelected((previous) =>
        previous.map((item) => (item.id === detail.id ? detail : item)),
      );
    } catch {
      // The molecule stays in the comparison; only its depiction is unavailable.
    }
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
      setError(describeError(err, "Comparison failed."));
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
          is descriptive only — no molecule is ranked as therapeutically superior.
        </p>

        <section className={styles.section} aria-label="Add molecules">
          <h2 className={styles.sectionTitle}>1. Add molecules ({selected.length} of 4)</h2>
          <div className={styles.card}>
            <SearchBox
              id="compare-search"
              label="Search by name, SMILES, or external ID"
              placeholder="e.g. caffe — start typing, then pick a suggestion to add it"
              submitLabel="Find molecules"
              onSearch={() => {
                setError("Pick a suggestion from the dropdown to add a molecule.");
              }}
              onSelect={(molecule) => {
                void addMolecule(molecule);
              }}
              isSelected={(id) => selected.some((item) => item.id === id)}
            />
            <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
              Start typing and pick a suggestion to add it instantly. Add at least two molecules,
              then compare them below.
            </p>
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
                        remove ✕
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
                        <span>{molecule.formula || "—"}</span>
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
                  {loading ? "Comparing…" : `Compare ${selected.length} molecules`}
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
                    Absolute differences are relative to the first selected molecule{" "}
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

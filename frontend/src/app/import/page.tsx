"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiFailure, api, formatValue, type ImportPreview } from "../../lib/api";
import { BackLink, EmptyBlock, ErrorBlock } from "../components/states";
import styles from "../subpage.module.css";

const MAX_SIZE_MB = 10;

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<{ dataset_id: number; dataset_name: string; created: number; linked: number } | null>(
    null,
  );

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setImported(null);
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    if (!datasetName.trim()) {
      setError("Give the dataset a name so the import can be identified.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`“${file.name}” is larger than the ${MAX_SIZE_MB} MB upload limit.`);
      return;
    }

    setBusy(true);
    try {
      const result = await api.previewImport(
        file,
        datasetName.trim(),
        description.trim(),
      );
      setPreview(result);
      setStatus(
        `Preview ready: ${result.quality.accepted_rows} row(s) accepted, ${result.quality.rejected_rows} rejected, ${result.quality.duplicate_records} duplicate(s). Nothing has been saved yet — review below, then confirm.`,
      );
    } catch (err) {
      setPreview(null);
      setError(
        err instanceof ApiFailure
          ? err.message
          : "The file could not be analysed. Check that it is a valid CSV with name and smiles columns.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!preview || !datasetName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.confirmImport({
        filename: preview.filename,
        dataset_name: datasetName.trim(),
        description: description.trim(),
        source_name: sourceName.trim(),
        records: preview.accepted,
        quality: preview.quality,
      });
      setImported(result);
      setPreview(null);
      setStatus(
        `Imported ${result.created} record(s) into dataset “${result.dataset_name}” (id ${result.dataset_id}); ${result.linked} duplicate structure(s) linked to existing molecules.`,
      );
    } catch (err) {
      setError(err instanceof ApiFailure ? err.message : "The import could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Import Dataset</h1>
        <p className={styles.subtitle}>
          Upload a CSV with <code>name</code> and <code>smiles</code> columns; optional columns are{" "}
          <code>external_id</code>, <code>source</code>, and <code>notes</code>. The file is parsed
          and validated on the backend before anything is saved. A review step must be confirmed
          before the dataset is created.
        </p>

        <section className={styles.section} aria-label="Choose CSV file">
          <h2 className={styles.sectionTitle}>1. Upload and validate</h2>
          <div className={styles.card}>
            <form className={styles.form} onSubmit={handlePreview}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="import-file">CSV file (max {MAX_SIZE_MB} MB)</label>
                  <input
                    id="import-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setPreview(null);
                      if (!datasetName.trim() && event.target.files?.[0]) {
                        setDatasetName(event.target.files[0].name.replace(/\.csv$/i, ""));
                      }
                    }}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="import-name">Dataset name</label>
                  <input
                    id="import-name"
                    type="text"
                    value={datasetName}
                    onChange={(event) => setDatasetName(event.target.value)}
                    placeholder="e.g. My compound set"
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="import-description">Description (optional)</label>
                  <input
                    id="import-description"
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What this dataset contains"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="import-source">Source name (optional)</label>
                  <input
                    id="import-source"
                    type="text"
                    value={sourceName}
                    onChange={(event) => setSourceName(event.target.value)}
                    placeholder="e.g. Lab measurements"
                  />
                </div>
              </div>
              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit" disabled={busy}>
                  {busy ? "Validating…" : "Validate file"}
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setStatus(null);
                    setError(null);
                    setDatasetName("");
                    setDescription("");
                    setSourceName("");
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
            {file && (
              <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
                Selected: {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            {error && (
              <div style={{ marginTop: "1rem" }}>
                <ErrorBlock message={error} />
              </div>
            )}
            {status && (
              <p className={styles.notice} role="status" style={{ marginTop: "1rem" }}>
                {status}
              </p>
            )}
          </div>
        </section>

        {imported && (
          <section className={styles.section} aria-label="Import result">
            <h2 className={styles.sectionTitle}>Import complete</h2>
            <div className={styles.card}>
              <p style={{ fontSize: "0.9rem", color: "#cbd5e1", marginBottom: "1rem" }}>
                Dataset “{imported.dataset_name}” (id {imported.dataset_id}) was created with{" "}
                {imported.created} new record(s) and {imported.linked} duplicate(s) linked to
                existing molecules.
              </p>
              <div className={styles.buttonRow}>
                <Link href="/library" className={styles.button}>
                  Open library →
                </Link>
                <Link href="/analytics" className={styles.secondaryButton}>
                  View analytics
                </Link>
              </div>
            </div>
          </section>
        )}

        {preview && (
          <>
            <section className={styles.section} aria-label="Quality report">
              <h2 className={styles.sectionTitle}>2. Review quality report</h2>
              <div className={styles.specsGrid}>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Rows read</div>
                  <div className={styles.specValue}>{preview.quality.total_rows_read}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Accepted</div>
                  <div className={styles.specValue}>{preview.quality.accepted_rows}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Rejected</div>
                  <div className={styles.specValue}>{preview.quality.rejected_rows}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Invalid structures</div>
                  <div className={styles.specValue}>{preview.quality.invalid_structures}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Missing fields</div>
                  <div className={styles.specValue}>{preview.quality.missing_required_fields}</div>
                </div>
                <div className={styles.specItem}>
                  <div className={styles.specLabel}>Duplicates (kept out)</div>
                  <div className={styles.specValue}>{preview.quality.duplicate_records}</div>
                </div>
              </div>
              {preview.truncated_rows > 0 && (
                <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
                  {preview.truncated_rows} row(s) exceeded the configured row limit and were not
                  analysed.
                </p>
              )}
            </section>

            <section className={styles.section} aria-label="Rejections and duplicates">
              <h2 className={styles.sectionTitle}>Rejections & duplicates</h2>
              {preview.rejected.length === 0 && preview.duplicates.length === 0 && (
                <EmptyBlock title="No rejected or duplicate rows." />
              )}
              {preview.rejected.length > 0 && (
                <div className={styles.tableWrap} style={{ marginBottom: "1rem" }}>
                  <table className={styles.table}>
                    <caption className={styles.hint}>
                      Rejected rows are excluded from the import but never silently deleted.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">CSV line</th>
                        <th scope="col">Reason</th>
                        <th scope="col">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rejected.map((row) => (
                        <tr key={row.row_number}>
                          <td>{row.row_number}</td>
                          <td>{row.reason.replace(/_/g, " ")}</td>
                          <td>{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {preview.duplicates.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption className={styles.hint}>
                      Duplicates are reported, not silently removed: exact input repeats and
                      identical canonical structures are distinguished here.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">CSV line</th>
                        <th scope="col">Type</th>
                        <th scope="col">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.duplicates.map((row) => (
                        <tr key={row.row_number}>
                          <td>{row.row_number}</td>
                          <td>{row.reason.replace(/_/g, " ")}</td>
                          <td>{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className={styles.section} aria-label="Accepted rows">
              <h2 className={styles.sectionTitle}>3. Accepted rows ({preview.accepted.length})</h2>
              {preview.accepted.length === 0 ? (
                <EmptyBlock title="Nothing to import — every row was rejected or duplicated." />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">SMILES</th>
                        <th scope="col">Formula</th>
                        <th scope="col">MW</th>
                        <th scope="col">LogP</th>
                        <th scope="col">HBD</th>
                        <th scope="col">HBA</th>
                        <th scope="col">TPSA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.accepted.map((row, index) => (
                        <tr key={`${row.smiles}-${index}`}>
                          <td>{row.name}</td>
                          <td>
                            <code>{row.canonical_smiles || row.smiles}</code>
                          </td>
                          <td>{row.formula || "—"}</td>
                          <td>{formatValue(row.molecular_weight)}</td>
                          <td>{formatValue(row.logp)}</td>
                          <td>{formatValue(row.hbd, 0)}</td>
                          <td>{formatValue(row.hba, 0)}</td>
                          <td>{formatValue(row.tpsa)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={styles.buttonRow} style={{ marginTop: "1rem" }}>
                <button
                  className={styles.button}
                  onClick={() => void handleConfirm()}
                  disabled={busy || preview.accepted.length === 0}
                >
                  {busy ? "Importing…" : `Confirm import of ${preview.accepted.length} record(s)`}
                </button>
                <button className={styles.secondaryButton} onClick={() => setPreview(null)}>
                  Cancel import
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

import Link from "next/link";
import styles from "../subpage.module.css";
import { BackLink } from "../components/states";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENDPOINTS = [
  { method: "GET", path: "/api/health", purpose: "Service status, app version, RDKit version." },
  { method: "GET", path: "/api/datasets", purpose: "All datasets with valid/invalid record counts and database-wide totals." },
  { method: "GET", path: "/api/datasets/{id}", purpose: "One dataset with its quality summary." },
  { method: "GET", path: "/api/molecules", purpose: "Search, filter, sort, and paginate molecules. See query parameters below." },
  { method: "GET", path: "/api/molecules/{id}", purpose: "Molecule detail: SMILES, formula, 2D SVG, descriptors with units and methods, provenance." },
  { method: "POST", path: "/api/molecules/validate", purpose: 'Validate {"smiles": "..."} and calculate descriptors when it parses.' },
  { method: "POST", path: "/api/datasets/import/preview", purpose: "Validate a CSV upload (multipart file + dataset_name); returns a quality report without saving anything." },
  { method: "POST", path: "/api/datasets/import", purpose: "Confirm a reviewed import and create the dataset." },
  { method: "GET", path: "/api/imports/{job_id}", purpose: "Import job status and quality counters." },
  { method: "POST", path: "/api/compare", purpose: 'Compare 2–4 molecules: {"molecule_ids": [1, 2]} with values, units, and absolute differences.' },
  { method: "GET", path: "/api/analytics/distribution", purpose: "Histogram bins, min/max/mean/median for one descriptor (?descriptor=, ?dataset_id=, ?bins=)." },
  { method: "GET", path: "/api/analytics/scatter", purpose: "Scatter points for two descriptors (?x=, ?y=, ?dataset_id=)." },
  { method: "GET", path: "/api/analytics/summary", purpose: "Reference statistics (min/max/mean/median) for every descriptor." },
  { method: "GET", path: "/api/export.csv", purpose: "Filtered CSV export honoring the same filters as molecule search." },
  { method: "GET", path: "/api/export/meta", purpose: "Export provenance: filters, versions, methods, warnings." },
];

const FILTERS = [
  "q (name, SMILES, or external ID)",
  "dataset_id",
  "page, page_size (1–200)",
  "sort_by: name, molecular_weight, logp, hbd, hba, tpsa, id",
  "sort_order: asc, desc",
  "mw_min, mw_max, logp_min, logp_max",
  "hbd_min, hbd_max, hba_min, hba_max, tpsa_min, tpsa_max",
];

const ERROR_CODES = [
  "INVALID_SMILES — the structure could not be parsed",
  "CALCULATION_FAILURE — parsed, but a descriptor failed",
  "MOLECULE_NOT_FOUND / DATASET_NOT_FOUND / IMPORT_JOB_NOT_FOUND",
  "UNSUPPORTED_SORT_FIELD / UNSUPPORTED_SORT_ORDER / UNSUPPORTED_FILTER / UNSUPPORTED_DESCRIPTOR",
  "INVALID_FILE_TYPE / INVALID_ENCODING / FILE_TOO_LARGE",
  "DATASET_NAME_EXISTS — pick a unique dataset name",
  "VALIDATION_ERROR — malformed request body or parameters",
];

export default function DevelopersPage() {
  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>For Developers</h1>
        <p className={styles.subtitle}>
          Use MoleculeLab&apos;s chemistry engine and molecular data from your own scripts. No
          authentication, no API keys — point at the base URL below. New to the chemistry?
          Start with <Link href="/docs" className={styles.inlineLink}>the methodology guide</Link>{" "}
          first.
        </p>

        <section className={styles.section} aria-label="Connection details">
          <h2 className={styles.sectionTitle}>Connection</h2>
          <div className={styles.card}>
            <div className={styles.specsGrid}>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>API base URL</div>
                <div className={styles.specValue}>{API_URL}/api</div>
              </div>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>Interactive docs</div>
                <div className={styles.specValue}>
                  <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
                    Swagger ↗
                  </a>{" "}
                  ·{" "}
                  <a href={`${API_URL}/redoc`} target="_blank" rel="noreferrer">
                    ReDoc ↗
                  </a>
                </div>
              </div>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>OpenAPI schema</div>
                <div className={styles.specValue}>
                  <a href={`${API_URL}/openapi.json`} target="_blank" rel="noreferrer">
                    openapi.json ↗
                  </a>
                </div>
              </div>
              <div className={styles.specItem}>
                <div className={styles.specLabel}>Auth / limits</div>
                <div className={styles.specValue}>None locally; be reasonable</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-label="Endpoints">
          <h2 className={styles.sectionTitle}>Endpoints</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Path</th>
                  <th scope="col">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((endpoint) => (
                  <tr key={`${endpoint.method} ${endpoint.path}`}>
                    <td>
                      <code>{endpoint.method}</code>
                    </td>
                    <td>
                      <code>{endpoint.path}</code>
                    </td>
                    <td>{endpoint.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section} aria-label="Molecule search parameters">
          <h2 className={styles.sectionTitle}>Molecule search parameters</h2>
          <div className={styles.card}>
            <ul className={styles.list}>
              {FILTERS.map((filter) => (
                <li key={filter}>
                  <code>{filter}</code>
                </li>
              ))}
            </ul>
            <p className={styles.hint}>
              Unknown <code>*_min</code>/<code>*_max</code> parameters are rejected with
              UNSUPPORTED_FILTER instead of being silently ignored — a misspelled filter can
              never quietly return unfiltered data.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-label="Examples">
          <h2 className={styles.sectionTitle}>Examples</h2>
          <div className={styles.card}>
            <h3 className={styles.chartTitle}>Search molecules (curl)</h3>
            <pre className={styles.codeBlock}>
              <code>{`curl "${API_URL}/api/molecules?q=caffeine&sort_by=molecular_weight&sort_order=desc"`}</code>
            </pre>
            <h3 className={styles.chartTitle} style={{ marginTop: "1rem" }}>
              Validate a SMILES string (JavaScript)
            </h3>
            <pre className={styles.codeBlock}>
              <code>{`const res = await fetch("${API_URL}/api/molecules/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ smiles: "CCO" }),
});
const result = await res.json();
// result.valid, result.canonical_smiles, result.formula,
// result.descriptors, result.structure_svg, result.rdkit_version`}</code>
            </pre>
          </div>
        </section>

        <section className={styles.section} aria-label="Errors">
          <h2 className={styles.sectionTitle}>Errors</h2>
          <div className={styles.card}>
            <p style={{ fontSize: "0.86rem", color: "#cbd5e1", marginBottom: "0.75rem" }}>
              Every failure uses one envelope — no stack traces or internals leak:
            </p>
            <pre className={styles.codeBlock}>
              <code>{`{ "error": { "code": "INVALID_SMILES", "message": "...", "details": {} } }`}</code>
            </pre>
            <ul className={styles.list} style={{ marginTop: "0.75rem" }}>
              {ERROR_CODES.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.section} aria-label="Notes for integrators">
          <h2 className={styles.sectionTitle}>Notes for integrators</h2>
          <div className={styles.card}>
            <ul className={styles.list}>
              <li>Descriptor values are full precision; missing values are null, never zero.</li>
              <li>CSV export honors the same filters as molecule search.</li>
              <li>CORS allows the local frontend origins; configure ALLOWED_ORIGINS to embed elsewhere.</li>
              <li>Calculation methods per descriptor are documented in the methodology guide.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

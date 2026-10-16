import Link from "next/link";
import styles from "../subpage.module.css";
import { BackLink } from "../components/states";

const DESCRIPTORS = [
  {
    name: "Molecular Weight",
    unit: "g/mol",
    method: "rdkit.Chem.Descriptors.MolWt",
    what: "Sum of standard atomic masses across the molecular formula.",
    reading: "Larger values mean heavier molecules. It says nothing about activity or safety.",
  },
  {
    name: "Crippen LogP (estimate)",
    unit: "dimensionless",
    method: "rdkit.Chem.Crippen.MolLogP",
    what: "Atom-contribution estimate of the octanol–water partition coefficient.",
    reading: "Higher values suggest a more lipid-like character in the model. This is a calculated estimate, not an experimental measurement.",
  },
  {
    name: "Hydrogen-Bond Donors (HBD)",
    unit: "count",
    method: "rdkit.Chem.Lipinski.NumHDonors",
    what: "Count of hydrogen atoms on electronegative nitrogen/oxygen centers.",
    reading: "A structural count, not a permeability or solubility prediction.",
  },
  {
    name: "Hydrogen-Bond Acceptors (HBA)",
    unit: "count",
    method: "rdkit.Chem.Lipinski.NumHAcceptors",
    what: "Count of nitrogen/oxygen heteroatoms available as H-bond acceptors.",
    reading: "A structural count under Lipinski definitions; definitions vary between toolkits.",
  },
  {
    name: "Topological Polar Surface Area (TPSA)",
    unit: "Å²",
    method: "rdkit.Chem.Descriptors.TPSA",
    what: "Sum of polar atom surface-area contributions over polar fragments.",
    reading: "Describes polar surface in the topological model only — not permeability, solubility, or clinical behaviour.",
  },
];

export default function DocsPage() {
  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Methodology & Limitations</h1>
        <p className={styles.subtitle}>
          How MoleculeLab calculates values, where data comes from, and what descriptors cannot
          tell you. Read this before citing any number from the platform.
        </p>

        <section className={styles.section} aria-label="Descriptor methodology">
          <h2 className={styles.sectionTitle}>Descriptor methodology</h2>
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Descriptor</th>
                  <th scope="col">Unit</th>
                  <th scope="col">RDKit method</th>
                </tr>
              </thead>
              <tbody>
                {DESCRIPTORS.map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}</td>
                    <td>{d.unit}</td>
                    <td><code>{d.method}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className={styles.list}>
              {DESCRIPTORS.map((d) => (
                <li key={d.name}>
                  <strong>{d.name}:</strong> {d.what} {d.reading}
                </li>
              ))}
            </ul>
            <p className={styles.hint}>
              All chemistry runs on the backend. Full-precision values are stored; displayed
              values are rounded to 4 decimals. Missing values are never replaced with zero.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-label="Scientific limitations">
          <h2 className={styles.sectionTitle}>What descriptors cannot establish</h2>
          <div className={styles.notice} role="alert">
            <span aria-hidden="true">⚠</span>
            <span>
              Molecular descriptors alone do not establish biological activity, drug efficacy,
              safety, toxicity, solubility, permeability, or clinical usefulness. MoleculeLab is
              an educational exploration tool — not a clinical, drug-discovery, or therapeutic
              selection system.
            </span>
          </div>
        </section>

        <section className={styles.section} aria-label="Data rules">
          <h2 className={styles.sectionTitle}>Data & provenance rules</h2>
          <div className={styles.card}>
            <ul className={styles.list}>
              <li>Original SMILES is stored separately from canonical SMILES; input is never silently repaired.</li>
              <li>Each descriptor records its method, RDKit version, and calculation timestamp.</li>
              <li>Valid zero, missing value, invalid structure, and calculation failure are distinct states.</li>
              <li>Datasets record source name/URL, version, import timestamp, and attribution.</li>
              <li>API errors use the shape {"{ \"error\": { \"code\", \"message\", \"details\" } }"} with no stack traces or secrets.</li>
            </ul>
          </div>
        </section>

        <section className={styles.section} aria-label="For developers">
          <h2 className={styles.sectionTitle}>For developers</h2>
          <div className={styles.card}>
            <p style={{ fontSize: "0.88rem", color: "#cbd5e1", marginBottom: "1rem" }}>
              Want to call MoleculeLab from your own code? Endpoints, parameters, examples, and
              error codes live on the developer page.
            </p>
            <div className={styles.buttonRow}>
              <Link href="/developers" className={styles.button}>
                Open developer docs →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

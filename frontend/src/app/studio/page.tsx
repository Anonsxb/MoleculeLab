"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./studio.module.css";
import type { StudioData, StudioAtom } from "./StudioViewer";
import { useEditor } from "./editorContext";
import { EditorToolbar } from "./EditorToolbar";
import { EditorProvider } from "./EditorProvider";

// Dynamic import with ssr: false for Three.js WebGL component
const StudioViewer = dynamic(() => import("./StudioViewer"), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      Initializing WebGL 3D Chemistry Viewport...
    </div>
  ),
});

const DEFAULT_PRESETS = [
  { id: "caffeine", name: "Caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", category: "Bioactive Heterocycles" },
  { id: "aspirin", name: "Aspirin", smiles: "CC(=O)Oc1ccccc1C(=O)O", category: "Pharmaceuticals" },
  { id: "benzene", name: "Benzene", smiles: "c1ccccc1", category: "Aromatic" },
  { id: "water", name: "Water", smiles: "O", category: "Inorganics" },
  { id: "glucose", name: "D-Glucose", smiles: "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O", category: "Carbohydrates" },
  { id: "atp", name: "ATP", smiles: "Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]1O", category: "Biochemical" },
  { id: "penicillin", name: "Penicillin G", smiles: "CC1(C)S[C@@H]2[C@H](NC(=O)Cc3ccccc3)C(=O)N2[C@H]1C(=O)O", category: "Antibiotics" },
  { id: "dopamine", name: "Dopamine", smiles: "NCCc1ccc(O)c(O)c1", category: "Neurotransmitters" },
];

// Inner component that uses the editor context (must be rendered inside EditorProvider)
function StudioPageInner() {
  const { state: editorState, dispatch: editorDispatch } = useEditor();

  const [smilesInput, setSmilesInput] = useState("CN1C=NC2=C1C(=O)N(C(=O)N2C)C");
  const [forceField, setForceField] = useState("MMFF94");
  const [optimize, setOptimize] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activePreset, setActivePreset] = useState<string>("caffeine");
  const [studioData, setStudioData] = useState<StudioData | null>(null);

  // Viewport display state
  const [viewMode, setViewMode] = useState<"ball_stick" | "spacefill" | "stick" | "charge">("ball_stick");
  const [showHydrogens, setShowHydrogens] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);

  // Inspector & measurement state
  const [selectedAtom, setSelectedAtom] = useState<StudioAtom | null>(null);
  const [activeMeasurement, setActiveMeasurement] = useState<{ type: string; atoms: number[]; value: string } | null>(null);

  const handleEditorAction = useCallback((action: any) => {
    editorDispatch(action);
  }, [editorDispatch]);

  // Build molecule from SMILES
  const buildMolecule = useCallback(async (smiles: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/studio/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smiles,
          optimize,
          max_iterations: 500,
          force_field: forceField,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to generate 3D conformer");
      }

      const data = await res.json();
      setStudioData(data);
      setSelectedAtom(null);
      setActiveMeasurement(null);
      // Initialise editor graph from fetched data
      editorDispatch({
        type: "RESET",
        payload: {
          atoms: data.atoms,
          bonds: data.bonds,
          mode: "select",
          history: [],
          future: [],
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error generating 3D structure";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [forceField, optimize, editorDispatch]);

  // Initial load
  useEffect(() => {
    buildMolecule(smilesInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPreset = (preset: typeof DEFAULT_PRESETS[0]) => {
    setActivePreset(preset.id);
    setSmilesInput(preset.smiles);
    buildMolecule(preset.smiles);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActivePreset("");
    buildMolecule(smilesInput);
  };

  // Download export format file (PDB, XYZ, MOL)
  const downloadFile = (content: string | undefined, filename: string, mime: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (fmt: "pdb" | "xyz" | "mol") => {
    if (!studioData?.formats) return;
    const formula = studioData.formula || "molecule";
    if (fmt === "pdb") {
      downloadFile(studioData.formats.pdb, `${formula}_3D.pdb`, "chemical/x-pdb");
    } else if (fmt === "xyz") {
      downloadFile(studioData.formats.xyz, `${formula}_3D.xyz`, "chemical/x-xyz");
    } else if (fmt === "mol") {
      downloadFile(studioData.formats.mol, `${formula}_3D.mol`, "chemical/x-mdl-molfile");
    }
  };

  return (
    <div className={styles.container}>
      <EditorToolbar />
      {/* Top Header / Toolbar */}
      <header className={styles.headerBar}>
        <div className={styles.titleArea}>
          <span className={styles.badge}>Avogadro-Class Studio</span>
          <h1 className={styles.title}>
            🔬 3D Computational Chemistry Workbench
          </h1>
          <p className={styles.subtitle}>
            ETKDG 3D Conformer Generator · MMFF94 Force Field · Gasteiger Electrostatics
          </p>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          {/* Representation Mode */}
          <div className={styles.toolGroup}>
            <button
              className={`${styles.toolBtn} ${viewMode === 'ball_stick' ? styles.toolBtnActive : ''}`}
              onClick={() => setViewMode('ball_stick')}
              title="Ball and Stick representation"
            >
              🧪 Ball &amp; Stick
            </button>
            <button
              className={`${styles.toolBtn} ${viewMode === 'spacefill' ? styles.toolBtnActive : ''}`}
              onClick={() => setViewMode('spacefill')}
              title="Spacefill van der Waals CPK spheres"
            >
              🌐 Spacefill
            </button>
            <button
              className={`${styles.toolBtn} ${viewMode === 'stick' ? styles.toolBtnActive : ''}`}
              onClick={() => setViewMode('stick')}
              title="Stick representation"
            >
              🥢 Stick
            </button>
            <button
              className={`${styles.toolBtn} ${viewMode === 'charge' ? styles.toolBtnActive : ''}`}
              onClick={() => setViewMode('charge')}
              title="Color atoms by Gasteiger partial charges"
            >
              ⚡ Charges
            </button>
          </div>

          {/* Toggles */}
          <div className={styles.toolGroup}>
            <button
              className={`${styles.toolBtn} ${showHydrogens ? styles.toolBtnActive : ''}`}
              onClick={() => setShowHydrogens(!showHydrogens)}
              title="Toggle explicit hydrogen atoms"
            >
              💧 Hydrogens ({showHydrogens ? 'On' : 'Off'})
            </button>
            <button
              className={`${styles.toolBtn} ${autoRotate ? styles.toolBtnActive : ''}`}
              onClick={() => setAutoRotate(!autoRotate)}
              title="Auto-rotate turntable"
            >
              🔄 Turntable
            </button>
          </div>

          {/* Export Group */}
          <div className={styles.toolGroup}>
            <button
              className={styles.exportBtn}
              onClick={() => handleExport('pdb')}
              title="Download Protein Data Bank format"
            >
              Export PDB
            </button>
            <button
              className={styles.exportBtn}
              onClick={() => handleExport('xyz')}
              title="Download Cartesian coordinates format (ORCA, Gaussian, Q-Chem)"
            >
              Export XYZ
            </button>
            <button
              className={styles.exportBtn}
              onClick={() => handleExport('mol')}
              title="Download MDL Molfile V2000"
            >
              Export MOL
            </button>
          </div>

          <Link
            href="/modelling"
            className={styles.submitBtn}
            style={{ width: 'auto', textDecoration: 'none', padding: '5px 12px', fontSize: '0.8rem' }}
            title="Open full interactive 3D Molecular Modelling Workstation"
          >
            ⚛️ 3D Modelling Workstation
          </Link>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className={styles.workspace}>
        {/* Left Sidebar: Molecule Inputs & Presets */}
        <aside className={styles.sidebar}>
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Structure Input</h2>
            <form onSubmit={handleSubmit}>
              <label htmlFor="smiles-input" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                SMILES String
              </label>
              <input
                id="smiles-input"
                type="text"
                className={styles.inputField}
                value={smilesInput}
                onChange={(e) => setSmilesInput(e.target.value)}
                placeholder="e.g. CCO or c1ccccc1"
              />

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="force-field-select" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                    Force Field
                  </label>
                  <select
                    id="force-field-select"
                    className={styles.inputField}
                    value={forceField}
                    onChange={(e) => setForceField(e.target.value)}
                    style={{ marginBottom: 0 }}
                  >
                    <option value="MMFF94">MMFF94</option>
                    <option value="UFF">UFF</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 16 }}>
                  <input
                    id="opt-checkbox"
                    type="checkbox"
                    checked={optimize}
                    onChange={(e) => setOptimize(e.target.checked)}
                  />
                  <label htmlFor="opt-checkbox" style={{ fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Minimize
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading || !smilesInput.trim()}
              >
                {loading ? 'Computing 3D Geometry...' : 'Build & Optimize Conformer'}
              </button>
            </form>

            {errorMsg && (
              <div style={{ color: 'var(--color-error)', fontSize: '0.78rem', marginTop: 8, background: 'var(--color-error-bg)', padding: 8, borderRadius: 6, border: '1px solid var(--color-error-border)' }}>
                {errorMsg}
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className={styles.panelCard} style={{ flex: 1 }}>
            <h2 className={styles.panelTitle}>Preset Structures</h2>
            <div className={styles.presetList}>
              {DEFAULT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`${styles.presetItem} ${activePreset === p.id ? styles.presetActive : ''}`}
                  onClick={() => handleSelectPreset(p)}
                >
                  <span className={styles.presetName}>{p.name}</span>
                  <span className={styles.presetCategory}>{p.category}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: 3D Three.js Viewport */}
        <section className={styles.viewportContainer}>
          {studioData && (
            <StudioViewer
              data={{
                ...studioData,
                atoms: editorState.atoms.length > 0 ? editorState.atoms as any : studioData.atoms,
                bonds: editorState.bonds.length > 0 ? editorState.bonds as any : studioData.bonds,
              }}
              mode={viewMode}
              showHydrogens={showHydrogens}
              showLabels={false}
              autoRotate={autoRotate}
              onSelectAtom={setSelectedAtom}
              onMeasurementChange={setActiveMeasurement}
              editorMode={editorState.mode}
              elementToAdd={editorState.elementToAdd}
              bondOrderToAdd={editorState.bondOrderToAdd}
              selectedEditorAtom={editorState.selectedAtom}
              onEditorAction={handleEditorAction}
            />
          )}
        </section>

        {/* Right Sidebar: Computational Chemistry Inspector */}
        <aside className={styles.rightSidebar}>
          {/* Energy & Optimization Card */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>
              <span>Force Field Mechanics</span>
              {studioData?.converged && (
                <span className={styles.convergedPill}>Converged</span>
              )}
            </h2>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Force Field</span>
              <span className={styles.metricValue}>{studioData?.force_field || 'MMFF94'}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Initial Energy</span>
              <span className={styles.metricValue}>
                {studioData?.initial_energy_kcal_mol !== undefined && studioData?.initial_energy_kcal_mol !== null
                  ? `${studioData.initial_energy_kcal_mol.toFixed(3)} kcal/mol`
                  : '—'}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Optimized Energy</span>
              <span className={styles.metricValue} style={{ color: 'var(--brand-primary)' }}>
                {studioData?.final_energy_kcal_mol !== undefined && studioData?.final_energy_kcal_mol !== null
                  ? `${studioData.final_energy_kcal_mol.toFixed(3)} kcal/mol`
                  : '—'}
              </span>
            </div>
            {studioData?.energy_delta_kcal_mol !== undefined && studioData?.energy_delta_kcal_mol !== null && (
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Stabilization (ΔE)</span>
                <span className={styles.metricValue} style={{ color: 'var(--color-success)' }}>
                  {studioData.energy_delta_kcal_mol.toFixed(3)} kcal/mol
                </span>
              </div>
            )}
          </div>

          {/* Molecule Topology */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Molecular Topology</h2>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Formula</span>
              <span className={styles.metricValue}>{studioData?.formula || '—'}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Total Atoms</span>
              <span className={styles.metricValue}>{studioData?.atoms.length || 0}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Total Bonds</span>
              <span className={styles.metricValue}>{studioData?.bonds.length || 0}</span>
            </div>
            {viewMode === 'charge' && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Gasteiger Charge Scale:
                </div>
                <div className={styles.chargeLegend}>
                  <span>-0.6 (Electronegative)</span>
                  <div className={styles.chargeGradient} />
                  <span>+0.6 (Electropositive)</span>
                </div>
              </div>
            )}
          </div>

          {/* Geometry Measurement Tool */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Geometry Inspector</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 6px 0' }}>
              Select atoms in the 3D viewport to inspect distances, angles, or dihedrals.
            </p>

            {activeMeasurement ? (
              <div className={styles.measurementBox}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                  {activeMeasurement.type}
                </div>
                <div className={styles.measurementResult}>
                  {activeMeasurement.value}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '6px 0' }}>
                No measurement active. Click 2 atoms for distance, 3 for bond angle, 4 for dihedral angle.
              </div>
            )}

            {selectedAtom && (
              <div className={styles.inspectAtomBox}>
                <div style={{ fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 4 }}>
                  Atom {selectedAtom.index + 1}: {selectedAtom.symbol} (Atomic #{selectedAtom.atomic_number})
                </div>
                <div>Coordinates: ({selectedAtom.x}, {selectedAtom.y}, {selectedAtom.z}) Å</div>
                <div>Partial Charge: {selectedAtom.gasteiger_charge.toFixed(4)} e</div>
                <div>vdW Radius: {selectedAtom.vdw_radius} Å · Cov: {selectedAtom.covalent_radius} Å</div>
                <div>Aromatic: {selectedAtom.is_aromatic ? 'Yes' : 'No'} · Hybridization: {selectedAtom.hybridization}</div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

// Outer wrapper that provides the editor context
export default function StudioPage() {
  return (
    <EditorProvider>
      <StudioPageInner />
    </EditorProvider>
  );
}

"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./modelling.module.css";
import type {
  ModellingAtom,
  ModellingBond,
  ModellingTool,
  RenderMode,
  MeasurementResult,
  HistoryEntry,
} from "./types";
import {
  COMMON_ELEMENTS,
  getElement,
  searchElements,
  computeMolecularStats,
  checkValenceWarnings,
  detectVSEPRGeometries,
} from "./elements";
import { SAMPLE_MOLECULES, SampleMolecule } from "./samples";
import {
  exportXYZ,
  parseXYZ,
  exportMOL,
  exportPDB,
  saveProjectJSON,
  downloadFile,
} from "./fileUtils";

// Dynamic import with ssr: false for Three.js WebGL component
const ModellingViewer = dynamic(() => import("./ModellingViewer"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
      Initializing WebGL 3D Chemistry Viewport...
    </div>
  ),
});

// Common templates
const FRAGMENT_TEMPLATES = [
  { id: "benzene", name: "Benzene Ring", icon: "⌬" },
  { id: "cyclohexane", name: "Cyclohexane Chair", icon: "⎔" },
  { id: "hydroxyl", name: "Hydroxyl (-OH)", icon: "—OH" },
  { id: "amino", name: "Amino (-NH₂)", icon: "—NH₂" },
  { id: "carboxyl", name: "Carboxyl (-COOH)", icon: "—COOH" },
  { id: "methyl", name: "Methyl (-CH₃)", icon: "—CH₃" },
];

export default function ModellingPage() {
  // Molecule graph state: start with a pre-loaded editable molecule (Ethanol)
  const initialSample = SAMPLE_MOLECULES.find((m) => m.id === "ethanol") || SAMPLE_MOLECULES[0];
  const [atoms, setAtoms] = useState<ModellingAtom[]>(initialSample.atoms);
  const [bonds, setBonds] = useState<ModellingBond[]>(initialSample.bonds);

  // Undo / Redo history
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  // Push to history before state modification
  const recordHistory = useCallback(
    (description: string, prevAtoms = atoms, prevBonds = bonds) => {
      setHistory((prev) => [...prev, { atoms: prevAtoms, bonds: prevBonds, description }]);
      setFuture([]);
    },
    [atoms, bonds]
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setFuture((prev) => [{ atoms, bonds, description: "Undo step" }, ...prev]);
    setAtoms(last.atoms);
    setBonds(last.bonds);
    setHistory((prev) => prev.slice(0, -1));
  }, [atoms, bonds, history]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((prev) => [...prev, { atoms, bonds, description: "Redo step" }]);
    setAtoms(next.atoms);
    setBonds(next.bonds);
    setFuture((prev) => prev.slice(1));
  }, [atoms, bonds, future]);

  // Active Tool & Element state
  const [activeTool, setActiveTool] = useState<ModellingTool>("add_atom");
  const [selectedElement, setSelectedElement] = useState<string>("C");
  const [elementSearch, setElementSearch] = useState<string>("");
  const [bondOrderToAdd, setBondOrderToAdd] = useState<number>(1);

  // Selection
  const [selectedAtom, setSelectedAtom] = useState<ModellingAtom | null>(null);
  const [selectedBond, setSelectedBond] = useState<ModellingBond | null>(null);

  // Measurements
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null);

  // Viewport display controls
  const [renderMode, setRenderMode] = useState<RenderMode>("ball_stick");
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showBonds, setShowBonds] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [cameraViewTrigger, setCameraViewTrigger] = useState<string>("");

  // Loading & status alerts
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "info" | "success" | "error" } | null>({
    text: "Welcome to 3D Modelling! Click on an atom to sprout in 3D, or select an atom to move it with the 3D XYZ Gizmo.",
    type: "info",
  });
  const [optimizing, setOptimizing] = useState<boolean>(false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered elements for periodic drawer
  const filteredElements = useMemo(() => searchElements(elementSearch), [elementSearch]);

  // Live computations
  const stats = useMemo(() => computeMolecularStats(atoms, bonds), [atoms, bonds]);
  const valenceWarnings = useMemo(() => checkValenceWarnings(atoms, bonds), [atoms, bonds]);
  const warningAtomIds = useMemo(() => valenceWarnings.map((w) => w.atomId), [valenceWarnings]);
  const vseprGeometries = useMemo(() => detectVSEPRGeometries(atoms, bonds), [atoms, bonds]);

  // Connected atoms for current selected atom
  const selectedAtomConnections = useMemo(() => {
    if (!selectedAtom) return [];
    return bonds
      .filter((b) => b.atom1 === selectedAtom.id || b.atom2 === selectedAtom.id)
      .map((b) => {
        const neighborId = b.atom1 === selectedAtom.id ? b.atom2 : b.atom1;
        const neighbor = atoms.find((a) => a.id === neighborId);
        return {
          bondId: b.id,
          order: b.order,
          length: b.length,
          neighborId,
          neighborSymbol: neighbor?.symbol || "?",
          neighborName: neighbor?.name || "Unknown",
        };
      });
  }, [atoms, bonds, selectedAtom]);

  // Helper: Next atom ID
  const getNextId = useCallback(() => {
    if (atoms.length === 0) return 1;
    return Math.max(...atoms.map((a) => a.id)) + 1;
  }, [atoms]);

  // Camera preset trigger helper
  const triggerCameraView = (view: "reset" | "front" | "top" | "side") => {
    setCameraViewTrigger(view);
    setTimeout(() => setCameraViewTrigger(""), 100);
  };

  // ACTION: Add Atom (either at specific 3D coordinate or sprouted from an existing atom in 3D)
  const handleAddAtomAt = useCallback(
    (pos: { x: number; y: number; z: number }, sproutFromAtomId?: number) => {
      recordHistory(`Add atom ${selectedElement}`);
      const newId = getNextId();
      const el = getElement(selectedElement);

      if (sproutFromAtomId !== undefined) {
        // Avogadro-style 3D sprout from clicked atom!
        const parent = atoms.find((a) => a.id === sproutFromAtomId);
        if (!parent) return;

        // Find connected neighbors
        const neighborIds = bonds
          .filter((b) => b.atom1 === parent.id || b.atom2 === parent.id)
          .map((b) => (b.atom1 === parent.id ? b.atom2 : b.atom1));
        const neighbors = atoms.filter((a) => neighborIds.includes(a.id));

        // Standard chemical bond length based on covalent radii sum
        const bondLength = Math.max(1.0, el.covalentRadius + parent.covalentRadius);

        // Compute optimal sprouting direction in true 3D space
        let sproutPos = { x: parent.x + bondLength, y: parent.y, z: parent.z };

        if (neighbors.length === 1) {
          const n = neighbors[0];
          const dx = parent.x - n.x;
          const dy = parent.y - n.y;
          const dz = parent.z - n.z;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const u = { x: dx / len, y: dy / len, z: dz / len };
          const perp = Math.abs(u.z) < 0.9 ? { x: -u.y, y: u.x, z: 0.3 } : { x: 0.3, y: -u.z, z: u.y };
          const pLen = Math.sqrt(perp.x * perp.x + perp.y * perp.y + perp.z * perp.z) || 1;
          const p = { x: perp.x / pLen, y: perp.y / pLen, z: perp.z / pLen };

          // 109.5 degree angle continuation (sp3 tetrahedral)
          sproutPos = {
            x: Math.round((parent.x + u.x * 0.333 * bondLength + p.x * 0.943 * bondLength) * 100) / 100,
            y: Math.round((parent.y + u.y * 0.333 * bondLength + p.y * 0.943 * bondLength) * 100) / 100,
            z: Math.round((parent.z + u.z * 0.333 * bondLength + p.z * 0.943 * bondLength) * 100) / 100,
          };
        } else if (neighbors.length === 2) {
          const n1 = neighbors[0];
          const n2 = neighbors[1];
          const sum = {
            x: -(n1.x - parent.x + (n2.x - parent.x)),
            y: -(n1.y - parent.y + (n2.y - parent.y)),
            z: -(n1.z - parent.z + (n2.z - parent.z)),
          };
          const sLen = Math.sqrt(sum.x * sum.x + sum.y * sum.y + sum.z * sum.z) || 1;
          sproutPos = {
            x: Math.round((parent.x + (sum.x / sLen) * bondLength) * 100) / 100,
            y: Math.round((parent.y + (sum.y / sLen) * bondLength) * 100) / 100,
            z: Math.round((parent.z + (sum.z / sLen) * bondLength + 0.35) * 100) / 100,
          };
        } else if (neighbors.length >= 3) {
          let cx = 0, cy = 0, cz = 0;
          neighbors.forEach((n) => {
            cx += n.x - parent.x;
            cy += n.y - parent.y;
            cz += n.z - parent.z;
          });
          const d = { x: -cx, y: -cy, z: -cz };
          const dLen = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) || 1;
          sproutPos = {
            x: Math.round((parent.x + (d.x / dLen) * bondLength) * 100) / 100,
            y: Math.round((parent.y + (d.y / dLen) * bondLength) * 100) / 100,
            z: Math.round((parent.z + (d.z / dLen) * bondLength) * 100) / 100,
          };
        }

        const newAtom: ModellingAtom = {
          id: newId,
          symbol: el.symbol,
          name: el.name,
          atomicNumber: el.atomicNumber,
          mass: el.mass,
          x: sproutPos.x,
          y: sproutPos.y,
          z: sproutPos.z,
          vdwRadius: el.vdwRadius,
          covalentRadius: el.covalentRadius,
          color: el.color,
          isHydrogen: el.symbol === "H",
        };

        const newBond: ModellingBond = {
          id: `${parent.id}-${newId}`,
          atom1: parent.id,
          atom2: newId,
          order: 1,
          length: bondLength,
        };

        setAtoms((prev) => [...prev, newAtom]);
        setBonds((prev) => [...prev, newBond]);
        setSelectedAtom(newAtom);
        setStatusMsg({ text: `Sprouted ${el.name} (${el.symbol}${newId}) in 3D from ${parent.symbol}${parent.id}.`, type: "success" });
      } else {
        // Place atom at clicked canvas point
        const newAtom: ModellingAtom = {
          id: newId,
          symbol: el.symbol,
          name: el.name,
          atomicNumber: el.atomicNumber,
          mass: el.mass,
          x: pos.x,
          y: pos.y,
          z: pos.z,
          vdwRadius: el.vdwRadius,
          covalentRadius: el.covalentRadius,
          color: el.color,
          isHydrogen: el.symbol === "H",
        };
        setAtoms((prev) => [...prev, newAtom]);
        setSelectedAtom(newAtom);
        setStatusMsg({ text: `Placed new ${el.name} atom (${el.symbol}${newId}) at (${pos.x}, ${pos.y}, ${pos.z}).`, type: "success" });
      }
    },
    [atoms, bonds, getNextId, recordHistory, selectedElement]
  );

  // ACTION: Move Atom (via 3D Gizmo drag, direct drag, or coordinate nudge buttons)
  const handleMoveAtom = useCallback(
    (atomId: number, newPos: { x: number; y: number; z: number }) => {
      setAtoms((prev) =>
        prev.map((a) => (a.id === atomId ? { ...a, x: newPos.x, y: newPos.y, z: newPos.z } : a))
      );
      if (selectedAtom?.id === atomId) {
        setSelectedAtom((prev) => (prev ? { ...prev, ...newPos } : null));
      }
    },
    [selectedAtom]
  );

  // Nudge selected atom along a chosen 3D axis
  const handleNudgeAxis = useCallback(
    (axis: "x" | "y" | "z", delta: number) => {
      if (!selectedAtom) return;
      const nextPos = {
        x: axis === "x" ? Math.round((selectedAtom.x + delta) * 100) / 100 : selectedAtom.x,
        y: axis === "y" ? Math.round((selectedAtom.y + delta) * 100) / 100 : selectedAtom.y,
        z: axis === "z" ? Math.round((selectedAtom.z + delta) * 100) / 100 : selectedAtom.z,
      };
      handleMoveAtom(selectedAtom.id, nextPos);
    },
    [handleMoveAtom, selectedAtom]
  );

  // ACTION: Delete Atom
  const handleDeleteAtom = useCallback(
    (atomId: number) => {
      recordHistory(`Delete atom ${atomId}`);
      setAtoms((prev) => prev.filter((a) => a.id !== atomId));
      setBonds((prev) => prev.filter((b) => b.atom1 !== atomId && b.atom2 !== atomId));
      if (selectedAtom?.id === atomId) setSelectedAtom(null);
      setStatusMsg({ text: `Deleted atom and all connected bonds.`, type: "info" });
    },
    [recordHistory, selectedAtom]
  );

  // ACTION: Add Bond between two atoms (Fixed: scene never disappears!)
  const handleAddBond = useCallback(
    (atom1Id: number, atom2Id: number) => {
      if (atom1Id === atom2Id) return;
      recordHistory(`Add bond ${atom1Id}-${atom2Id}`);

      // Check if bond already exists
      const existing = bonds.find(
        (b) =>
          (b.atom1 === atom1Id && b.atom2 === atom2Id) ||
          (b.atom1 === atom2Id && b.atom2 === atom1Id)
      );

      if (existing) {
        // Cycle bond order: 1 -> 2 -> 3 -> 1
        const nextOrder = existing.order === 1 ? 2 : existing.order === 2 ? 3 : 1;
        setBonds((prev) =>
          prev.map((b) => (b.id === existing.id ? { ...b, order: nextOrder } : b))
        );
        setStatusMsg({ text: `Updated bond order to ${nextOrder === 1 ? "Single" : nextOrder === 2 ? "Double" : "Triple"}.`, type: "success" });
      } else {
        const a1 = atoms.find((a) => a.id === atom1Id);
        const a2 = atoms.find((a) => a.id === atom2Id);
        let len = 1.45;
        if (a1 && a2) {
          const dx = a1.x - a2.x;
          const dy = a1.y - a2.y;
          const dz = a1.z - a2.z;
          len = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 100) / 100;
        }

        const newBond: ModellingBond = {
          id: `${atom1Id}-${atom2Id}`,
          atom1: atom1Id,
          atom2: atom2Id,
          order: bondOrderToAdd,
          length: len,
        };
        setBonds((prev) => [...prev, newBond]);
        setSelectedBond(newBond);
        setStatusMsg({ text: `Connected ${a1?.symbol || ""}${atom1Id} to ${a2?.symbol || ""}${atom2Id} with a ${bondOrderToAdd === 1 ? "single" : bondOrderToAdd === 2 ? "double" : "triple"} bond (${len} Å).`, type: "success" });
      }
    },
    [atoms, bondOrderToAdd, bonds, recordHistory]
  );

  // ACTION: Cycle Bond Order
  const handleChangeBondOrder = useCallback(
    (bondId: string) => {
      recordHistory(`Change bond order ${bondId}`);
      setBonds((prev) =>
        prev.map((b) => {
          if (b.id === bondId) {
            const nextOrder = b.order === 1 ? 2 : b.order === 2 ? 3 : 1;
            return { ...b, order: nextOrder };
          }
          return b;
        })
      );
    },
    [recordHistory]
  );

  // ACTION: Delete Bond
  const handleDeleteBond = useCallback(
    (bondId: string) => {
      recordHistory(`Delete bond ${bondId}`);
      setBonds((prev) => prev.filter((b) => b.id !== bondId));
      if (selectedBond?.id === bondId) setSelectedBond(null);
      setStatusMsg({ text: "Deleted bond.", type: "info" });
    },
    [recordHistory, selectedBond]
  );

  // ACTION: Load Ready-Made Editable Sample
  const handleLoadSample = useCallback(
    (sample: SampleMolecule) => {
      recordHistory(`Load ${sample.name}`);
      setAtoms(sample.atoms);
      setBonds(sample.bonds);
      setSelectedAtom(null);
      setSelectedBond(null);
      setMeasurement(null);
      triggerCameraView("reset");
      setStatusMsg({ text: `Loaded editable ${sample.name} (${sample.formula}). You can now modify its atoms and bonds!`, type: "success" });
    },
    [recordHistory]
  );

  // ACTION: Add Ring / Fragment Template
  const handleAddTemplate = useCallback(
    (templateId: string) => {
      recordHistory(`Add template ${templateId}`);
      const startId = getNextId();
      let newAtomsList: ModellingAtom[] = [];
      let newBondsList: ModellingBond[] = [];

      const origin = selectedAtom ? { x: selectedAtom.x + 1.5, y: selectedAtom.y, z: selectedAtom.z } : { x: 0, y: 0, z: 0 };

      if (templateId === "benzene") {
        const radius = 1.4;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const el = getElement("C");
          newAtomsList.push({
            id: startId + i,
            symbol: "C",
            name: "Carbon",
            atomicNumber: 6,
            mass: 12.011,
            x: Math.round((origin.x + radius * Math.cos(angle)) * 100) / 100,
            y: Math.round((origin.y + radius * Math.sin(angle)) * 100) / 100,
            z: origin.z,
            vdwRadius: el.vdwRadius,
            covalentRadius: el.covalentRadius,
            color: el.color,
            isHydrogen: false,
          });
        }
        for (let i = 0; i < 6; i++) {
          newBondsList.push({
            id: `${startId + i}-${startId + ((i + 1) % 6)}`,
            atom1: startId + i,
            atom2: startId + ((i + 1) % 6),
            order: 1.5,
            length: 1.4,
          });
        }
        if (selectedAtom) {
          newBondsList.push({
            id: `${selectedAtom.id}-${startId}`,
            atom1: selectedAtom.id,
            atom2: startId,
            order: 1,
            length: 1.48,
          });
        }
      } else if (templateId === "cyclohexane") {
        const radius = 1.54;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const el = getElement("C");
          newAtomsList.push({
            id: startId + i,
            symbol: "C",
            name: "Carbon",
            atomicNumber: 6,
            mass: 12.011,
            x: Math.round((origin.x + radius * Math.cos(angle)) * 100) / 100,
            y: Math.round((origin.y + radius * Math.sin(angle)) * 100) / 100,
            z: Math.round((origin.z + (i % 2 === 0 ? 0.35 : -0.35)) * 100) / 100,
            vdwRadius: el.vdwRadius,
            covalentRadius: el.covalentRadius,
            color: el.color,
            isHydrogen: false,
          });
        }
        for (let i = 0; i < 6; i++) {
          newBondsList.push({
            id: `${startId + i}-${startId + ((i + 1) % 6)}`,
            atom1: startId + i,
            atom2: startId + ((i + 1) % 6),
            order: 1,
            length: 1.54,
          });
        }
        if (selectedAtom) {
          newBondsList.push({
            id: `${selectedAtom.id}-${startId}`,
            atom1: selectedAtom.id,
            atom2: startId,
            order: 1,
            length: 1.54,
          });
        }
      } else if (templateId === "hydroxyl") {
        const oEl = getElement("O");
        const hEl = getElement("H");
        newAtomsList.push(
          {
            id: startId,
            symbol: "O",
            name: "Oxygen",
            atomicNumber: 8,
            mass: 15.999,
            x: origin.x,
            y: origin.y,
            z: origin.z,
            vdwRadius: oEl.vdwRadius,
            covalentRadius: oEl.covalentRadius,
            color: oEl.color,
            isHydrogen: false,
          },
          {
            id: startId + 1,
            symbol: "H",
            name: "Hydrogen",
            atomicNumber: 1,
            mass: 1.008,
            x: origin.x + 0.8,
            y: origin.y + 0.5,
            z: origin.z,
            vdwRadius: hEl.vdwRadius,
            covalentRadius: hEl.covalentRadius,
            color: hEl.color,
            isHydrogen: true,
          }
        );
        newBondsList.push({
          id: `${startId}-${startId + 1}`,
          atom1: startId,
          atom2: startId + 1,
          order: 1,
          length: 0.96,
        });
        if (selectedAtom) {
          newBondsList.push({
            id: `${selectedAtom.id}-${startId}`,
            atom1: selectedAtom.id,
            atom2: startId,
            order: 1,
            length: 1.42,
          });
        }
      } else if (templateId === "methyl") {
        const cEl = getElement("C");
        newAtomsList.push({
          id: startId,
          symbol: "C",
          name: "Carbon",
          atomicNumber: 6,
          mass: 12.011,
          x: origin.x,
          y: origin.y,
          z: origin.z,
          vdwRadius: cEl.vdwRadius,
          covalentRadius: cEl.covalentRadius,
          color: cEl.color,
          isHydrogen: false,
        });
        if (selectedAtom) {
          newBondsList.push({
            id: `${selectedAtom.id}-${startId}`,
            atom1: selectedAtom.id,
            atom2: startId,
            order: 1,
            length: 1.54,
          });
        }
      }

      setAtoms((prev) => [...prev, ...newAtomsList]);
      setBonds((prev) => [...prev, ...newBondsList]);
      setStatusMsg({ text: `Attached ${templateId} template in 3D.`, type: "success" });
    },
    [getNextId, recordHistory, selectedAtom]
  );

  // ACTION: Automatic Hydrogen Addition
  const handleAddHydrogens = useCallback(() => {
    recordHistory("Add Hydrogens");
    let nextId = getNextId();
    const newAtoms: ModellingAtom[] = [];
    const newBonds: ModellingBond[] = [];

    const valenceMap: Record<number, number> = {};
    atoms.forEach((a) => (valenceMap[a.id] = 0));
    bonds.forEach((b) => {
      const order = b.order === 1.5 ? 1.5 : b.order;
      if (valenceMap[b.atom1] !== undefined) valenceMap[b.atom1] += order;
      if (valenceMap[b.atom2] !== undefined) valenceMap[b.atom2] += order;
    });

    atoms.forEach((atom) => {
      if (atom.symbol === "H") return;
      const meta = getElement(atom.symbol);
      const curVal = valenceMap[atom.id] || 0;
      const targetVal = meta.maxValence === 4 ? 4 : meta.commonValences[0] || meta.maxValence;
      const missing = Math.max(0, Math.floor(targetVal - curVal));

      for (let i = 0; i < missing; i++) {
        const hId = nextId++;
        const angle = (i * 2 * Math.PI) / (missing || 1) + 0.5;
        const hPos = {
          x: Math.round((atom.x + 1.08 * Math.cos(angle)) * 100) / 100,
          y: Math.round((atom.y + 1.08 * Math.sin(angle)) * 100) / 100,
          z: Math.round((atom.z + (i % 2 === 0 ? 0.4 : -0.4)) * 100) / 100,
        };
        const hEl = getElement("H");
        newAtoms.push({
          id: hId,
          symbol: "H",
          name: "Hydrogen",
          atomicNumber: 1,
          mass: 1.008,
          x: hPos.x,
          y: hPos.y,
          z: hPos.z,
          vdwRadius: hEl.vdwRadius,
          covalentRadius: hEl.covalentRadius,
          color: hEl.color,
          isHydrogen: true,
        });
        newBonds.push({
          id: `${atom.id}-${hId}`,
          atom1: atom.id,
          atom2: hId,
          order: 1,
          length: 1.09,
        });
      }
    });

    if (newAtoms.length === 0) {
      setStatusMsg({ text: "All atoms already satisfy standard chemical valence.", type: "info" });
      return;
    }

    setAtoms((prev) => [...prev, ...newAtoms]);
    setBonds((prev) => [...prev, ...newBonds]);
    setStatusMsg({ text: `Added ${newAtoms.length} explicit hydrogen atoms to satisfy valence in 3D.`, type: "success" });
  }, [atoms, bonds, getNextId, recordHistory]);

  // ACTION: Force-Field Geometry Optimization (Backend RDKit MMFF94)
  const handleOptimizeGeometry = useCallback(async () => {
    if (atoms.length < 2) {
      setStatusMsg({ text: "Add more atoms to optimize molecular geometry.", type: "info" });
      return;
    }
    setOptimizing(true);
    setStatusMsg({ text: "Running MMFF94 Force Field energy minimization...", type: "info" });
    recordHistory("Optimize Geometry");

    try {
      const idToIndex: Record<number, number> = {};
      const atomsPayload = atoms.map((a, idx) => {
        idToIndex[a.id] = idx;
        return {
          symbol: a.symbol,
          x: a.x,
          y: a.y,
          z: a.z,
          formal_charge: a.formalCharge || 0,
        };
      });

      const bondsPayload = bonds
        .map((b) => {
          const i1 = idToIndex[b.atom1];
          const i2 = idToIndex[b.atom2];
          if (i1 === undefined || i2 === undefined) return null;
          return { atom1: i1, atom2: i2, order: b.order };
        })
        .filter(Boolean);

      const res = await fetch("http://127.0.0.1:8000/api/studio/build-from-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atoms: atomsPayload,
          bonds: bondsPayload,
          optimize: true,
          max_iterations: 500,
          force_field: "MMFF94",
          use_existing_coords: true,
          add_hydrogens: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.atoms && data.atoms.length > 0) {
          setAtoms((prev) =>
            prev.map((a, idx) => {
              const resAtom = data.atoms[idx];
              if (!resAtom) return a;
              return {
                ...a,
                x: Math.round(resAtom.x * 1000) / 1000,
                y: Math.round(resAtom.y * 1000) / 1000,
                z: Math.round(resAtom.z * 1000) / 1000,
              };
            })
          );
          const energy = data.final_energy_kcal_mol ? `${data.final_energy_kcal_mol.toFixed(2)} kcal/mol` : "Converged";
          setStatusMsg({ text: `Geometry successfully optimized (MMFF94 Energy: ${energy}).`, type: "success" });
        }
      } else {
        const err = await res.json();
        setStatusMsg({ text: err.detail?.error?.message || "Optimization notice: adjust connectivity.", type: "error" });
      }
    } catch {
      setStatusMsg({ text: "Backend service unreachable: molecular geometry preserved.", type: "info" });
    } finally {
      setOptimizing(false);
    }
  }, [atoms, bonds, recordHistory]);

  // ACTION: File Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const name = file.name.toLowerCase();
        if (name.endsWith(".json")) {
          const parsed = JSON.parse(content);
          if (parsed.atoms && Array.isArray(parsed.atoms)) {
            recordHistory(`Import ${file.name}`);
            setAtoms(parsed.atoms);
            setBonds(parsed.bonds || []);
            triggerCameraView("reset");
            setStatusMsg({ text: `Opened project '${file.name}' with ${parsed.atoms.length} atoms.`, type: "success" });
          }
        } else if (name.endsWith(".xyz")) {
          const parsed = parseXYZ(content);
          recordHistory(`Import ${file.name}`);
          setAtoms(parsed.atoms);
          setBonds(parsed.bonds);
          triggerCameraView("reset");
          setStatusMsg({ text: `Imported XYZ structure '${file.name}' (${parsed.atoms.length} atoms, ${parsed.bonds.length} bonds).`, type: "success" });
        } else {
          setStatusMsg({ text: "Supported file formats: .json project files and .xyz coordinate files.", type: "info" });
        }
      } catch (err) {
        setStatusMsg({ text: `Failed parsing file: ${err}`, type: "error" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ACTION: Clear Entire Molecule
  const handleClearAll = () => {
    if (atoms.length === 0) return;
    if (window.confirm("Clear all atoms and bonds from workspace?")) {
      recordHistory("Clear Canvas");
      setAtoms([]);
      setBonds([]);
      setSelectedAtom(null);
      setSelectedBond(null);
      setMeasurement(null);
      setStatusMsg({ text: "Canvas cleared. Start by placing an atom or loading a sample!", type: "info" });
    }
  };

  return (
    <div className={styles.container}>
      {/* Hidden file upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.xyz"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* TOP HEADER TOOLBAR */}
      <header className={styles.topBar}>
        <div className={styles.brandArea}>
          <span className={styles.avogadroBadge}>Avogadro 3D Workstation</span>
          <h1 className={styles.title}>🔬 3D Molecular Modelling</h1>
        </div>

        {/* Top Action Groups */}
        <div className={styles.topActions}>
          {/* File Operations */}
          <div className={styles.btnGroup}>
            <button
              className={styles.actionBtn}
              onClick={handleClearAll}
              title="New Blank Molecule (Clear Canvas)"
            >
              📄 New
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Open / Import .JSON or .XYZ file"
            >
              📂 Open
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => {
                const json = saveProjectJSON(atoms, bonds, { name: stats.formula });
                downloadFile(json, `${stats.formula || "molecule"}.moleculelab.json`, "application/json");
              }}
              title="Save Project as JSON"
            >
              💾 Save
            </button>
          </div>

          {/* Export Formats */}
          <div className={styles.btnGroup}>
            <button
              className={styles.actionBtn}
              onClick={() => {
                const xyz = exportXYZ(atoms, stats.formula);
                downloadFile(xyz, `${stats.formula || "molecule"}.xyz`, "chemical/x-xyz");
              }}
              title="Download Cartesian XYZ coordinates"
            >
              XYZ
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => {
                const mol = exportMOL(atoms, bonds, stats.formula);
                downloadFile(mol, `${stats.formula || "molecule"}.mol`, "chemical/x-mdl-molfile");
              }}
              title="Download MDL Molfile V2000"
            >
              MOL
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => {
                const pdb = exportPDB(atoms, bonds, stats.formula);
                downloadFile(pdb, `${stats.formula || "molecule"}.pdb`, "chemical/x-pdb");
              }}
              title="Download Protein Data Bank PDB"
            >
              PDB
            </button>
          </div>

          {/* Undo / Redo */}
          <div className={styles.btnGroup}>
            <button
              className={styles.actionBtn}
              onClick={undo}
              disabled={history.length === 0}
              title="Undo Last Action"
            >
              ↩ Undo
            </button>
            <button
              className={styles.actionBtn}
              onClick={redo}
              disabled={future.length === 0}
              title="Redo Action"
            >
              ↪ Redo
            </button>
          </div>

          {/* Chemistry Automations */}
          <div className={styles.btnGroup}>
            <button
              className={styles.actionBtn}
              onClick={handleAddHydrogens}
              title="Automatically add explicit hydrogens to satisfy valence in 3D"
            >
              💧 +H Hydrogens
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleOptimizeGeometry}
              disabled={optimizing || atoms.length < 2}
              title="Run MMFF94 force field energy minimization"
            >
              {optimizing ? "Minimizing..." : "⚡ Optimize 3D"}
            </button>
          </div>

          {/* View Modes */}
          <div className={styles.btnGroup}>
            <button
              className={`${styles.actionBtn} ${renderMode === "ball_stick" ? styles.actionBtnActive : ""}`}
              onClick={() => setRenderMode("ball_stick")}
              title="Ball and Stick representation"
            >
              🧪 Ball &amp; Stick
            </button>
            <button
              className={`${styles.actionBtn} ${renderMode === "spacefill" ? styles.actionBtnActive : ""}`}
              onClick={() => setRenderMode("spacefill")}
              title="CPK Space Filling (vdW spheres)"
            >
              🌐 Spacefill
            </button>
            <button
              className={`${styles.actionBtn} ${renderMode === "stick" ? styles.actionBtnActive : ""}`}
              onClick={() => setRenderMode("stick")}
              title="Stick representation"
            >
              🥢 Stick
            </button>
            <button
              className={`${styles.actionBtn} ${renderMode === "wireframe" ? styles.actionBtnActive : ""}`}
              onClick={() => setRenderMode("wireframe")}
              title="Wireframe representation"
            >
              🕸️ Wireframe
            </button>
          </div>

          {/* Link to DrugMatch Screening */}
          <Link
            href="/library"
            className={styles.accentBtn}
            title="Screen this molecule in the DrugMatch ranking system"
          >
            🎯 Screen in DrugMatch
          </Link>
        </div>
      </header>

      {/* THREE-COLUMN WORKSPACE */}
      <main className={styles.workspace}>
        {/* LEFT SIDEBAR: Tools, Periodic Table, Sample Library */}
        <aside className={styles.leftSidebar}>
          {/* Modelling Tool Palette */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Modelling Tools</h2>
            <div className={styles.toolGrid}>
              <button
                className={`${styles.toolButton} ${activeTool === "add_atom" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("add_atom")}
                title="Add Atom (Click canvas or click an atom to sprout in 3D)"
              >
                <span className={styles.toolIcon}>⚛️</span>
                <span>Add Atom</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "select" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("select")}
                title="Select and Inspect Atom or Bond"
              >
                <span className={styles.toolIcon}>🖱️</span>
                <span>Select</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "move_atom" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("move_atom")}
                title="Move Atom in 3D space using the interactive XYZ Translation Gizmo"
              >
                <span className={styles.toolIcon}>✋</span>
                <span>3D Move</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "add_bond" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("add_bond")}
                title="Connect two atoms with a bond"
              >
                <span className={styles.toolIcon}>🔗</span>
                <span>Add Bond</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "change_bond" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("change_bond")}
                title="Cycle bond type (Single, Double, Triple)"
              >
                <span className={styles.toolIcon}>⚖️</span>
                <span>Bond Type</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "delete" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("delete")}
                title="Delete Atom or Bond"
              >
                <span className={styles.toolIcon}>🗑️</span>
                <span>Delete</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "measure_distance" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("measure_distance")}
                title="Measure distance between 2 atoms"
              >
                <span className={styles.toolIcon}>📏</span>
                <span>Distance</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "measure_angle" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("measure_angle")}
                title="Measure bond angle across 3 atoms"
              >
                <span className={styles.toolIcon}>📐</span>
                <span>Angle</span>
              </button>
              <button
                className={`${styles.toolButton} ${activeTool === "rotate" ? styles.toolButtonActive : ""}`}
                onClick={() => setActiveTool("rotate")}
                title="Rotate molecule view"
              >
                <span className={styles.toolIcon}>🔄</span>
                <span>Orbit</span>
              </button>
            </div>

            {/* Bond Order Selector for 'add_bond' tool */}
            {activeTool === "add_bond" && (
              <div style={{ marginTop: 8, display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Order:</span>
                {[1, 2, 3].map((order) => (
                  <button
                    key={order}
                    className={`${styles.actionBtn} ${bondOrderToAdd === order ? styles.actionBtnActive : ""}`}
                    onClick={() => setBondOrderToAdd(order)}
                    style={{ flex: 1 }}
                  >
                    {order === 1 ? "Single" : order === 2 ? "Double" : "Triple"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Periodic Table & Element Selector */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>
              <span>Element Palette</span>
              <span style={{ fontSize: "0.68rem", color: "#38bdf8" }}>CPK Colors</span>
            </h2>

            {/* Quick search */}
            <input
              type="text"
              placeholder="Search elements (e.g. C, Oxygen, 6)..."
              className={styles.elementSearchInput}
              value={elementSearch}
              onChange={(e) => setElementSearch(e.target.value)}
            />

            {/* Common element chips */}
            <div className={styles.elementGrid}>
              {(elementSearch.trim() ? filteredElements.slice(0, 15) : COMMON_ELEMENTS.map(getElement)).map((el) => (
                <button
                  key={el.symbol}
                  className={`${styles.elementChip} ${selectedElement === el.symbol ? styles.elementChipActive : ""}`}
                  onClick={() => setSelectedElement(el.symbol)}
                  title={`${el.name} (Atomic #${el.atomicNumber}, Mass: ${el.mass})`}
                >
                  <span className={styles.elementSymbol} style={{ color: el.color === "#FFFFFF" ? "#f8fafc" : el.color }}>
                    {el.symbol}
                  </span>
                  <span className={styles.elementNumber}>{el.atomicNumber}</span>
                </button>
              ))}
            </div>

            {/* Active element summary badge */}
            {selectedElement && (
              <div className={styles.activeElementCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={styles.colorCircle}
                    style={{ backgroundColor: getElement(selectedElement).color }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#f8fafc" }}>
                      {getElement(selectedElement).name} ({selectedElement})
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                      Atomic #{getElement(selectedElement).atomicNumber} · Mass: {getElement(selectedElement).mass} g/mol
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "0.68rem", color: "#38bdf8", fontWeight: 700 }}>
                  Max Valence: {getElement(selectedElement).maxValence}
                </div>
              </div>
            )}
          </div>

          {/* Ready-Made Editable Molecules */}
          <div className={styles.panelCard} style={{ flex: 1 }}>
            <h2 className={styles.panelTitle}>
              <span>Editable Sample Molecules</span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Library</span>
            </h2>
            <div className={styles.sampleList}>
              {SAMPLE_MOLECULES.map((sample) => (
                <button
                  key={sample.id}
                  className={styles.sampleItem}
                  onClick={() => handleLoadSample(sample)}
                  title={`Load editable 3D structure of ${sample.name}: ${sample.description}`}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f8fafc" }}>{sample.name}</div>
                    <div className={styles.sampleCategory}>{sample.category}</div>
                  </div>
                  <span className={styles.sampleFormula}>{sample.formula}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Structural Ring & Group Templates */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Templates &amp; Rings</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {FRAGMENT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  className={styles.actionBtn}
                  onClick={() => handleAddTemplate(tmpl.id)}
                  style={{ border: "1px solid var(--border-subtle)", justifyContent: "center" }}
                  title={`Insert ${tmpl.name}`}
                >
                  <span>{tmpl.icon}</span>
                  <span style={{ fontSize: "0.7rem" }}>{tmpl.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER VIEWPORT: Three.js Interactive 3D Canvas */}
        <section className={styles.centerCanvas}>
          {/* Top Viewport Ribbon */}
          <div className={styles.viewportRibbon}>
            {/* Active tool HUD indicator */}
            <div className={styles.toolBanner}>
              <span className={styles.toolBadge}>{activeTool.replace("_", " ")}</span>
              <span>
                {activeTool === "add_atom" && `Active Element: ${getElement(selectedElement).name} (${selectedElement}). Click an atom to sprout in 3D, or click canvas to add.`}
                {activeTool === "move_atom" && "Select an atom: drag the Red/Green/Blue gizmo arrows to move in 3D along X, Y, or Z."}
                {activeTool === "add_bond" && "Click first atom, then click second atom to create bond. (Scene is stable and preserved)."}
                {activeTool === "change_bond" && "Click any bond to cycle: Single → Double → Triple."}
                {activeTool === "delete" && "Click any atom or bond to delete it."}
                {activeTool === "select" && "Click atoms or bonds to inspect. Drag 3D gizmo to reposition."}
                {activeTool === "measure_distance" && "Select 2 atoms to measure 3D Euclidean distance (Å)."}
                {activeTool === "measure_angle" && "Select 3 atoms to measure bond angle (°)."}
                {activeTool === "measure_dihedral" && "Select 4 atoms to measure dihedral torsion angle (°)."}
                {activeTool === "rotate" && "Drag with left mouse button to orbit."}
              </span>
            </div>

            {/* Quick View Controls & 3D Camera Presets */}
            <div className={styles.quickViewControls}>
              <button
                className={styles.viewIconBtn}
                onClick={() => triggerCameraView("reset")}
                title="Fit Molecule to Viewport (Reset Camera)"
              >
                🎯
              </button>
              <button
                className={styles.viewIconBtn}
                onClick={() => triggerCameraView("front")}
                title="Front View (Z-Axis)"
              >
                XY
              </button>
              <button
                className={styles.viewIconBtn}
                onClick={() => triggerCameraView("top")}
                title="Top View (Y-Axis)"
              >
                XZ
              </button>
              <button
                className={styles.viewIconBtn}
                onClick={() => triggerCameraView("side")}
                title="Side View (X-Axis)"
              >
                YZ
              </button>
              <button
                className={styles.viewIconBtn}
                onClick={() => setShowLabels(!showLabels)}
                title="Toggle atom labels"
              >
                🏷️
              </button>
              <button
                className={styles.viewIconBtn}
                onClick={() => setShowBonds(!showBonds)}
                title="Toggle bond visibility"
              >
                🔗
              </button>
              <button
                className={`${styles.viewIconBtn} ${autoRotate ? styles.actionBtnActive : ""}`}
                onClick={() => setAutoRotate(!autoRotate)}
                title="Toggle turntable auto-rotation"
              >
                🔄
              </button>
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <ModellingViewer
            atoms={atoms}
            bonds={bonds}
            activeTool={activeTool}
            selectedElement={selectedElement}
            selectedAtomId={selectedAtom?.id || null}
            selectedBondId={selectedBond?.id || null}
            bondOrderToAdd={bondOrderToAdd}
            renderMode={renderMode}
            showLabels={showLabels}
            showBonds={showBonds}
            autoRotate={autoRotate}
            warningAtomIds={warningAtomIds}
            cameraViewTrigger={cameraViewTrigger}
            onSelectAtom={setSelectedAtom}
            onSelectBond={setSelectedBond}
            onAddAtomAt={handleAddAtomAt}
            onMoveAtom={handleMoveAtom}
            onDeleteAtom={handleDeleteAtom}
            onDeleteBond={handleDeleteBond}
            onAddBond={handleAddBond}
            onChangeBondOrder={handleChangeBondOrder}
            onMeasurement={setMeasurement}
          />
        </section>

        {/* RIGHT SIDEBAR: Live Stats, Inspector, Functional Groups & Chemistry Insights */}
        <aside className={styles.rightSidebar}>
          {/* Status Message / Student Feedback */}
          {statusMsg && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: "0.74rem",
                background:
                  statusMsg.type === "success"
                    ? "rgba(34, 197, 94, 0.15)"
                    : statusMsg.type === "error"
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(56, 189, 248, 0.15)",
                border: `1px solid ${
                  statusMsg.type === "success"
                    ? "rgba(34, 197, 94, 0.35)"
                    : statusMsg.type === "error"
                    ? "rgba(239, 68, 68, 0.35)"
                    : "rgba(56, 189, 248, 0.35)"
                }`,
                color:
                  statusMsg.type === "success"
                    ? "#4ade80"
                    : statusMsg.type === "error"
                    ? "#fca5a5"
                    : "#7dd3fc",
              }}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Live Molecular Statistics & Identification */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Molecular Information</h2>
            <div className={styles.formulaDisplay}>{stats.formula}</div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Molecular Mass</span>
              <span className={styles.metricValue}>{stats.mass} g/mol</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Total Atoms</span>
              <span className={styles.metricValue}>{stats.atomCount} ({stats.heavyAtomCount} heavy)</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Total Bonds</span>
              <span className={styles.metricValue}>
                {stats.bondCount} (Single: {stats.bondCounts.single}, Double: {stats.bondCounts.double}, Triple: {stats.bondCounts.triple})
              </span>
            </div>

            {/* Element distribution chips */}
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.entries(stats.elementCounts).map(([sym, count]) => {
                const el = getElement(sym);
                return (
                  <span
                    key={sym}
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: "0.68rem",
                      color: el.color === "#FFFFFF" ? "#f8fafc" : el.color,
                      fontWeight: 700,
                    }}
                  >
                    {sym}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Functional Group Analysis */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>
              <span>Functional Groups Detected</span>
              <span style={{ fontSize: "0.68rem", color: "#38bdf8" }}>{stats.functionalGroups.length}</span>
            </h2>
            {stats.functionalGroups.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {stats.functionalGroups.map((fg, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 5,
                      padding: "5px 8px",
                      fontSize: "0.72rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, color: "#f8fafc" }}>{fg.name}</span>
                      <span style={{ color: "#38bdf8", fontFamily: "monospace", fontWeight: 700 }}>{fg.formula}</span>
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: 2 }}>{fg.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                No complex functional groups detected (e.g. hydrocarbons or inorganic).
              </div>
            )}
          </div>

          {/* Physicochemical & Educational Drug-Likeness (Lipinski) */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Physicochemical Properties</h2>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>H-Bond Donors (HBD)</span>
              <span className={styles.metricValue}>{stats.properties.hbd}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>H-Bond Acceptors (HBA)</span>
              <span className={styles.metricValue}>{stats.properties.hba}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Rotatable Bonds</span>
              <span className={styles.metricValue}>{stats.properties.rotatableBonds}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Approx. Polar Surface (TPSA)</span>
              <span className={styles.metricValue}>{stats.properties.approxTPSA} Å²</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Lipinski Rule of 5</span>
              <span
                className={styles.metricValue}
                style={{ color: stats.properties.lipinskiPass ? "#4ade80" : "#fca5a5" }}
              >
                {stats.properties.lipinskiPass ? "✓ Compliant" : "⚠ Non-Compliant"}
              </span>
            </div>
          </div>

          {/* Chemical Valence Warnings (Student Educational Alert) */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Valence &amp; Chemistry Alerts</h2>
            {valenceWarnings.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {valenceWarnings.map((w, idx) => (
                  <div key={idx} className={styles.warningCard}>
                    <div style={{ fontWeight: 800 }}>⚠️ Valence Warning ({w.symbol}{w.atomId})</div>
                    <div>{w.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.validPill}>
                <span>✓</span>
                <span>All atoms currently satisfy standard chemical valence rules.</span>
              </div>
            )}
          </div>

          {/* VSEPR Molecular Geometry */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>VSEPR Geometry (Central Atoms)</h2>
            {vseprGeometries.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vseprGeometries.map((v) => (
                  <div key={v.atomId} className={styles.metricRow}>
                    <span className={styles.metricLabel}>{v.symbol}</span>
                    <span className={styles.metricValue}>
                      {v.geometry} ({v.idealAngle})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                Add bonded neighbors to central atoms to observe VSEPR geometric hybridization.
              </div>
            )}
          </div>

          {/* Geometry Measurement Card */}
          {measurement && (
            <div className={styles.panelCard}>
              <h2 className={styles.panelTitle}>Geometry Measurement</h2>
              <div className={styles.measurementBox}>
                <div className={styles.measurementLabel}>{measurement.label}</div>
                <div className={styles.measurementValue}>{measurement.value}</div>
              </div>
            </div>
          )}

          {/* Inspector Panel: Selected Atom or Bond */}
          <div className={styles.panelCard} style={{ flex: 1 }}>
            <h2 className={styles.panelTitle}>
              <span>Selection Inspector</span>
              {selectedAtom ? <span style={{ color: "#38bdf8" }}>Atom</span> : selectedBond ? <span style={{ color: "#facc15" }}>Bond</span> : null}
            </h2>

            {selectedAtom ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f8fafc", marginBottom: 6 }}>
                  {selectedAtom.name} ({selectedAtom.symbol}{selectedAtom.id})
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Atomic Number</span>
                  <span className={styles.metricValue}>{selectedAtom.atomicNumber}</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Atomic Mass</span>
                  <span className={styles.metricValue}>{selectedAtom.mass} g/mol</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Covalent Radius</span>
                  <span className={styles.metricValue}>{selectedAtom.covalentRadius} Å</span>
                </div>

                {/* 3D Coordinates inputs with step nudge buttons */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>
                    3D Coordinates (Å) &amp; Nudge:
                  </div>
                  <div className={styles.coordGrid}>
                    <div className={styles.coordInputBox}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#ef4444", fontWeight: 800 }}>X</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            className={styles.nudgeBtn}
                            onClick={() => handleNudgeAxis("x", -0.1)}
                            title="Nudge X -0.1 Å"
                          >
                            -
                          </button>
                          <button
                            className={styles.nudgeBtn}
                            onClick={() => handleNudgeAxis("x", 0.1)}
                            title="Nudge X +0.1 Å"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        className={styles.coordInput}
                        value={selectedAtom.x}
                        onChange={(e) =>
                          handleMoveAtom(selectedAtom.id, {
                            x: parseFloat(e.target.value) || 0,
                            y: selectedAtom.y,
                            z: selectedAtom.z,
                          })
                        }
                      />
                    </div>
                    <div className={styles.coordInputBox}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#22c55e", fontWeight: 800 }}>Y</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            className={styles.nudgeBtn}
                            onClick={() => handleNudgeAxis("y", -0.1)}
                            title="Nudge Y -0.1 Å"
                          >
                            -
                          </button>
                          <button
                            className={styles.nudgeBtn}
                            onClick={() => handleNudgeAxis("y", 0.1)}
                            title="Nudge Y +0.1 Å"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        className={styles.coordInput}
                        value={selectedAtom.y}
                        onChange={(e) =>
                          handleMoveAtom(selectedAtom.id, {
                            x: selectedAtom.x,
                            y: parseFloat(e.target.value) || 0,
                            z: selectedAtom.z,
                          })
                        }
                      />
                    </div>
                    <div className={styles.coordInputBox}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#3b82f6", fontWeight: 800 }}>Z</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            className={styles.nudgeBtn}
                            onClick={() => handleNudgeAxis("z", -0.1)}
                            title="Nudge Z -0.1 Å"
                          >
                            -
                          </button>
                          <button
                            className={styles.nudgeBtn}
                            onClick={() => handleNudgeAxis("z", 0.1)}
                            title="Nudge Z +0.1 Å"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        className={styles.coordInput}
                        value={selectedAtom.z}
                        onChange={(e) =>
                          handleMoveAtom(selectedAtom.id, {
                            x: selectedAtom.x,
                            y: selectedAtom.y,
                            z: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Connected atoms list */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>
                    Connected Atoms ({selectedAtomConnections.length}):
                  </div>
                  {selectedAtomConnections.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {selectedAtomConnections.map((conn) => (
                        <div
                          key={conn.bondId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.7rem",
                            background: "rgba(15, 23, 42, 0.5)",
                            padding: "3px 6px",
                            borderRadius: 4,
                          }}
                        >
                          <span>
                            {conn.neighborSymbol}#{conn.neighborId} ({conn.order === 1 ? "Single" : conn.order === 2 ? "Double" : conn.order === 3 ? "Triple" : "Aromatic"})
                          </span>
                          <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{conn.length} Å</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Isolated atom (no bonds). Click &apos;Add Bond&apos; to connect it.
                    </div>
                  )}
                </div>

                <button
                  className={styles.deleteItemBtn}
                  onClick={() => handleDeleteAtom(selectedAtom.id)}
                >
                  Delete Atom ({selectedAtom.symbol}{selectedAtom.id})
                </button>
              </div>
            ) : selectedBond ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f8fafc", marginBottom: 6 }}>
                  Bond: Atom {selectedBond.atom1} — Atom {selectedBond.atom2}
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Bond Order</span>
                  <span className={styles.metricValue}>
                    {selectedBond.order === 1
                      ? "Single (1)"
                      : selectedBond.order === 2
                      ? "Double (2)"
                      : selectedBond.order === 3
                      ? "Triple (3)"
                      : "Aromatic (1.5)"}
                  </span>
                </div>
                {selectedBond.length && (
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Length</span>
                    <span className={styles.metricValue}>{selectedBond.length} Å</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    className={styles.actionBtn}
                    style={{ flex: 1, border: "1px solid var(--border-subtle)", justifyContent: "center" }}
                    onClick={() => handleChangeBondOrder(selectedBond.id)}
                  >
                    Cycle Order (1→2→3)
                  </button>
                </div>

                <button
                  className={styles.deleteItemBtn}
                  onClick={() => handleDeleteBond(selectedBond.id)}
                >
                  Delete Bond
                </button>
              </div>
            ) : (
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontStyle: "italic", padding: "12px 0" }}>
                Click any atom or bond in the 3D viewport to inspect its properties or adjust coordinates.
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

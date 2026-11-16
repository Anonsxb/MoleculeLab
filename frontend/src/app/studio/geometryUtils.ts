/** Geometry calculation helpers and molecular template generators. */

import type { StudioAtom, StudioBond } from "./types";

export const ELEMENT_METADATA: Record<
  string,
  { name: string; atomicNumber: number; vdwRadius: number; covalentRadius: number; color: string; maxValence: number }
> = {
  H: { name: "Hydrogen", atomicNumber: 1, vdwRadius: 1.20, covalentRadius: 0.31, color: "#FFFFFF", maxValence: 1 },
  C: { name: "Carbon", atomicNumber: 6, vdwRadius: 1.70, covalentRadius: 0.76, color: "#404040", maxValence: 4 },
  N: { name: "Nitrogen", atomicNumber: 7, vdwRadius: 1.55, covalentRadius: 0.71, color: "#3050F8", maxValence: 4 },
  O: { name: "Oxygen", atomicNumber: 8, vdwRadius: 1.52, covalentRadius: 0.66, color: "#FF0D0D", maxValence: 2 },
  F: { name: "Fluorine", atomicNumber: 9, vdwRadius: 1.47, covalentRadius: 0.57, color: "#90E050", maxValence: 1 },
  P: { name: "Phosphorus", atomicNumber: 15, vdwRadius: 1.80, covalentRadius: 1.07, color: "#FF8000", maxValence: 5 },
  S: { name: "Sulfur", atomicNumber: 16, vdwRadius: 1.80, covalentRadius: 1.05, color: "#FFFF30", maxValence: 6 },
  Cl: { name: "Chlorine", atomicNumber: 17, vdwRadius: 1.75, covalentRadius: 1.02, color: "#1FF01F", maxValence: 1 },
  Br: { name: "Bromine", atomicNumber: 35, vdwRadius: 1.85, covalentRadius: 1.20, color: "#A62929", maxValence: 1 },
  I: { name: "Iodine", atomicNumber: 53, vdwRadius: 1.98, covalentRadius: 1.39, color: "#940094", maxValence: 1 },
};

/** Calculate 3D Euclidean distance between two atoms in Angstroms. */
export function calculateDistance(a1: StudioAtom, a2: StudioAtom): number {
  const dx = a1.x - a2.x;
  const dy = a1.y - a2.y;
  const dz = a1.z - a2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Calculate 3D bond angle (a1 — a2 — a3) in degrees. */
export function calculateAngle(a1: StudioAtom, a2: StudioAtom, a3: StudioAtom): number {
  const v1 = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
  const v2 = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };
  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  if (len1 === 0 || len2 === 0) return 0;

  const dot = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (len1 * len2);
  const clamped = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/** Calculate dihedral angle (a1 — a2 — a3 — a4) in degrees. */
export function calculateDihedral(
  a1: StudioAtom,
  a2: StudioAtom,
  a3: StudioAtom,
  a4: StudioAtom
): number {
  const b1 = { x: a2.x - a1.x, y: a2.y - a1.y, z: a2.z - a1.z };
  const b2 = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };
  const b3 = { x: a4.x - a3.x, y: a4.y - a3.y, z: a4.z - a3.z };

  // Normal vectors of planes (b1 x b2) and (b2 x b3)
  const n1 = {
    x: b1.y * b2.z - b1.z * b2.y,
    y: b1.z * b2.x - b1.x * b2.z,
    z: b1.x * b2.y - b1.y * b2.x,
  };
  const n2 = {
    x: b2.y * b3.z - b2.z * b3.y,
    y: b2.z * b3.x - b2.x * b3.z,
    z: b2.x * b3.y - b2.y * b3.x,
  };

  const lenB2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y + b2.z * b2.z);
  if (lenB2 === 0) return 0;
  const b2Unit = { x: b2.x / lenB2, y: b2.y / lenB2, z: b2.z / lenB2 };

  // Vector m1 = n1 x b2Unit
  const m1 = {
    x: n1.y * b2Unit.z - n1.z * b2Unit.y,
    y: n1.z * b2Unit.x - n1.x * b2Unit.z,
    z: n1.x * b2Unit.y - n1.y * b2Unit.x,
  };

  const x = n1.x * n2.x + n1.y * n2.y + n1.z * n2.z;
  const y = m1.x * n2.x + m1.y * n2.y + m1.z * n2.z;
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Determine realistic 3D coordinates for a newly attached atom based on existing bonded neighbors. */
export function getNewAtomPosition(
  parent: StudioAtom,
  neighbors: StudioAtom[],
  bondLength = 1.45
): { x: number; y: number; z: number } {
  if (neighbors.length === 0) {
    // Single atom in space, spawn along +X
    return { x: parent.x + bondLength, y: parent.y, z: parent.z };
  }

  if (neighbors.length === 1) {
    const n = neighbors[0];
    const dx = parent.x - n.x;
    const dy = parent.y - n.y;
    const dz = parent.z - n.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const u = { x: dx / len, y: dy / len, z: dz / len };

    // Find orthogonal vector
    const perp = Math.abs(u.z) < 0.9 ? { x: -u.y, y: u.x, z: 0 } : { x: 0, y: -u.z, z: u.y };
    const pLen = Math.sqrt(perp.x * perp.x + perp.y * perp.y + perp.z * perp.z) || 1;
    const p = { x: perp.x / pLen, y: perp.y / pLen, z: perp.z / pLen };

    // 109.5 degree angle continuation (sp3 tetrahedral)
    // cos(180 - 109.5) = cos(70.5 deg) ~ 0.333, sin(70.5 deg) ~ 0.943
    const along = 0.333 * bondLength;
    const side = 0.943 * bondLength;

    return {
      x: parent.x + u.x * along + p.x * side,
      y: parent.y + u.y * along + p.y * side,
      z: parent.z + u.z * along + p.z * side,
    };
  }

  if (neighbors.length === 2) {
    // Place opposite the bisector of the two neighbors
    const n1 = neighbors[0];
    const n2 = neighbors[1];
    const v1 = { x: n1.x - parent.x, y: n1.y - parent.y, z: n1.z - parent.z };
    const v2 = { x: n2.x - parent.x, y: n2.y - parent.y, z: n2.z - parent.z };
    const sum = { x: -(v1.x + v2.x), y: -(v1.y + v2.y), z: -(v1.z + v2.z) };
    const sLen = Math.sqrt(sum.x * sum.x + sum.y * sum.y + sum.z * sum.z) || 1;
    // Add small out-of-plane z offset for tetrahedral geometry
    return {
      x: parent.x + (sum.x / sLen) * bondLength,
      y: parent.y + (sum.y / sLen) * bondLength,
      z: parent.z + (sum.z / sLen) * bondLength + 0.35,
    };
  }

  // 3 or more neighbors: point away from the centroid of neighbors
  let cx = 0, cy = 0, cz = 0;
  neighbors.forEach((n) => {
    cx += n.x - parent.x;
    cy += n.y - parent.y;
    cz += n.z - parent.z;
  });
  const dir = { x: -cx, y: -cy, z: -cz };
  const dLen = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
  return {
    x: parent.x + (dir.x / dLen) * bondLength,
    y: parent.y + (dir.y / dLen) * bondLength,
    z: parent.z + (dir.z / dLen) * bondLength,
  };
}

/** Create a new StudioAtom instance with proper chemical metadata. */
export function createStudioAtom(
  symbol: string,
  index: number,
  x = 0,
  y = 0,
  z = 0
): StudioAtom {
  const meta = ELEMENT_METADATA[symbol] || {
    name: symbol,
    atomicNumber: 6,
    vdwRadius: 1.7,
    covalentRadius: 0.77,
    color: "#404040",
    maxValence: 4,
  };

  return {
    index,
    symbol,
    atomic_number: meta.atomicNumber,
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    z: Math.round(z * 1000) / 1000,
    vdw_radius: meta.vdwRadius,
    covalent_radius: meta.covalentRadius,
    gasteiger_charge: 0,
    formal_charge: 0,
    is_aromatic: false,
    hybridization: "SP3",
    color: meta.color,
    is_hydrogen: symbol === "H",
  };
}

/** Ring and functional group template definitions. */
export interface MolecularTemplate {
  id: string;
  name: string;
  category: "ring" | "group";
  description: string;
  smilesAttachment: string;
}

export const TEMPLATES: MolecularTemplate[] = [
  { id: "benzene", name: "Benzene Ring", category: "ring", description: "Planar 6-carbon aromatic ring (C6H5-)", smilesAttachment: "c1ccccc1" },
  { id: "cyclohexane", name: "Cyclohexane Ring", category: "ring", description: "Aliphatic 6-carbon chair ring (C6H11-)", smilesAttachment: "C1CCCCC1" },
  { id: "cyclopentane", name: "Cyclopentane Ring", category: "ring", description: "5-carbon saturated ring (C5H9-)", smilesAttachment: "C1CCCC1" },
  { id: "hydroxyl", name: "Hydroxyl (-OH)", category: "group", description: "Alcohol / phenol polar functional group", smilesAttachment: "O" },
  { id: "amino", name: "Amino (-NH2)", category: "group", description: "Primary amine basic functional group", smilesAttachment: "N" },
  { id: "carbonyl", name: "Carbonyl (=O)", category: "group", description: "Aldehyde / ketone / ester carbonyl oxygen", smilesAttachment: "=O" },
  { id: "carboxyl", name: "Carboxyl (-COOH)", category: "group", description: "Carboxylic acid functional group", smilesAttachment: "C(=O)O" },
  { id: "methyl", name: "Methyl (-CH3)", category: "group", description: "Alkyl hydrocarbon methyl substituent", smilesAttachment: "C" },
];

/** Build template structure atoms & bonds to attach to a selected atom (or in empty space). */
export function buildTemplate(
  templateId: string,
  startIdx: number,
  anchorAtom?: StudioAtom | null,
  anchorNeighbors: StudioAtom[] = []
): { newAtoms: StudioAtom[]; newBonds: StudioBond[] } {
  const newAtoms: StudioAtom[] = [];
  const newBonds: StudioBond[] = [];

  const origin = anchorAtom
    ? getNewAtomPosition(anchorAtom, anchorNeighbors, 1.45)
    : { x: 0, y: 0, z: 0 };

  if (templateId === "benzene") {
    // 6-carbon planar aromatic ring
    const radius = 1.40;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = origin.x + radius * Math.cos(angle);
      const y = origin.y + radius * Math.sin(angle);
      const z = origin.z;
      const a = createStudioAtom("C", startIdx + i, x, y, z);
      a.is_aromatic = true;
      a.hybridization = "SP2";
      newAtoms.push(a);
    }
    // Connect aromatic ring bonds
    for (let i = 0; i < 6; i++) {
      newBonds.push({
        atom1: startIdx + i,
        atom2: startIdx + ((i + 1) % 6),
        order: 1.5,
        is_aromatic: true,
        length: 1.40,
      });
    }
    if (anchorAtom) {
      newBonds.push({
        atom1: anchorAtom.index,
        atom2: startIdx,
        order: 1.0,
        is_aromatic: false,
        length: 1.48,
      });
    }
  } else if (templateId === "cyclohexane") {
    // 6-carbon chair conformation
    const radius = 1.54;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = origin.x + radius * Math.cos(angle);
      const y = origin.y + radius * Math.sin(angle);
      const z = origin.z + (i % 2 === 0 ? 0.35 : -0.35); // chair alternating z
      const a = createStudioAtom("C", startIdx + i, x, y, z);
      newAtoms.push(a);
    }
    for (let i = 0; i < 6; i++) {
      newBonds.push({
        atom1: startIdx + i,
        atom2: startIdx + ((i + 1) % 6),
        order: 1.0,
        is_aromatic: false,
        length: 1.54,
      });
    }
    if (anchorAtom) {
      newBonds.push({
        atom1: anchorAtom.index,
        atom2: startIdx,
        order: 1.0,
        is_aromatic: false,
        length: 1.54,
      });
    }
  } else if (templateId === "cyclopentane") {
    // 5-carbon ring
    const radius = 1.50;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      const x = origin.x + radius * Math.cos(angle);
      const y = origin.y + radius * Math.sin(angle);
      const z = origin.z + (i === 0 ? 0.25 : 0);
      newAtoms.push(createStudioAtom("C", startIdx + i, x, y, z));
    }
    for (let i = 0; i < 5; i++) {
      newBonds.push({
        atom1: startIdx + i,
        atom2: startIdx + ((i + 1) % 5),
        order: 1.0,
        is_aromatic: false,
        length: 1.54,
      });
    }
    if (anchorAtom) {
      newBonds.push({
        atom1: anchorAtom.index,
        atom2: startIdx,
        order: 1.0,
        is_aromatic: false,
        length: 1.54,
      });
    }
  } else if (templateId === "hydroxyl") {
    // -OH
    const o = createStudioAtom("O", startIdx, origin.x, origin.y, origin.z);
    newAtoms.push(o);
    if (anchorAtom) {
      newBonds.push({
        atom1: anchorAtom.index,
        atom2: startIdx,
        order: 1.0,
        is_aromatic: false,
        length: 1.42,
      });
    }
  } else if (templateId === "amino") {
    // -NH2
    const n = createStudioAtom("N", startIdx, origin.x, origin.y, origin.z);
    newAtoms.push(n);
    if (anchorAtom) {
      newBonds.push({
        atom1: anchorAtom.index,
        atom2: startIdx,
        order: 1.0,
        is_aromatic: false,
        length: 1.46,
      });
    }
  } else if (templateId === "carbonyl") {
    // =O
    const o = createStudioAtom("O", startIdx, origin.x, origin.y, origin.z);
    newAtoms.push(o);
    if (anchorAtom) {
      newBonds.push({
        atom1: anchorAtom.index,
        atom2: startIdx,
        order: 2.0,
        is_aromatic: false,
        length: 1.22,
      });
    }
  } else if (templateId === "carboxyl") {
    // -COOH
    const c = createStudioAtom("C", startIdx, origin.x, origin.y, origin.z);
    const o1 = createStudioAtom("O", startIdx + 1, origin.x + 1.1, origin.y + 0.6, origin.z);
    const o2 = createStudioAtom("O", startIdx + 2, origin.x + 1.1, origin.y - 0.7, origin.z);
    newAtoms.push(c, o1, o2);
    // C=O double bond
    newBonds.push({ atom1: startIdx, atom2: startIdx + 1, order: 2.0, is_aromatic: false, length: 1.22 });
    // C-OH single bond
    newBonds.push({ atom1: startIdx, atom2: startIdx + 2, order: 1.0, is_aromatic: false, length: 1.36 });
    if (anchorAtom) {
      newBonds.push({ atom1: anchorAtom.index, atom2: startIdx, order: 1.0, is_aromatic: false, length: 1.52 });
    }
  } else if (templateId === "methyl") {
    // -CH3
    const c = createStudioAtom("C", startIdx, origin.x, origin.y, origin.z);
    newAtoms.push(c);
    if (anchorAtom) {
      newBonds.push({
        atom1: anchorAtom.index,
        atom2: startIdx,
        order: 1.0,
        is_aromatic: false,
        length: 1.54,
      });
    }
  }

  return { newAtoms, newBonds };
}

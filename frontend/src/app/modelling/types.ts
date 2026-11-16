/** Type definitions for the 3D Molecular Modelling Workstation. */

export type ModellingTool =
  | "add_atom"
  | "select"
  | "move_atom"
  | "add_bond"
  | "change_bond"
  | "delete"
  | "measure_distance"
  | "measure_angle"
  | "measure_dihedral"
  | "rotate";

export type RenderMode = "ball_stick" | "spacefill" | "stick" | "wireframe";

export interface ModellingAtom {
  id: number;
  symbol: string;
  name: string;
  atomicNumber: number;
  mass: number;
  x: number;
  y: number;
  z: number;
  vdwRadius: number;
  covalentRadius: number;
  color: string;
  isHydrogen: boolean;
  formalCharge?: number;
}

export interface ModellingBond {
  id: string; // e.g. "1-2"
  atom1: number; // id of atom1
  atom2: number; // id of atom2
  order: number; // 1, 2, 3, 1.5
  length?: number;
}

export interface ValenceWarning {
  atomId: number;
  symbol: string;
  currentValence: number;
  maxValence: number;
  message: string;
  severity: "warning" | "error";
}

export interface MeasurementResult {
  type: "distance" | "angle" | "dihedral";
  atoms: number[];
  label: string;
  value: string;
}

export interface FunctionalGroupMatch {
  name: string;
  formula: string;
  description: string;
  atomIds: number[];
}

export interface PhysicochemicalProperties {
  hbd: number; // Hydrogen bond donors
  hba: number; // Hydrogen bond acceptors
  rotatableBonds: number;
  approxTPSA: number;
  lipinskiPass: boolean;
  lipinskiViolations: string[];
}

export interface MolecularStats {
  formula: string;
  mass: number;
  atomCount: number;
  bondCount: number;
  heavyAtomCount: number;
  elementCounts: Record<string, number>;
  bondCounts: { single: number; double: number; triple: number; aromatic: number };
  functionalGroups: FunctionalGroupMatch[];
  properties: PhysicochemicalProperties;
}

export interface HistoryEntry {
  atoms: ModellingAtom[];
  bonds: ModellingBond[];
  description: string;
}

export interface VSEPRInfo {
  atomId: number;
  symbol: string;
  coordinationNumber: number;
  geometry: string;
  idealAngle: string;
}

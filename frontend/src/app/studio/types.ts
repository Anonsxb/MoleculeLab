/** Type definitions for the MoleculeLab 3D Molecular Modelling Workstation. */

export interface StudioAtom {
  index: number;
  symbol: string;
  atomic_number: number;
  x: number;
  y: number;
  z: number;
  vdw_radius: number;
  covalent_radius: number;
  gasteiger_charge: number;
  formal_charge: number;
  is_aromatic: boolean;
  hybridization: string;
  color: string;
  is_hydrogen: boolean;
}

export interface StudioBond {
  index?: number;
  atom1: number;
  atom2: number;
  order: number;
  is_aromatic: boolean;
  length: number;
}

export interface MolecularDescriptors {
  molecular_weight: number;
  logp: number;
  hbd: number;
  hba: number;
  tpsa: number;
  rotatable_bonds: number;
  lipinski_violations: number;
  lipinski_pass: boolean;
  violation_details?: string[];
}

export interface StudioData {
  success?: boolean;
  molecule_id?: number | string;
  name?: string;
  input_smiles?: string;
  canonical_smiles?: string;
  formula: string;
  heavy_atom_count?: number;
  total_atom_count: number;
  total_bond_count: number;
  force_field?: string;
  initial_energy_kcal_mol?: number | null;
  final_energy_kcal_mol?: number | null;
  energy_delta_kcal_mol?: number | null;
  converged?: boolean | null;
  atoms: StudioAtom[];
  bonds: StudioBond[];
  descriptors?: MolecularDescriptors;
  formats?: {
    pdb?: string;
    xyz?: string;
    mol?: string;
    sdf?: string;
  };
  rdkit_version?: string;
}

export type StudioTool =
  | "select"
  | "add_atom"
  | "draw_bond"
  | "change_bond"
  | "template"
  | "measure"
  | "delete";

export type RenderMode = "ball_stick" | "stick" | "spacefill" | "charge";

export interface GeometryMeasurement {
  type: string;
  atoms: number[];
  value: string;
  details?: string;
}

export interface PresetMolecule {
  id: string;
  name: string;
  smiles: string;
  category: string;
  description?: string;
}

export interface StructureHistoryItem {
  atoms: StudioAtom[];
  bonds: StudioBond[];
  canonical_smiles?: string;
  formula?: string;
  name?: string;
}

/** Ready-made editable sample molecules and structural fragments for 3D Modelling. */

import type { ModellingAtom, ModellingBond } from "./types";
import { getElement } from "./elements";

export interface SampleMolecule {
  id: string;
  name: string;
  formula: string;
  category: string;
  description: string;
  atoms: ModellingAtom[];
  bonds: ModellingBond[];
}

function makeAtom(id: number, symbol: string, x: number, y: number, z: number): ModellingAtom {
  const el = getElement(symbol);
  return {
    id,
    symbol,
    name: el.name,
    atomicNumber: el.atomicNumber,
    mass: el.mass,
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    z: Math.round(z * 1000) / 1000,
    vdwRadius: el.vdwRadius,
    covalentRadius: el.covalentRadius,
    color: el.color,
    isHydrogen: symbol === "H",
  };
}

export const SAMPLE_MOLECULES: SampleMolecule[] = [
  // 1. Water (H2O) - Bent geometry
  {
    id: "water",
    name: "Water",
    formula: "H2O",
    category: "Inorganic Solvent",
    description: "Fundamental universal solvent with bent geometry (104.5° bond angle) and strong dipole moment.",
    atoms: [
      makeAtom(1, "O", 0.0, 0.0, 0.117),
      makeAtom(2, "H", 0.0, 0.757, -0.469),
      makeAtom(3, "H", 0.0, -0.757, -0.469),
    ],
    bonds: [
      { id: "1-2", atom1: 1, atom2: 2, order: 1, length: 0.96 },
      { id: "1-3", atom1: 1, atom2: 3, order: 1, length: 0.96 },
    ],
  },

  // 2. Methane (CH4) - Perfect tetrahedral
  {
    id: "methane",
    name: "Methane",
    formula: "CH4",
    category: "Alkanes",
    description: "Simplest hydrocarbon with symmetric sp³ tetrahedral geometry (109.5° H-C-H angles).",
    atoms: [
      makeAtom(1, "C", 0.0, 0.0, 0.0),
      makeAtom(2, "H", 0.629, 0.629, 0.629),
      makeAtom(3, "H", -0.629, -0.629, 0.629),
      makeAtom(4, "H", -0.629, 0.629, -0.629),
      makeAtom(5, "H", 0.629, -0.629, -0.629),
    ],
    bonds: [
      { id: "1-2", atom1: 1, atom2: 2, order: 1, length: 1.09 },
      { id: "1-3", atom1: 1, atom2: 3, order: 1, length: 1.09 },
      { id: "1-4", atom1: 1, atom2: 4, order: 1, length: 1.09 },
      { id: "1-5", atom1: 1, atom2: 5, order: 1, length: 1.09 },
    ],
  },

  // 3. Ammonia (NH3) - Trigonal pyramidal
  {
    id: "ammonia",
    name: "Ammonia",
    formula: "NH3",
    category: "Inorganics",
    description: "Trigonal pyramidal geometry with a nitrogen lone pair causing 107.0° bond angles.",
    atoms: [
      makeAtom(1, "N", 0.0, 0.0, 0.116),
      makeAtom(2, "H", 0.0, 0.940, -0.271),
      makeAtom(3, "H", 0.814, -0.470, -0.271),
      makeAtom(4, "H", -0.814, -0.470, -0.271),
    ],
    bonds: [
      { id: "1-2", atom1: 1, atom2: 2, order: 1, length: 1.01 },
      { id: "1-3", atom1: 1, atom2: 3, order: 1, length: 1.01 },
      { id: "1-4", atom1: 1, atom2: 4, order: 1, length: 1.01 },
    ],
  },

  // 4. Carbon Dioxide (CO2) - Linear
  {
    id: "carbon_dioxide",
    name: "Carbon Dioxide",
    formula: "CO2",
    category: "Inorganics",
    description: "Linear molecule (180° angle) featuring two symmetrical C=O double bonds and zero net dipole.",
    atoms: [
      makeAtom(1, "C", 0.0, 0.0, 0.0),
      makeAtom(2, "O", -1.163, 0.0, 0.0),
      makeAtom(3, "O", 1.163, 0.0, 0.0),
    ],
    bonds: [
      { id: "1-2", atom1: 1, atom2: 2, order: 2, length: 1.16 },
      { id: "1-3", atom1: 1, atom2: 3, order: 2, length: 1.16 },
    ],
  },

  // 5. Ethanol (C2H6O)
  {
    id: "ethanol",
    name: "Ethanol",
    formula: "C2H6O",
    category: "Alcohols",
    description: "Common grain alcohol with a two-carbon chain terminating in a polar hydroxyl (-OH) group.",
    atoms: [
      makeAtom(1, "C", -0.74, -0.12, 0.0),
      makeAtom(2, "C", 0.74, 0.12, 0.0),
      makeAtom(3, "O", 1.42, -1.02, 0.0),
      makeAtom(4, "H", 2.36, -0.88, 0.0),
      makeAtom(5, "H", -1.12, -0.62, 0.89),
      makeAtom(6, "H", -1.12, -0.62, -0.89),
      makeAtom(7, "H", -1.12, 0.90, 0.0),
      makeAtom(8, "H", 1.12, 0.62, 0.89),
      makeAtom(9, "H", 1.12, 0.62, -0.89),
    ],
    bonds: [
      { id: "1-2", atom1: 1, atom2: 2, order: 1, length: 1.54 },
      { id: "2-3", atom1: 2, atom2: 3, order: 1, length: 1.43 },
      { id: "3-4", atom1: 3, atom2: 4, order: 1, length: 0.96 },
      { id: "1-5", atom1: 1, atom2: 5, order: 1, length: 1.09 },
      { id: "1-6", atom1: 1, atom2: 6, order: 1, length: 1.09 },
      { id: "1-7", atom1: 1, atom2: 7, order: 1, length: 1.09 },
      { id: "2-8", atom1: 2, atom2: 8, order: 1, length: 1.09 },
      { id: "2-9", atom1: 2, atom2: 9, order: 1, length: 1.09 },
    ],
  },

  // 6. Benzene (C6H6) - Aromatic planar ring
  {
    id: "benzene",
    name: "Benzene",
    formula: "C6H6",
    category: "Aromatic Hydrocarbons",
    description: "Archetypal planar aromatic ring with 6 delocalized π electrons and D6h symmetry.",
    atoms: [
      makeAtom(1, "C", 1.397, 0.0, 0.0),
      makeAtom(2, "C", 0.699, 1.210, 0.0),
      makeAtom(3, "C", -0.699, 1.210, 0.0),
      makeAtom(4, "C", -1.397, 0.0, 0.0),
      makeAtom(5, "C", -0.699, -1.210, 0.0),
      makeAtom(6, "C", 0.699, -1.210, 0.0),
      makeAtom(7, "H", 2.479, 0.0, 0.0),
      makeAtom(8, "H", 1.240, 2.147, 0.0),
      makeAtom(9, "H", -1.240, 2.147, 0.0),
      makeAtom(10, "H", -2.479, 0.0, 0.0),
      makeAtom(11, "H", -1.240, -2.147, 0.0),
      makeAtom(12, "H", 1.240, -2.147, 0.0),
    ],
    bonds: [
      { id: "1-2", atom1: 1, atom2: 2, order: 1.5, length: 1.40 },
      { id: "2-3", atom1: 2, atom2: 3, order: 1.5, length: 1.40 },
      { id: "3-4", atom1: 3, atom2: 4, order: 1.5, length: 1.40 },
      { id: "4-5", atom1: 4, atom2: 5, order: 1.5, length: 1.40 },
      { id: "5-6", atom1: 5, atom2: 6, order: 1.5, length: 1.40 },
      { id: "6-1", atom1: 6, atom2: 1, order: 1.5, length: 1.40 },
      { id: "1-7", atom1: 1, atom2: 7, order: 1, length: 1.08 },
      { id: "2-8", atom1: 2, atom2: 8, order: 1, length: 1.08 },
      { id: "3-9", atom1: 3, atom2: 9, order: 1, length: 1.08 },
      { id: "4-10", atom1: 4, atom2: 10, order: 1, length: 1.08 },
      { id: "5-11", atom1: 5, atom2: 11, order: 1, length: 1.08 },
      { id: "6-12", atom1: 6, atom2: 12, order: 1, length: 1.08 },
    ],
  },

  // 7. Glucose (C6H12O6) - D-Glucopyranose chair conformation
  {
    id: "glucose",
    name: "D-Glucose",
    formula: "C6H12O6",
    category: "Carbohydrates",
    description: "Primary biological metabolic fuel in stable ⁴C₁ chair pyranose ring conformation.",
    atoms: [
      makeAtom(1, "C", 1.25, 0.35, -0.22),
      makeAtom(2, "C", 0.65, -0.98, -0.58),
      makeAtom(3, "C", -0.84, -0.92, -0.25),
      makeAtom(4, "C", -1.45, 0.35, -0.85),
      makeAtom(5, "C", -0.73, 1.59, -0.32),
      makeAtom(6, "O", 0.64, 1.46, -0.72),
      makeAtom(7, "O", 2.58, 0.38, -0.68),
      makeAtom(8, "O", 1.34, -2.06, -0.01),
      makeAtom(9, "O", -1.48, -2.07, -0.76),
      makeAtom(10, "O", -2.80, 0.38, -0.45),
      makeAtom(11, "C", -0.81, 1.83, 1.18),
      makeAtom(12, "O", -0.19, 3.06, 1.52),
      // Hydrogens on carbons and oxygens
      makeAtom(13, "H", 1.22, 0.44, 0.87),
      makeAtom(14, "H", 0.70, -1.08, -1.67),
      makeAtom(15, "H", -0.89, -0.87, 0.84),
      makeAtom(16, "H", -1.41, 0.31, -1.94),
      makeAtom(17, "H", -1.18, 2.45, -0.82),
      makeAtom(18, "H", 2.92, 1.25, -0.51),
      makeAtom(19, "H", 1.14, -2.87, -0.48),
      makeAtom(20, "H", -1.43, -2.05, -1.72),
      makeAtom(21, "H", -3.22, -0.38, -0.85),
      makeAtom(22, "H", -1.86, 1.88, 1.49),
      makeAtom(23, "H", -0.34, 1.01, 1.73),
      makeAtom(24, "H", -0.27, 3.19, 2.47),
    ],
    bonds: [
      { id: "1-2", atom1: 1, atom2: 2, order: 1, length: 1.52 },
      { id: "2-3", atom1: 2, atom2: 3, order: 1, length: 1.52 },
      { id: "3-4", atom1: 3, atom2: 4, order: 1, length: 1.52 },
      { id: "4-5", atom1: 4, atom2: 5, order: 1, length: 1.52 },
      { id: "5-6", atom1: 5, atom2: 6, order: 1, length: 1.43 },
      { id: "6-1", atom1: 6, atom2: 1, order: 1, length: 1.43 },
      { id: "1-7", atom1: 1, atom2: 7, order: 1, length: 1.42 },
      { id: "2-8", atom1: 2, atom2: 8, order: 1, length: 1.42 },
      { id: "3-9", atom1: 3, atom2: 9, order: 1, length: 1.42 },
      { id: "4-10", atom1: 4, atom2: 10, order: 1, length: 1.42 },
      { id: "5-11", atom1: 5, atom2: 11, order: 1, length: 1.51 },
      { id: "11-12", atom1: 11, atom2: 12, order: 1, length: 1.42 },
      { id: "1-13", atom1: 1, atom2: 13, order: 1, length: 1.09 },
      { id: "2-14", atom1: 2, atom2: 14, order: 1, length: 1.09 },
      { id: "3-15", atom1: 3, atom2: 15, order: 1, length: 1.09 },
      { id: "4-16", atom1: 4, atom2: 16, order: 1, length: 1.09 },
      { id: "5-17", atom1: 5, atom2: 17, order: 1, length: 1.09 },
      { id: "7-18", atom1: 7, atom2: 18, order: 1, length: 0.96 },
      { id: "8-19", atom1: 8, atom2: 19, order: 1, length: 0.96 },
      { id: "9-20", atom1: 9, atom2: 20, order: 1, length: 0.96 },
      { id: "10-21", atom1: 10, atom2: 21, order: 1, length: 0.96 },
      { id: "11-22", atom1: 11, atom2: 22, order: 1, length: 1.09 },
      { id: "11-23", atom1: 11, atom2: 23, order: 1, length: 1.09 },
      { id: "12-24", atom1: 12, atom2: 24, order: 1, length: 0.96 },
    ],
  },
];

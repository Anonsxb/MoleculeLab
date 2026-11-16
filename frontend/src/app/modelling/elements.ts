/** Periodic element database, CPK color constants, formula, functional group detection, and valence utilities. */

import type {
  ModellingAtom,
  ModellingBond,
  ValenceWarning,
  MolecularStats,
  VSEPRInfo,
  FunctionalGroupMatch,
  PhysicochemicalProperties,
} from "./types";

export interface ElementData {
  symbol: string;
  name: string;
  atomicNumber: number;
  mass: number;
  vdwRadius: number; // in Angstroms
  covalentRadius: number; // in Angstroms
  color: string; // Standard CPK color
  maxValence: number;
  category: "nonmetal" | "halogen" | "noble" | "alkali" | "alkaline" | "metalloid" | "transition" | "metal";
  period: number;
  group: number;
  commonValences: number[];
}

export const PERIODIC_ELEMENTS: Record<string, ElementData> = {
  H: {
    symbol: "H",
    name: "Hydrogen",
    atomicNumber: 1,
    mass: 1.008,
    vdwRadius: 1.2,
    covalentRadius: 0.31,
    color: "#FFFFFF",
    maxValence: 1,
    category: "nonmetal",
    period: 1,
    group: 1,
    commonValences: [1],
  },
  C: {
    symbol: "C",
    name: "Carbon",
    atomicNumber: 6,
    mass: 12.011,
    vdwRadius: 1.7,
    covalentRadius: 0.76,
    color: "#333333",
    maxValence: 4,
    category: "nonmetal",
    period: 2,
    group: 14,
    commonValences: [4],
  },
  N: {
    symbol: "N",
    name: "Nitrogen",
    atomicNumber: 7,
    mass: 14.007,
    vdwRadius: 1.55,
    covalentRadius: 0.71,
    color: "#3050F8",
    maxValence: 4,
    category: "nonmetal",
    period: 2,
    group: 15,
    commonValences: [3, 4],
  },
  O: {
    symbol: "O",
    name: "Oxygen",
    atomicNumber: 8,
    mass: 15.999,
    vdwRadius: 1.52,
    covalentRadius: 0.66,
    color: "#FF0D0D",
    maxValence: 2,
    category: "nonmetal",
    period: 2,
    group: 16,
    commonValences: [2],
  },
  F: {
    symbol: "F",
    name: "Fluorine",
    atomicNumber: 9,
    mass: 18.998,
    vdwRadius: 1.47,
    covalentRadius: 0.57,
    color: "#90E050",
    maxValence: 1,
    category: "halogen",
    period: 2,
    group: 17,
    commonValences: [1],
  },
  P: {
    symbol: "P",
    name: "Phosphorus",
    atomicNumber: 15,
    mass: 30.974,
    vdwRadius: 1.8,
    covalentRadius: 1.07,
    color: "#FF8000",
    maxValence: 5,
    category: "nonmetal",
    period: 3,
    group: 15,
    commonValences: [3, 5],
  },
  S: {
    symbol: "S",
    name: "Sulfur",
    atomicNumber: 16,
    mass: 32.06,
    vdwRadius: 1.8,
    covalentRadius: 1.05,
    color: "#FFFF30",
    maxValence: 6,
    category: "nonmetal",
    period: 3,
    group: 16,
    commonValences: [2, 4, 6],
  },
  Cl: {
    symbol: "Cl",
    name: "Chlorine",
    atomicNumber: 17,
    mass: 35.45,
    vdwRadius: 1.75,
    covalentRadius: 1.02,
    color: "#1FF01F",
    maxValence: 1,
    category: "halogen",
    period: 3,
    group: 17,
    commonValences: [1],
  },
  Br: {
    symbol: "Br",
    name: "Bromine",
    atomicNumber: 35,
    mass: 79.904,
    vdwRadius: 1.85,
    covalentRadius: 1.2,
    color: "#A62929",
    maxValence: 1,
    category: "halogen",
    period: 4,
    group: 17,
    commonValences: [1],
  },
  I: {
    symbol: "I",
    name: "Iodine",
    atomicNumber: 53,
    mass: 126.9,
    vdwRadius: 1.98,
    covalentRadius: 1.39,
    color: "#940094",
    maxValence: 1,
    category: "halogen",
    period: 5,
    group: 17,
    commonValences: [1],
  },
  B: {
    symbol: "B",
    name: "Boron",
    atomicNumber: 5,
    mass: 10.81,
    vdwRadius: 1.92,
    covalentRadius: 0.84,
    color: "#FFB5B5",
    maxValence: 3,
    category: "metalloid",
    period: 2,
    group: 13,
    commonValences: [3],
  },
  Si: {
    symbol: "Si",
    name: "Silicon",
    atomicNumber: 14,
    mass: 28.085,
    vdwRadius: 2.1,
    covalentRadius: 1.11,
    color: "#F0C8A0",
    maxValence: 4,
    category: "metalloid",
    period: 3,
    group: 14,
    commonValences: [4],
  },
  Na: {
    symbol: "Na",
    name: "Sodium",
    atomicNumber: 11,
    mass: 22.99,
    vdwRadius: 2.27,
    covalentRadius: 1.66,
    color: "#AB5CF2",
    maxValence: 1,
    category: "alkali",
    period: 3,
    group: 1,
    commonValences: [1],
  },
  K: {
    symbol: "K",
    name: "Potassium",
    atomicNumber: 19,
    mass: 39.098,
    vdwRadius: 2.75,
    covalentRadius: 2.03,
    color: "#8F40D4",
    maxValence: 1,
    category: "alkali",
    period: 4,
    group: 1,
    commonValences: [1],
  },
  Ca: {
    symbol: "Ca",
    name: "Calcium",
    atomicNumber: 20,
    mass: 40.078,
    vdwRadius: 2.31,
    covalentRadius: 1.76,
    color: "#3DFF00",
    maxValence: 2,
    category: "alkaline",
    period: 4,
    group: 2,
    commonValences: [2],
  },
  Fe: {
    symbol: "Fe",
    name: "Iron",
    atomicNumber: 26,
    mass: 55.845,
    vdwRadius: 2.0,
    covalentRadius: 1.32,
    color: "#E06633",
    maxValence: 3,
    category: "transition",
    period: 4,
    group: 8,
    commonValences: [2, 3],
  },
  Cu: {
    symbol: "Cu",
    name: "Copper",
    atomicNumber: 29,
    mass: 63.546,
    vdwRadius: 2.0,
    covalentRadius: 1.32,
    color: "#C88033",
    maxValence: 2,
    category: "transition",
    period: 4,
    group: 11,
    commonValences: [1, 2],
  },
  Zn: {
    symbol: "Zn",
    name: "Zinc",
    atomicNumber: 30,
    mass: 65.38,
    vdwRadius: 2.01,
    covalentRadius: 1.22,
    color: "#7D80B0",
    maxValence: 2,
    category: "transition",
    period: 4,
    group: 12,
    commonValences: [2],
  },
};

/** Quick-access elements list prominently displayed for school students */
export const COMMON_ELEMENTS = ["H", "C", "N", "O", "P", "S", "F", "Cl", "Br", "I"];

export function getElement(symbol: string): ElementData {
  return (
    PERIODIC_ELEMENTS[symbol] || {
      symbol,
      name: symbol,
      atomicNumber: 6,
      mass: 12.011,
      vdwRadius: 1.7,
      covalentRadius: 0.77,
      color: "#808080",
      maxValence: 4,
      category: "nonmetal",
      period: 2,
      group: 14,
      commonValences: [4],
    }
  );
}

export function searchElements(query: string): ElementData[] {
  const q = query.trim().toLowerCase();
  if (!q) return Object.values(PERIODIC_ELEMENTS);
  return Object.values(PERIODIC_ELEMENTS).filter(
    (el) =>
      el.symbol.toLowerCase().includes(q) ||
      el.name.toLowerCase().includes(q) ||
      el.atomicNumber.toString() === q
  );
}

/** Calculate Hill system molecular formula: C first, H second, remaining elements alphabetical. */
export function calculateFormula(atoms: ModellingAtom[]): string {
  if (atoms.length === 0) return "—";

  const counts: Record<string, number> = {};
  atoms.forEach((a) => {
    counts[a.symbol] = (counts[a.symbol] || 0) + 1;
  });

  const parts: string[] = [];
  // 1. Carbon first if present
  if (counts["C"]) {
    parts.push(`C${counts["C"] > 1 ? counts["C"] : ""}`);
    delete counts["C"];
    // 2. Hydrogen second if Carbon present
    if (counts["H"]) {
      parts.push(`H${counts["H"] > 1 ? counts["H"] : ""}`);
      delete counts["H"];
    }
  }

  // 3. Alphabetical for the rest
  const remaining = Object.keys(counts).sort();
  remaining.forEach((sym) => {
    const c = counts[sym];
    parts.push(`${sym}${c > 1 ? c : ""}`);
  });

  return parts.join("");
}

/** Calculate molecular weight in g/mol */
export function calculateMass(atoms: ModellingAtom[]): number {
  const total = atoms.reduce((sum, a) => {
    const meta = getElement(a.symbol);
    return sum + (meta.mass || 0);
  }, 0);
  return Math.round(total * 1000) / 1000;
}

/** Detect common chemical functional groups from graph topology */
export function detectFunctionalGroups(
  atoms: ModellingAtom[],
  bonds: ModellingBond[]
): FunctionalGroupMatch[] {
  const groups: FunctionalGroupMatch[] = [];
  const atomMap = new Map<number, ModellingAtom>();
  atoms.forEach((a) => atomMap.set(a.id, a));

  // Build adjacency list
  const adj = new Map<number, { neighborId: number; order: number }[]>();
  atoms.forEach((a) => adj.set(a.id, []));
  bonds.forEach((b) => {
    adj.get(b.atom1)?.push({ neighborId: b.atom2, order: b.order });
    adj.get(b.atom2)?.push({ neighborId: b.atom1, order: b.order });
  });

  atoms.forEach((atom) => {
    const neighbors = adj.get(atom.id) || [];

    // 1. Hydroxyl / Alcohol (-OH)
    if (atom.symbol === "O") {
      const hNeighbors = neighbors.filter((n) => atomMap.get(n.neighborId)?.symbol === "H");
      const cNeighbors = neighbors.filter((n) => atomMap.get(n.neighborId)?.symbol === "C");
      if (hNeighbors.length === 1 && cNeighbors.length === 1) {
        // Check if C is not part of C=O (which would make it carboxylic acid)
        const cAtom = atomMap.get(cNeighbors[0].neighborId);
        const cNeighborsOfC = cAtom ? adj.get(cAtom.id) || [] : [];
        const hasDoubleO = cNeighborsOfC.some(
          (cn) => atomMap.get(cn.neighborId)?.symbol === "O" && cn.order === 2
        );
        if (!hasDoubleO) {
          groups.push({
            name: "Hydroxyl / Alcohol",
            formula: "—OH",
            description: "Polar protic group capable of strong hydrogen bonding.",
            atomIds: [atom.id, hNeighbors[0].neighborId],
          });
        }
      }
    }

    // 2. Carbonyl (C=O) and Carboxylic Acid (-COOH)
    if (atom.symbol === "C") {
      const doubleO = neighbors.find(
        (n) => atomMap.get(n.neighborId)?.symbol === "O" && n.order === 2
      );
      if (doubleO) {
        // Check if connected to an -OH
        const singleO = neighbors.find(
          (n) => atomMap.get(n.neighborId)?.symbol === "O" && n.order === 1
        );
        let isCarboxyl = false;
        if (singleO) {
          const oNeighbors = adj.get(singleO.neighborId) || [];
          const oHasH = oNeighbors.some((on) => atomMap.get(on.neighborId)?.symbol === "H");
          if (oHasH) {
            isCarboxyl = true;
            groups.push({
              name: "Carboxylic Acid",
              formula: "—COOH",
              description: "Acidic functional group that readily donates a proton in aqueous media.",
              atomIds: [atom.id, doubleO.neighborId, singleO.neighborId],
            });
          }
        }

        if (!isCarboxyl) {
          // Check aldehyde vs ketone
          const hasH = neighbors.some((n) => atomMap.get(n.neighborId)?.symbol === "H");
          groups.push({
            name: hasH ? "Aldehyde" : "Ketone / Carbonyl",
            formula: hasH ? "—CHO" : ">C=O",
            description: "Polar carbonyl group with electrophilic carbon center.",
            atomIds: [atom.id, doubleO.neighborId],
          });
        }
      }

      // 3. Carbon-Carbon Double & Triple Bonds (Alkene / Alkyne)
      neighbors.forEach((n) => {
        if (n.neighborId > atom.id) {
          const nAtom = atomMap.get(n.neighborId);
          if (nAtom?.symbol === "C") {
            if (n.order === 2) {
              groups.push({
                name: "Alkene (Double Bond)",
                formula: "C=C",
                description: "Unsaturated hydrocarbon feature with sp² hybridization.",
                atomIds: [atom.id, n.neighborId],
              });
            } else if (n.order === 3) {
              groups.push({
                name: "Alkyne (Triple Bond)",
                formula: "C≡C",
                description: "Linear unsaturated hydrocarbon unit with sp hybridization.",
                atomIds: [atom.id, n.neighborId],
              });
            } else if (n.order === 1.5) {
              groups.push({
                name: "Aromatic Bond",
                formula: "C∯C",
                description: "Delocalized π electron aromatic ring connector.",
                atomIds: [atom.id, n.neighborId],
              });
            }
          }
        }
      });
    }

    // 4. Amines (-NH2, -NHR)
    if (atom.symbol === "N") {
      const cNeighbors = neighbors.filter((n) => atomMap.get(n.neighborId)?.symbol === "C");
      const hNeighbors = neighbors.filter((n) => atomMap.get(n.neighborId)?.symbol === "H");
      if (cNeighbors.length > 0) {
        const amineType =
          hNeighbors.length === 2
            ? "Primary Amine (—NH₂)"
            : hNeighbors.length === 1
            ? "Secondary Amine (—NH—)"
            : "Tertiary Amine (—N<)";
        groups.push({
          name: amineType,
          formula: hNeighbors.length === 2 ? "—NH₂" : "—NR₂",
          description: "Basic nitrogen functional group capable of protonation and hydrogen bonding.",
          atomIds: [atom.id, ...hNeighbors.map((h) => h.neighborId)],
        });
      }
    }

    // 5. Halides (F, Cl, Br, I)
    if (["F", "Cl", "Br", "I"].includes(atom.symbol)) {
      groups.push({
        name: `Halide (${getElement(atom.symbol).name})`,
        formula: `—${atom.symbol}`,
        description: "Electronegative halogen substituent influencing lipophilicity and dipole moment.",
        atomIds: [atom.id],
      });
    }

    // 6. Thiol (-SH)
    if (atom.symbol === "S") {
      const hNeighbor = neighbors.find((n) => atomMap.get(n.neighborId)?.symbol === "H");
      if (hNeighbor) {
        groups.push({
          name: "Thiol",
          formula: "—SH",
          description: "Sulfur analogue of alcohol, capable of disulfide bridge formation.",
          atomIds: [atom.id, hNeighbor.neighborId],
        });
      }
    }
  });

  return groups;
}

/** Compute student physicochemical properties and Lipinski Rule of 5 check */
export function computePhysicochemical(
  atoms: ModellingAtom[],
  bonds: ModellingBond[],
  mass: number
): PhysicochemicalProperties {
  let hbd = 0; // H-Bond Donors (O-H, N-H)
  let hba = 0; // H-Bond Acceptors (N, O, F)
  let rotatableBonds = 0;
  let approxTPSA = 0;

  const atomMap = new Map<number, ModellingAtom>();
  atoms.forEach((a) => atomMap.set(a.id, a));

  const neighborCounts = new Map<number, number>();
  atoms.forEach((a) => neighborCounts.set(a.id, 0));
  bonds.forEach((b) => {
    neighborCounts.set(b.atom1, (neighborCounts.get(b.atom1) || 0) + 1);
    neighborCounts.set(b.atom2, (neighborCounts.get(b.atom2) || 0) + 1);
  });

  atoms.forEach((atom) => {
    if (atom.symbol === "O") {
      hba++;
      approxTPSA += 20.2;
    } else if (atom.symbol === "N") {
      hba++;
      approxTPSA += 23.8;
    } else if (atom.symbol === "F") {
      hba++;
    }
  });

  bonds.forEach((b) => {
    const a1 = atomMap.get(b.atom1);
    const a2 = atomMap.get(b.atom2);
    if (!a1 || !a2) return;

    // HBD: O-H or N-H
    if (
      (a1.symbol === "H" && (a2.symbol === "O" || a2.symbol === "N")) ||
      (a2.symbol === "H" && (a1.symbol === "O" || a1.symbol === "N"))
    ) {
      hbd++;
    }

    // Rotatable bond: single bond between non-hydrogen heavy atoms with >1 neighbor
    if (
      b.order === 1 &&
      a1.symbol !== "H" &&
      a2.symbol !== "H" &&
      (neighborCounts.get(a1.id) || 0) > 1 &&
      (neighborCounts.get(a2.id) || 0) > 1
    ) {
      rotatableBonds++;
    }
  });

  // Lipinski Rule of 5 evaluation
  const violations: string[] = [];
  if (mass > 500) violations.push(`Molecular mass (${mass} g/mol) > 500 Da`);
  if (hbd > 5) violations.push(`H-Bond Donors (${hbd}) > 5`);
  if (hba > 10) violations.push(`H-Bond Acceptors (${hba}) > 10`);

  return {
    hbd,
    hba,
    rotatableBonds,
    approxTPSA: Math.round(approxTPSA * 10) / 10,
    lipinskiPass: violations.length <= 1,
    lipinskiViolations: violations,
  };
}

/** Compute live molecular statistics from atoms and bonds */
export function computeMolecularStats(
  atoms: ModellingAtom[],
  bonds: ModellingBond[]
): MolecularStats {
  const elementCounts: Record<string, number> = {};
  let heavyCount = 0;

  atoms.forEach((a) => {
    elementCounts[a.symbol] = (elementCounts[a.symbol] || 0) + 1;
    if (a.symbol !== "H") heavyCount++;
  });

  const bondCounts = { single: 0, double: 0, triple: 0, aromatic: 0 };
  bonds.forEach((b) => {
    if (b.order === 1) bondCounts.single++;
    else if (b.order === 2) bondCounts.double++;
    else if (b.order === 3) bondCounts.triple++;
    else if (b.order === 1.5) bondCounts.aromatic++;
    else bondCounts.single++;
  });

  const mass = calculateMass(atoms);
  const formula = calculateFormula(atoms);
  const functionalGroups = detectFunctionalGroups(atoms, bonds);
  const properties = computePhysicochemical(atoms, bonds, mass);

  return {
    formula,
    mass,
    atomCount: atoms.length,
    bondCount: bonds.length,
    heavyAtomCount: heavyCount,
    elementCounts,
    bondCounts,
    functionalGroups,
    properties,
  };
}

/** Check for chemical valence violations and generate student-friendly warnings */
export function checkValenceWarnings(
  atoms: ModellingAtom[],
  bonds: ModellingBond[]
): ValenceWarning[] {
  const warnings: ValenceWarning[] = [];

  // Calculate sum of bond orders for each atom
  const valenceMap: Record<number, number> = {};
  atoms.forEach((a) => {
    valenceMap[a.id] = 0;
  });

  bonds.forEach((b) => {
    const order = b.order === 1.5 ? 1.5 : b.order;
    if (valenceMap[b.atom1] !== undefined) valenceMap[b.atom1] += order;
    if (valenceMap[b.atom2] !== undefined) valenceMap[b.atom2] += order;
  });

  atoms.forEach((a) => {
    const curValence = valenceMap[a.id] || 0;
    const meta = getElement(a.symbol);

    if (curValence > meta.maxValence) {
      warnings.push({
        atomId: a.id,
        symbol: a.symbol,
        currentValence: curValence,
        maxValence: meta.maxValence,
        message: `${meta.name} (${a.symbol}${a.id}) has ${curValence} bonds, exceeding its maximum valence of ${meta.maxValence}. In stable neutral compounds, ${meta.name} forms up to ${meta.maxValence} bonds.`,
        severity: "error",
      });
    } else if (
      a.symbol !== "H" &&
      curValence > 0 &&
      !meta.commonValences.includes(curValence) &&
      meta.commonValences.length > 0 &&
      curValence < meta.maxValence
    ) {
      warnings.push({
        atomId: a.id,
        symbol: a.symbol,
        currentValence: curValence,
        maxValence: meta.maxValence,
        message: `${meta.name} (${a.symbol}${a.id}) has ${curValence} bonds. Typical valence is ${meta.commonValences.join(" or ")}. Consider adding hydrogens or bonds.`,
        severity: "warning",
      });
    }
  });

  return warnings;
}

/** Infer VSEPR geometry for central atoms */
export function detectVSEPRGeometries(
  atoms: ModellingAtom[],
  bonds: ModellingBond[]
): VSEPRInfo[] {
  const results: VSEPRInfo[] = [];

  atoms.forEach((atom) => {
    if (atom.symbol === "H") return;

    // Count bonded neighbors and total bond order
    const connectedBonds = bonds.filter((b) => b.atom1 === atom.id || b.atom2 === atom.id);
    const coordNum = connectedBonds.length;
    if (coordNum < 2) return; // Need at least 2 neighbors for angle geometry

    let geometry = "Undetermined";
    let idealAngle = "—";

    if (atom.symbol === "C") {
      if (coordNum === 4) {
        geometry = "Tetrahedral (sp³)";
        idealAngle = "109.5°";
      } else if (coordNum === 3) {
        geometry = "Trigonal Planar (sp²)";
        idealAngle = "120.0°";
      } else if (coordNum === 2) {
        geometry = "Linear (sp)";
        idealAngle = "180.0°";
      }
    } else if (atom.symbol === "N") {
      if (coordNum === 3) {
        geometry = "Trigonal Pyramidal";
        idealAngle = "107.0°";
      } else if (coordNum === 4) {
        geometry = "Tetrahedral (Ammonium)";
        idealAngle = "109.5°";
      } else if (coordNum === 2) {
        geometry = "Bent (Imine)";
        idealAngle = "120.0°";
      }
    } else if (atom.symbol === "O") {
      if (coordNum === 2) {
        geometry = "Bent (2 lone pairs)";
        idealAngle = "104.5°";
      } else if (coordNum === 3) {
        geometry = "Trigonal Pyramidal (Oxonium)";
        idealAngle = "107.0°";
      }
    } else if (atom.symbol === "P") {
      if (coordNum === 3) {
        geometry = "Trigonal Pyramidal";
        idealAngle = "107.0°";
      } else if (coordNum === 4 || coordNum === 5) {
        geometry = coordNum === 4 ? "Tetrahedral" : "Trigonal Bipyramidal";
        idealAngle = coordNum === 4 ? "109.5°" : "90° / 120°";
      }
    } else if (atom.symbol === "S") {
      if (coordNum === 2) {
        geometry = "Bent";
        idealAngle = "92.0° – 104.5°";
      } else if (coordNum === 4) {
        geometry = "Tetrahedral (Sulfate/Sulfone)";
        idealAngle = "109.5°";
      }
    }

    if (geometry !== "Undetermined") {
      results.push({
        atomId: atom.id,
        symbol: `${atom.symbol}${atom.id}`,
        coordinationNumber: coordNum,
        geometry,
        idealAngle,
      });
    }
  });

  return results;
}

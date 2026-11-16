import React, { createContext, useContext, Dispatch } from "react";

export type Atom = {
  index: number;
  symbol: string;
  x: number;
  y: number;
  z: number;
  is_hydrogen: boolean;
};

export type Bond = {
  atom1: number;
  atom2: number;
  order: number;
  is_aromatic: boolean;
};

export type EditorMode = "select" | "add_atom" | "draw_bond" | "delete" | "measure";

export interface EditorState {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtom?: number;
  selectedBond?: [number, number];
  mode: EditorMode;
  elementToAdd?: string; // e.g. "C"
  bondOrderToAdd?: number; // 1,2,3
  // history for undo/redo
  history: { atoms: Atom[]; bonds: Bond[] }[];
  future: { atoms: Atom[]; bonds: Bond[] }[];
}

export const EditorContext = createContext<{ state: EditorState; dispatch: Dispatch<any> }>(null as any);
export const useEditor = () => useContext(EditorContext);

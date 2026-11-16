import { EditorState, Atom, Bond } from "./editorContext";

export const editorReducer = (state: EditorState, action: any): EditorState => {
  switch (action.type) {
    case "SET_MODE": {
      return { ...state, mode: action.payload };
    }
    case "SET_ELEMENT_TO_ADD": {
      return { ...state, elementToAdd: action.payload };
    }
    case "SET_BOND_ORDER": {
      return { ...state, bondOrderToAdd: action.payload };
    }
    case "ADD_ATOM": {
      const newAtom: Atom = action.payload;
      const newAtoms = [...state.atoms, newAtom];
      return {
        ...state,
        atoms: newAtoms,
        history: [...state.history, { atoms: state.atoms, bonds: state.bonds }],
        future: [],
      };
    }
    case "ADD_BOND": {
      const newBond: Bond = action.payload;
      const newBonds = [...state.bonds, newBond];
      return {
        ...state,
        bonds: newBonds,
        history: [...state.history, { atoms: state.atoms, bonds: state.bonds }],
        future: [],
      };
    }
    case "DELETE_ATOM": {
      const idx = action.payload as number;
      const newAtoms = state.atoms.filter((a) => a.index !== idx);
      const newBonds = state.bonds.filter((b) => b.atom1 !== idx && b.atom2 !== idx);
      return {
        ...state,
        atoms: newAtoms,
        bonds: newBonds,
        selectedAtom: undefined,
        selectedBond: undefined,
        history: [...state.history, { atoms: state.atoms, bonds: state.bonds }],
        future: [],
      };
    }
    case "DELETE_BOND": {
      const { a1, a2 } = action.payload as { a1: number; a2: number };
      const newBonds = state.bonds.filter(
        (b) => !(b.atom1 === a1 && b.atom2 === a2) && !(b.atom1 === a2 && b.atom2 === a1)
      );
      return {
        ...state,
        bonds: newBonds,
        selectedBond: undefined,
        history: [...state.history, { atoms: state.atoms, bonds: state.bonds }],
        future: [],
      };
    }
    case "SET_SELECTED_ATOM": {
      return { ...state, selectedAtom: action.payload };
    }
    case "SET_SELECTED_BOND": {
      return { ...state, selectedBond: action.payload };
    }
    case "UNDO": {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      return {
        ...state,
        atoms: previous.atoms,
        bonds: previous.bonds,
        history: newHistory,
        future: [{ atoms: state.atoms, bonds: state.bonds }, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        atoms: next.atoms,
        bonds: next.bonds,
        history: [...state.history, { atoms: state.atoms, bonds: state.bonds }],
        future: newFuture,
      };
    }
    case "RESET": {
      return action.payload as EditorState;
    }
    default:
      return state;
  }
};

import React from "react";
import { useEditor } from "./editorContext";
import styles from "./studio.module.css";

const ELEMENTS = ["C", "H", "N", "O", "S", "P", "F", "Cl", "Br", "I"];
const BOND_ORDERS = [
  { label: "Single", value: 1 },
  { label: "Double", value: 2 },
  { label: "Triple", value: 3 },
  { label: "Aromatic", value: 1.5 },
];

export const EditorToolbar: React.FC = () => {
  const { state, dispatch } = useEditor();

  const setMode = (mode: "select" | "add_atom" | "draw_bond" | "delete" | "measure") => {
    dispatch({ type: "SET_MODE", payload: mode });
  };

  return (
    <aside className={styles.editorToolbar}>
      {/* Mode Buttons */}
      <div className={styles.toolGroup}>
        <button
          className={`${styles.toolBtn} ${state.mode === "select" ? styles.toolBtnActive : ""}`}
          onClick={() => setMode("select")}
          title="Select / Inspect"
        >
          🖱️
        </button>
        <button
          className={`${styles.toolBtn} ${state.mode === "add_atom" ? styles.toolBtnActive : ""}`}
          onClick={() => setMode("add_atom")}
          title="Add Atom"
        >
          ⚛️
        </button>
        <button
          className={`${styles.toolBtn} ${state.mode === "draw_bond" ? styles.toolBtnActive : ""}`}
          onClick={() => setMode("draw_bond")}
          title="Draw Bond"
        >
          —
        </button>
        <button
          className={`${styles.toolBtn} ${state.mode === "delete" ? styles.toolBtnActive : ""}`}
          onClick={() => setMode("delete")}
          title="Delete"
        >
          🗑️
        </button>
      </div>

      {/* Element selector – only shown when in add_atom mode */}
      {state.mode === "add_atom" && (
        <div className={styles.toolGroup} style={{ marginTop: 8 }}>
          <select
            value={state.elementToAdd || "C"}
            onChange={(e) => dispatch({ type: "SET_ELEMENT_TO_ADD", payload: e.target.value })}
            className={styles.selectBox}
          >
            {ELEMENTS.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bond order selector – only when drawing bonds */}
      {state.mode === "draw_bond" && (
        <div className={styles.toolGroup} style={{ marginTop: 8 }}>
          <select
            value={state.bondOrderToAdd || 1}
            onChange={(e) => dispatch({ type: "SET_BOND_ORDER", payload: Number(e.target.value) })}
            className={styles.selectBox}
          >
            {BOND_ORDERS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Undo / Redo */}
      <div className={styles.toolGroup} style={{ marginTop: 8 }}>
        <button
          className={styles.toolBtn}
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={state.history.length === 0}
          title="Undo"
        >
          ↶
        </button>
        <button
          className={styles.toolBtn}
          onClick={() => dispatch({ type: "REDO" })}
          disabled={state.future.length === 0}
          title="Redo"
        >
          ↷
        </button>
      </div>
    </aside>
  );
};

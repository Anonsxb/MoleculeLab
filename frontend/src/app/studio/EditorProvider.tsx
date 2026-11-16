import React, { useReducer, PropsWithChildren } from "react";
import { EditorContext, EditorState } from "./editorContext";
import { editorReducer } from "./editorReducer";

// Initial empty editor state – will be replaced when a molecule loads.
const initialState: EditorState = {
  atoms: [],
  bonds: [],
  mode: "select",
  history: [],
  future: [],
};

export const EditorProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
};

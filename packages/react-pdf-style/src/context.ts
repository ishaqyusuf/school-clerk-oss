import { createContext, useContext } from "react";

type PdfModeContextValue = { isPdf: boolean };

const PdfModeContext = createContext<PdfModeContextValue>({ isPdf: false });

export const PdfModeProvider = PdfModeContext.Provider;

export const usePdfMode = () => useContext(PdfModeContext);

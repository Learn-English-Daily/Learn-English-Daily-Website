"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createSeed } from "./seed";
import type { DemoState } from "./types";

const STORAGE_KEY = "lead-client-demo-v1";
type StoreValue = { state: DemoState; setState: React.Dispatch<React.SetStateAction<DemoState>>; reset: () => void };
const Store = createContext<StoreValue | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(createSeed);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setState(JSON.parse(saved) as DemoState); } catch { localStorage.removeItem(STORAGE_KEY); } setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, ready]);
  const value = useMemo(() => ({ state, setState, reset: () => { const seed = createSeed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); setState(seed); } }), [state]);
  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export function useDemoStore() { const value = useContext(Store); if (!value) throw new Error("Demo store is missing"); return value; }

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Branding, DEFAULT_BRANDING, getPreset } from "@/config/app-config";

type SettingsContextType = {
  branding: Branding;
  updateBranding: (patch: Partial<Branding>) => void;
  resetBranding: () => void;
  ready: boolean;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = "church_app_branding_v1";

/** Apply theme tokens to the document root so the whole app re-themes live. */
function applyTheme(branding: Branding) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const preset = getPreset(branding.themeId);

  root.style.setProperty("--color-primary", preset.primary);
  root.style.setProperty("--color-primary-soft", preset.primarySoft);
  root.style.setProperty("--color-accent", preset.accent);
  root.style.setProperty("--color-accent-soft", preset.accentSoft);
  root.style.setProperty("--color-secondary", preset.secondary);

  root.setAttribute("data-theme", branding.darkMode ? "dark" : "light");
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [ready, setReady] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULT_BRANDING, ...JSON.parse(raw) };
        setBranding(parsed);
        applyTheme(parsed);
      } else {
        applyTheme(DEFAULT_BRANDING);
      }
    } catch {
      applyTheme(DEFAULT_BRANDING);
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Branding) => {
    setBranding(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const updateBranding = useCallback(
    (patch: Partial<Branding>) => {
      setBranding((prev) => {
        const next = { ...prev, ...patch };
        applyTheme(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const resetBranding = useCallback(() => {
    persist(DEFAULT_BRANDING);
  }, [persist]);

  return (
    <SettingsContext.Provider value={{ branding, updateBranding, resetBranding, ready }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  Branding,
  DEFAULT_BRANDING,
  hexToRgbChannels,
  softChannels,
  rowToBranding,
  brandingToRow,
} from "@/config/app-config";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type SettingsContextType = {
  branding: Branding;
  /** Optimistically update local theme (no DB write). */
  setLocal: (patch: Partial<Branding>) => void;
  /** Persist a patch to Supabase (and update locally). */
  save: (patch: Partial<Branding>) => Promise<void>;
  ready: boolean;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

/** Apply theme tokens to <html> so the whole app re-themes live. */
function applyTheme(b: Branding) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--color-primary", hexToRgbChannels(b.colorPrimary));
  root.style.setProperty("--color-primary-soft", softChannels(b.colorPrimary, 0.82));
  root.style.setProperty("--color-accent", hexToRgbChannels(b.colorAccent));
  root.style.setProperty("--color-accent-soft", softChannels(b.colorAccent, 0.85));
  root.setAttribute("data-theme", b.darkMode ? "dark" : "light");
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [ready, setReady] = useState(false);
  const idRef = useRef<string | null>(null);

  // Initial load from Supabase + subscribe to realtime changes.
  useEffect(() => {
    applyTheme(DEFAULT_BRANDING);

    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data) {
        const b = rowToBranding(data);
        idRef.current = b.id ?? null;
        setBranding(b);
        applyTheme(b);
      }
      setReady(true);

      // Realtime: any change to the settings row re-themes all clients.
      channel = supabase
        .channel("app_settings_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_settings" },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (!row || !row.id) return;
            const b = rowToBranding(row);
            idRef.current = b.id ?? idRef.current;
            setBranding(b);
            applyTheme(b);
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const setLocal = useCallback((patch: Partial<Branding>) => {
    setBranding((prev) => {
      const next = { ...prev, ...patch };
      applyTheme(next);
      return next;
    });
  }, []);

  const save = useCallback(
    async (patch: Partial<Branding>) => {
      // optimistic local update
      setLocal(patch);

      if (!isSupabaseConfigured) return;
      const supabase = createClient();

      // Ensure we know the row id.
      if (!idRef.current) {
        const { data } = await supabase
          .from("app_settings")
          .select("id")
          .limit(1)
          .maybeSingle();
        idRef.current = (data?.id as string) ?? null;
      }

      const row = brandingToRow(patch);
      if (idRef.current) {
        await supabase.from("app_settings").update(row).eq("id", idRef.current);
      } else {
        const { data } = await supabase
          .from("app_settings")
          .insert(row)
          .select("id")
          .single();
        idRef.current = (data?.id as string) ?? null;
      }
    },
    [setLocal]
  );

  return (
    <SettingsContext.Provider value={{ branding, setLocal, save, ready }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

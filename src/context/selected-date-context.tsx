"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";

/**
 * التاريخ المختار من الهيدر (يُشارَك عبر التطبيق).
 * الصيغة: ISO يوم "YYYY-MM-DD". تُستخدم في تسجيل/إلغاء الحضور وحدّ النقاط اليومي.
 */
type SelectedDateContextType = {
  date: string; // YYYY-MM-DD
  setDate: (d: string) => void;
};

const SelectedDateContext = createContext<SelectedDateContextType | null>(null);

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const value = useMemo(() => ({ date, setDate }), [date]);
  return (
    <SelectedDateContext.Provider value={value}>
      {children}
    </SelectedDateContext.Provider>
  );
}

export function useSelectedDate() {
  const ctx = useContext(SelectedDateContext);
  if (!ctx)
    throw new Error("useSelectedDate must be used within SelectedDateProvider");
  return ctx;
}

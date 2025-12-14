import { createContext, useContext, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

const SIX_DAYS_IN_MS = 6 * 24 * 60 * 60 * 1000;

export const defaultDateRange: DateRange = {
  from: new Date(Date.now() - SIX_DAYS_IN_MS),
  to: new Date(),
};

export type GoogleAdsSyncContextValue = {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
};

const GoogleAdsSyncContext = createContext<GoogleAdsSyncContextValue | undefined>(undefined);

export function GoogleAdsSyncProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);

  const value = useMemo(
    () => ({
      dateRange,
      setDateRange,
    }),
    [dateRange],
  );

  return <GoogleAdsSyncContext.Provider value={value}>{children}</GoogleAdsSyncContext.Provider>;
}

export function useGoogleAdsSync() {
  const context = useContext(GoogleAdsSyncContext);

  if (!context) {
    throw new Error("useGoogleAdsSync must be used within a GoogleAdsSyncProvider");
  }

  return context;
}

export function formatDateRangeLabel(dateRange?: DateRange) {
  if (!dateRange?.from || !dateRange?.to) {
    return "No date range selected";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(dateRange.from)} – ${formatter.format(dateRange.to)}`;
}

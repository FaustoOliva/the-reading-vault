/**
 * useSelectedYear Hook
 * Keeps the selected statistics year in sync with the web URL
 *
 * Rules:
 * - Default to the current year when no valid year is present
 * - On web, `?year=2026` makes a year view linkable
 * - On web, push history entries so back/forward moves between years
 * - On native, behave as plain local state
 */

import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";

const isWeb = process.env.EXPO_OS === "web";

/**
 * Parse a year from a route param, ignoring invalid values
 * @param value - Raw route param
 * @returns Year or null
 */
function parseYearParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return null;
  }

  const year = Number.parseInt(raw, 10);

  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    return null;
  }

  return year;
}

/**
 * Read the year from the current browser URL
 * @returns Year or null
 */
function readYearFromLocation(): number | null {
  if (!isWeb || typeof window === "undefined") {
    return null;
  }

  return parseYearParam(
    new URL(window.location.href).searchParams.get("year") ?? undefined,
  );
}

/**
 * Hook: current statistics year plus a URL-aware setter
 * @param defaultYear - Year used when the URL has no selection
 */
export function useSelectedYear(defaultYear: number) {
  const params = useLocalSearchParams<{ year?: string }>();
  const [year, setYearState] = useState<number>(() => {
    return parseYearParam(params.year) ?? defaultYear;
  });

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") {
      return;
    }

    // Keep the default selection linkable: /statistics -> /statistics?year=YYYY
    if (readYearFromLocation() === null) {
      const url = new URL(window.location.href);
      url.searchParams.set("year", String(defaultYear));
      window.history.replaceState(null, "", url.toString());
    }
  }, [defaultYear]);

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      setYearState(readYearFromLocation() ?? defaultYear);
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [defaultYear]);

  const setYear = useCallback((nextYear: number) => {
    setYearState(nextYear);

    if (!isWeb || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("year", String(nextYear));
    window.history.pushState(null, "", url.toString());
  }, []);

  return [year, setYear] as const;
}

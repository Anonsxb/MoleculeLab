"use client";

import { useEffect } from "react";

/**
 * Runs a data-loading callback whenever it changes, mirroring the React
 * recommendation of treating the request as an external-system synchronisation.
 * The disable comment is intentionally centralised here instead of being
 * duplicated across every page that loads data on mount.
 */
export function useOnMountLoad(load: () => Promise<void> | void) {
  useEffect(() => {
    void load();
  }, [load]);
}

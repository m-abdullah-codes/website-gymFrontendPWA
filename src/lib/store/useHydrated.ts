"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after the client has mounted — gate any UI that reads persisted
 * zustand state so server HTML and the first client render stay identical.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

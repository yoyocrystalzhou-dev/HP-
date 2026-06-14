import { useState, useEffect, useRef } from "react";
import { store } from "../lib/storage.js";

/**
 * Like useState, but the value is persisted to localStorage under `key`.
 * On first mount it loads the stored value; after that every change saves it.
 *
 * Returns [value, setValue, ready] where `ready` is true once the initial
 * load from storage has completed.
 */
export function usePersist(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [ready, setReady] = useState(false);
  const isFirstRender = useRef(true);

  // Load on mount
  useEffect(() => {
    store.get(key, defaultValue).then((stored) => {
      setValue(stored);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist on change (skip the very first render to avoid double-writes)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (ready) store.set(key, value);
  }, [key, value, ready]);

  return [value, setValue, ready];
}

import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "absenku.displayName.";

function readStoredName(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * The signed-in user's display name.
 *
 * The backend authorization mixin exposes roles but no profile record, so the
 * name is a UI-only preference persisted per principal in localStorage. It is
 * never used as backend-owned data.
 */
export function useDisplayName() {
  const { principal } = useAuth();
  const principalKey = principal?.toString() ?? null;
  const storageKey = principalKey ? `${STORAGE_PREFIX}${principalKey}` : null;

  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) {
      setName(null);
      return;
    }
    setName(readStoredName(storageKey));
  }, [storageKey]);

  const saveName = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      if (!storageKey || trimmed.length === 0) return;
      try {
        window.localStorage.setItem(storageKey, trimmed);
      } catch {
        // Storage unavailable — keep the in-memory value for this session.
      }
      setName(trimmed);
    },
    [storageKey],
  );

  return { name, saveName, hasName: !!name };
}

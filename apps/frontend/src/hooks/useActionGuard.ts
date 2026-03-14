import { useRef } from "react";

export const useActionGuard = (cooldownMs = 500) => {
  const locksRef = useRef(new Map<string, number>());

  return async <T,>(key: string, action: () => Promise<T>) => {
    const now = Date.now();
    const lockedUntil = locksRef.current.get(key) ?? 0;
    if (lockedUntil > now) {
      return undefined;
    }

    locksRef.current.set(key, now + cooldownMs);

    try {
      return await action();
    } finally {
      window.setTimeout(() => {
        locksRef.current.delete(key);
      }, cooldownMs);
    }
  };
};

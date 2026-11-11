import { useEffect, useState } from 'react';

/**
 * Current time, refreshed every `intervalMs` — for relative labels like "Just now"
 * and "Today" (reading `Date.now()` during render would make renders impure).
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

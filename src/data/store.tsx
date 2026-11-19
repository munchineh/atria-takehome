import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ACCOUNT, CREATIVES, type RowStatus } from './mock';

/**
 * Shared job state so the Radar row and the ad detail always show the same
 * status (core bet: the ad is the anchor). Generation is simulated with a timer.
 */
interface Store {
  status: Record<string, RowStatus>;
  credits: number;
  startJob: (creativeId: string, count: number, recIds?: string[], cost?: number) => void;
  markSeen: (creativeId: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Record<string, RowStatus>>(() =>
    Object.fromEntries(CREATIVES.map((c) => [c.id, c.status])),
  );

  const [credits, setCredits] = useState(ACCOUNT.credits);

  useEffect(() => {
    const t = setInterval(() => {
      setStatus((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, s] of Object.entries(prev)) {
          if (s.kind === 'generating') {
            changed = true;
            const p = Math.min(1, s.progress + 0.04);
            next[id] = p >= 1 ? { kind: 'ready', count: s.count, unseen: true, recIds: s.recIds } : { ...s, progress: p };
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const value = useMemo<Store>(
    () => ({
      status,
      credits,
      startJob: (id, count, recIds, cost = 0) => {
        setCredits((c) => c - cost);
        setStatus((p) => ({ ...p, [id]: { kind: 'generating', count, progress: 0.02, recIds } }));
      },
      markSeen: (id) =>
        setStatus((p) => {
          const s = p[id];
          return s?.kind === 'ready' ? { ...p, [id]: { ...s, unseen: false } } : p;
        }),
    }),
    [status, credits],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

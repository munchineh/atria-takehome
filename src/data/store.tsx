import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ACCOUNT, CREATIVES, SMALL_ACCOUNT, SMALL_CREATIVES, recommendationsFor, type Creative } from './mock';
import { buildVariations, type Variation } from './variations';

export const DEMO_ACCOUNTS = [
  { ...ACCOUNT, creatives: CREATIVES },
  { ...SMALL_ACCOUNT, creatives: SMALL_CREATIVES },
];
export const ALL_CREATIVES: Creative[] = [...CREATIVES, ...SMALL_CREATIVES];
export const findCreative = (id?: string) => ALL_CREATIVES.find((c) => c.id === id);
export const accountOf = (c: Creative) => DEMO_ACCOUNTS.find((a) => a.id === c.accountId) ?? DEMO_ACCOUNTS[0];

export type JobState = 'queued' | 'generating' | 'ready' | 'failed';

/** One run of "Create variations" (a round). */
export interface Job {
  id: string;
  creativeId: string;
  recIds: string[];
  perRec: number;
  count: number;
  cost: number;
  size: string;
  state: JobState;
  progress: number;
  /** Indices of variations that failed (credits returned, A22). */
  failed: number[];
  unseen: boolean;
  /** Display date and minutes ago (for "2 h ago" and the 7-day window). */
  date: string;
  minutesAgo: number;
  label?: string;
  variations: Variation[];
}

export type RowStatus =
  | { kind: 'idle' }
  | { kind: 'queued'; count: number; jobId: string }
  | { kind: 'generating'; count: number; progress: number; jobId: string; recIds: string[] }
  | { kind: 'ready'; count: number; failed: number; unseen: boolean; jobId: string; recIds: string[] }
  | { kind: 'failed'; count: number; jobId: string; recIds: string[] };

const mk = (j: Omit<Job, 'variations' | 'count'>): Job => {
  const variations = buildVariations(j.id, j.recIds, j.perRec);
  return { ...j, count: variations.length, variations };
};

/** Seeded jobs, consistent with the Radar rows and ad detail footers. */
const SEED: Job[] = [
  // The round that produced the v2 variation. Older than 7 days, so it's not in Tasks (TR-10).
  { ...mk({ id: 'job-hero-1', creativeId: 'mm-1090245', recIds: ['cta'], perRec: 8, cost: 32, size: '2:3', state: 'ready', progress: 1, failed: [], unseen: false, date: '12 Nov', minutesAgo: 8 * 1440 }) },
  // Partly failed, ready and unseen: the dot on the bell and on the row.
  mk({ id: 'job-1086424', creativeId: 'mm-1086424', recIds: ['stop', 'offer'], perRec: 4, cost: 32, size: '2:3', state: 'ready', progress: 1, failed: [3, 7], unseen: true, date: TODAY_LABEL(), minutesAgo: 120 }),
  // Running now.
  mk({ id: 'job-1090247', creativeId: 'mm-1090247', recIds: ['different', 'offer'], perRec: 4, cost: 32, size: '2:3', state: 'generating', progress: 0.45, failed: [], unseen: false, date: TODAY_LABEL(), minutesAgo: 1 }),
  // Failed on the other account: Tasks spans accounts.
  mk({ id: 'job-tt-1', creativeId: 'tt-toaster-static', recIds: ['stop', 'offer'], perRec: 2, cost: 16, size: '2:3', state: 'failed', progress: 0, failed: [], unseen: false, date: '19 Nov', minutesAgo: 1100 }),
];
function TODAY_LABEL() {
  return '20 Nov';
}

export interface StartOpts {
  creativeId: string;
  recIds: string[];
  perRec: number;
  size: string;
  like?: Variation;
}

interface Store {
  jobs: Job[];
  credits: number;
  accountId: string;
  setAccount: (id: string) => void;
  statusOf: (creativeId: string) => RowStatus;
  jobsFor: (creativeId: string) => Job[];
  startJob: (o: StartOpts) => Job;
  retryJob: (jobId: string) => void;
  markSeen: (jobId: string) => void;
  briefs: Record<string, string>;
  setBrief: (product: string, brief: string) => void;
  /** Last settings per creative, so "Create more" is one click (G4). */
  lastSettings: Record<string, { perRec: number; size: string }>;
  tasksOpen: boolean;
  setTasksOpen: (v: boolean) => void;
  /** Bumps when a job starts, so the bell can animate. */
  bump: number;
  finished: Job[];
  clearFinished: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Simulated speed: a run of 8 finishes in about 30 s (the copy says ~2 min, A17). */
const STEP = 0.035;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(SEED);
  const [credits, setCredits] = useState(ACCOUNT.credits);
  const [accountId, setAccount] = useState(ACCOUNT.id);
  const [briefs, setBriefs] = useState<Record<string, string>>({
    'Sad Pink mochi':
      'Moody Mochi Sad Pink: a slow-rise squishy toy with a hand-painted sad face. $14 each, 3 for $36. For adults 18 to 34 who buy small comfort gifts for themselves or friends. Goal: more purchases from people who already click. Tone: warm, a little deadpan, never childish.',
    'Mystery mood box':
      'Moody Mochi Mystery Box: one of 8 moods, chosen at random. $16. For collectors and gift buyers. Goal: more purchases. Tone: playful, curious.',
  });
  const [lastSettings, setLast] = useState<Store['lastSettings']>({ 'mm-1090245': { perRec: 4, size: '2:3' } });
  const [tasksOpen, setTasksOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [finished, setFinished] = useState<Job[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      setJobs((prev) => {
        let changed = false;
        const done: Job[] = [];
        const next = prev.map((j) => {
          if (j.state === 'queued') {
            changed = true;
            return { ...j, state: 'generating' as const, progress: 0.02 };
          }
          if (j.state !== 'generating') return j;
          changed = true;
          const p = Math.min(1, j.progress + STEP * (8 / Math.max(4, j.count)));
          if (p >= 1) {
            const fin = { ...j, state: 'ready' as const, progress: 1, unseen: true };
            done.push(fin);
            return fin;
          }
          return { ...j, progress: p };
        });
        if (done.length) setFinished((f) => [...f, ...done]);
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const statusOf = useCallback(
    (cid: string): RowStatus => {
      const latest = jobs.filter((j) => j.creativeId === cid && j.minutesAgo < 7 * 1440).at(-1);
      if (!latest) return { kind: 'idle' };
      if (latest.state === 'queued') return { kind: 'queued', count: latest.count, jobId: latest.id };
      if (latest.state === 'generating') return { kind: 'generating', count: latest.count, progress: latest.progress, jobId: latest.id, recIds: latest.recIds };
      if (latest.state === 'failed') return { kind: 'failed', count: latest.count, jobId: latest.id, recIds: latest.recIds };
      // Once seen, the row goes back to its diagnosis; results stay reachable from the ad.
      if (!latest.unseen) return { kind: 'idle' };
      return { kind: 'ready', count: latest.count - latest.failed.length, failed: latest.failed.length, unseen: true, jobId: latest.id, recIds: latest.recIds };
    },
    [jobs],
  );

  const startJob = useCallback(
    (o: StartOpts) => {
      counter.current += 1;
      const id = `job-new-${counter.current}`;
      const used: Record<string, number> = {};
      for (const j of jobs.filter((x) => x.creativeId === o.creativeId && !x.label)) for (const v of j.variations) used[v.recId] = (used[v.recId] ?? 0) + 1;
      const variations = buildVariations(id, o.recIds, o.perRec, used, o.like);
      const busy = jobs.some((j) => j.state === 'generating' && j.creativeId === o.creativeId);
      const job: Job = {
        id,
        creativeId: o.creativeId,
        recIds: o.like ? [o.like.recId] : o.recIds,
        perRec: o.perRec,
        count: variations.length,
        cost: variations.length * ACCOUNT.creditsPerImage,
        size: o.size,
        state: busy ? 'queued' : 'generating',
        progress: 0.02,
        failed: [],
        unseen: false,
        date: TODAY_LABEL(),
        minutesAgo: 0,
        label: o.like ? `More like ${o.like.angle}` : undefined,
        variations,
      };
      setJobs((p) => [...p, job]);
      setCredits((c) => c - job.cost);
      if (!o.like) setLast((l) => ({ ...l, [o.creativeId]: { perRec: o.perRec, size: o.size } }));
      setBump((b) => b + 1);
      return job;
    },
    [jobs],
  );

  const value = useMemo<Store>(
    () => ({
      jobs,
      credits,
      accountId,
      setAccount,
      statusOf,
      jobsFor: (cid) => jobs.filter((j) => j.creativeId === cid),
      startJob,
      retryJob: (jid) => {
        setJobs((p) => p.map((j) => (j.id === jid ? { ...j, state: 'generating', progress: 0.02, failed: [], minutesAgo: 0, date: TODAY_LABEL() } : j)));
        setBump((b) => b + 1);
      },
      markSeen: (jid) => setJobs((p) => (p.some((j) => j.id === jid && j.unseen) ? p.map((j) => (j.id === jid ? { ...j, unseen: false } : j)) : p)),
      briefs,
      setBrief: (product, brief) => setBriefs((b) => ({ ...b, [product]: brief })),
      lastSettings,
      tasksOpen,
      setTasksOpen,
      bump,
      finished,
      clearFinished: () => setFinished([]),
    }),
    [jobs, credits, accountId, statusOf, startJob, briefs, lastSettings, tasksOpen, bump, finished],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

/** Recommendation lookup across creatives (for job names). */
export function recName(creativeId: string, recId: string) {
  const c = findCreative(creativeId);
  return (c && recommendationsFor(c).find((r) => r.id === recId)?.fix) ?? recId;
}

export function timeAgo(min: number) {
  if (min < 1) return 'just now';
  if (min < 60) return `${Math.round(min)} min ago`;
  if (min < 1440) return `${Math.round(min / 60)} h ago`;
  return `${Math.round(min / 1440)} days ago`;
}

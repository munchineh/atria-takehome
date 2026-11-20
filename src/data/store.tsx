import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ACCOUNT, CREATIVES, PERSONAS, PROJECT_CREATIVES, SMALL_ACCOUNT, SMALL_CREATIVES, recommendationsFor, glue, type Creative } from './mock';
import { MORE_ACCOUNTS, TINY_TOAST_EXTRA, type MockAccount, type Persona } from './accounts';
import { applyToImage, buildVariations, STYLIZED, type Variation, type Version } from './variations';

/**
 * Every sidebar account has data (chat 5c, wiring Mancini's 19:08 ask). Each account brings its own averages
 * (grade popovers, copies panel), personas (ad page) and art + headlines (new variations).
 */
export const DEMO_ACCOUNTS: MockAccount[] = [
  {
    ...ACCOUNT,
    personas: PERSONAS as Persona[],
    art: ['x01', 'x02', 'x04', 'x05c', 'x07', 'x08'],
    heads: ['PICK YOUR MOOD', 'SQUISH ME', '3 FOR $36', 'BACK IN SHAPE'],
    creatives: CREATIVES,
  },
  {
    ...SMALL_ACCOUNT,
    avg: { cpa: 28.0, ctr: 1.12, hookRate: 25, retention: 15 },
    personas: [
      { label: 'Small-kitchen cooks', why: 'Likely to respond to size and counter-space messages.', icon: 'home', tint: '#f8ecc9' },
      { label: 'Gift shoppers', why: 'Likely to respond to color and gift messages.', icon: 'gift', tint: '#fde4ec' },
    ],
    art: ['t01', 't03', 't04', 't02'],
    heads: ['TOAST FOR ONE', 'NOW IN MINT', 'FITS ANY SHELF', '$39 TODAY'],
    creatives: [...SMALL_CREATIVES, ...TINY_TOAST_EXTRA],
  },
  ...MORE_ACCOUNTS,
];
export const ALL_CREATIVES: Creative[] = [...DEMO_ACCOUNTS.flatMap((a) => a.creatives), ...PROJECT_CREATIVES];
// 5c line breaks: "Sad Pink · Fits in your palm" must never wrap with the middle dot starting a line.
for (const c of ALL_CREATIVES) {
  c.name = c.name.replace(/ · /g, '\u00a0· ');
  for (const a of c.ads) a.campaign = a.campaign.replace(/ · /g, '\u00a0· ');
}
for (const a of DEMO_ACCOUNTS) for (const p of a.personas) p.why = glue(p.why);
export const findCreative = (id?: string) => ALL_CREATIVES.find((c) => c.id === id);
export const accountOf = (c: Creative) => DEMO_ACCOUNTS.find((a) => a.id === c.accountId) ?? DEMO_ACCOUNTS[0];

/** Drawn art with a dark background (scripts/draw_products.py), so the copy goes light on it. */
const DARK_ART = new Set(['ho2', 'ks4', 'lt3', 'pp4', 'sg4']);

/** New variations for other accounts use that account's art and headlines, not Moody Mochi photos. */
function forAccount(vs: Variation[], creativeId: string): Variation[] {
  const c = findCreative(creativeId);
  if (!c || c.accountId === ACCOUNT.id) return vs;
  const acc = accountOf(c);
  return vs.map((v, i) => ({
    ...v,
    img: acc.art[i % acc.art.length],
    copy: { head: acc.heads[i % acc.heads.length], cta: c.copy?.cta ?? 'SHOP NOW', tone: DARK_ART.has(acc.art[i % acc.art.length]) ? undefined : 'dark' },
    typo: undefined,
  }));
}

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
  const variations = forAccount(buildVariations(j.id, j.recIds, j.perRec), j.creativeId);
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
  // Cloned and from-scratch projects (Image ads only).
  mk({ id: 'job-clone-1', creativeId: 'clone-1', recIds: ['different'], perRec: 4, cost: 16, size: '2:3', state: 'ready', progress: 1, failed: [], unseen: false, date: '3 Nov', minutesAgo: 17 * 1440 }),
  mk({ id: 'job-scratch-1', creativeId: 'scratch-1', recIds: ['offer', 'cta'], perRec: 3, cost: 24, size: '2:3', state: 'ready', progress: 1, failed: [], unseen: false, date: '28 Oct', minutesAgo: 23 * 1440 }),
  mk({ id: 'job-tt-1', creativeId: 'tt-toaster-static', recIds: ['stop', 'offer'], perRec: 2, cost: 16, size: '2:3', state: 'failed', progress: 0, failed: [], unseen: false, date: '19 Nov', minutesAgo: 1100 }),
];
/** Screen 7 demo: the Bold offer variation on mm-1086424 already has 2 edits (e02, e03 are edits of it; L-021). */
const SEED_VERSIONS: Record<string, Version[]> = {
  'job-1086424-offer-0': [
    { n: 1, img: 'x05c', copy: { head: '3 FOR', price: '$36', cta: 'PICK 3' }, caption: 'Original', cost: 0, state: 'ready' },
    { n: 2, img: 'e02', copy: { head: '3 FOR', price: '$36', cta: 'PICK 3' }, caption: 'Warmer background with confetti', cost: 4, state: 'ready' },
    { n: 3, img: 'e03', copy: { head: '3 FOR', price: '$36', cta: 'PICK 3' }, caption: 'Make the product bigger', cost: 4, state: 'ready' },
  ],
};
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
  /** Screen 7: versions per variation (ED-07). */
  versionsOf: (v: Variation) => Version[];
  /** Apply a change. On the latest version it adds a version; on an older one it makes a new variation (O3, ED-08). Returns the variation to show. */
  applyChange: (jobId: string, v: Variation, fromN: number, instruction: string) => string;
  /** ED-09: free text edit on the editable layer; adds a version. */
  saveText: (v: Variation, copy: Variation['copy']) => void;
  /** ED-10 / ED-09b: a new variation from an edited prompt or as stylized text. Returns its id. */
  branch: (jobId: string, v: Variation, how: 'prompt' | 'stylized', note: string) => string;
  deleteVariation: (jobId: string, vid: string) => void;
  /** Demo 1: add shortlisted variations as paused ads. */
  launch: (jobId: string, vids: string[], audience: string) => void;
  /** Grade window in days (30, 60, 90). The account default is 60. */
  windowDays: number;
  setWindowDays: (d: number) => void;
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
  const [windowDays, setWindowDays] = useState(60);
  const [versions, setVersions] = useState<Record<string, Version[]>>(SEED_VERSIONS);

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
      const variations = forAccount(buildVariations(id, o.recIds, o.perRec, used, o.like), o.creativeId);
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

  const versionsOf = useCallback(
    (v: Variation): Version[] => versions[v.id] ?? [{ n: 1, img: v.img, copy: v.copy, caption: 'Original', cost: 0, state: 'ready' }],
    [versions],
  );

  /** Adds a variation to its round (count follows, so the Results grid shows it). */
  const addVariation = useCallback((jobId: string, nv: Variation) => {
    setJobs((p) => p.map((j) => (j.id === jobId ? { ...j, variations: [...j.variations, nv], count: j.count + 1 } : j)));
  }, []);

  /** Simulated model call: the version shows "Applying your change", then lands. */
  const land = useCallback((vid: string, n: number, delay = 2600) => {
    setTimeout(() => setVersions((p) => ({ ...p, [vid]: (p[vid] ?? []).map((x) => (x.n === n ? { ...x, state: 'ready' } : x)) })), delay);
  }, []);

  const applyChange = useCallback(
    (jobId: string, v: Variation, fromN: number, instruction: string) => {
      const list = versionsOf(v);
      const src = list.find((x) => x.n === fromN) ?? list.at(-1)!;
      const out = applyToImage(src.img, src.copy, instruction);
      setCredits((c) => c - ACCOUNT.creditsPerImage);
      if (fromN === list.at(-1)!.n) {
        const n = list.length + 1;
        setVersions((p) => ({ ...p, [v.id]: [...list, { n, ...out, caption: instruction, cost: ACCOUNT.creditsPerImage, state: 'applying' }] }));
        land(v.id, n);
        return v.id;
      }
      counter.current += 1;
      const nid = `${v.id}-b${counter.current}`;
      const nv: Variation = { ...v, id: nid, img: out.img, copy: out.copy, typo: undefined, launched: undefined, from: { id: v.id, v: fromN, angle: v.angle, how: 'version' } };
      setVersions((p) => ({
        ...p,
        [nid]: [
          { n: 1, img: src.img, copy: src.copy, caption: `From v${fromN}`, cost: 0, state: 'ready' },
          { n: 2, ...out, caption: instruction, cost: ACCOUNT.creditsPerImage, state: 'applying' },
        ],
      }));
      addVariation(jobId, nv);
      land(nid, 2);
      return nid;
    },
    [versionsOf, land, addVariation],
  );

  const saveText = useCallback(
    (v: Variation, copy: Variation['copy']) => {
      const list = versionsOf(v);
      setVersions((p) => ({ ...p, [v.id]: [...list, { n: list.length + 1, img: list.at(-1)!.img, copy, caption: 'Edited text', cost: 0, state: 'ready' }] }));
    },
    [versionsOf],
  );

  const branch = useCallback(
    (jobId: string, v: Variation, how: 'prompt' | 'stylized', note: string) => {
      const list = versionsOf(v);
      const last = list.at(-1)!;
      counter.current += 1;
      const nid = `${v.id}-${how[0]}${counter.current}`;
      const img = how === 'stylized' ? STYLIZED[last.img] ?? STYLIZED[v.img] ?? last.img : applyToImage(last.img, last.copy, note).img;
      const copy = how === 'stylized' ? undefined : last.copy;
      setCredits((c) => c - ACCOUNT.creditsPerImage);
      const nv: Variation = { ...v, id: nid, img, copy, typo: undefined, launched: undefined, stylized: how === 'stylized', from: { id: v.id, v: last.n, angle: v.angle, how } };
      setVersions((p) => ({ ...p, [nid]: [{ n: 1, img, copy, caption: how === 'stylized' ? 'Stylized text' : 'Edited prompt', cost: ACCOUNT.creditsPerImage, state: 'applying' }] }));
      addVariation(jobId, nv);
      land(nid, 1, 3000);
      return nid;
    },
    [versionsOf, land, addVariation],
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
      versionsOf,
      applyChange,
      saveText,
      branch,
      deleteVariation: (jid, vid) => setJobs((p) => p.map((j) => (j.id === jid ? { ...j, variations: j.variations.map((v) => (v.id === vid ? { ...v, deleted: true } : v)) } : j))),
      launch: (jid, vids, audience) =>
        setJobs((p) => p.map((j) => (j.id === jid ? { ...j, variations: j.variations.map((v) => (vids.includes(v.id) ? { ...v, launched: { audience, date: TODAY_LABEL() } } : v)) } : j))),
      windowDays,
      setWindowDays,
    }),
    [jobs, credits, accountId, statusOf, startJob, briefs, lastSettings, tasksOpen, bump, finished, versionsOf, applyChange, saveText, branch, windowDays],
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

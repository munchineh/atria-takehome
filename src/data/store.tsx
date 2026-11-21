import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ACCOUNT, CREATIVES, PERSONAS, PROJECT_CREATIVES, SMALL_ACCOUNT, SMALL_CREATIVES, recommendationsFor, glue, type Creative } from './mock';
import { MORE_ACCOUNTS, TINY_TOAST_EXTRA, type MockAccount, type Persona } from './accounts';
import { ANGLE_REASON, applyToImage, buildVariations, stylizedRender, adText, type Variation, type Version } from './variations';
import { generateLive } from './live';

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

/**
 * DL-16: a creative started in the Creative gallery, tied to no ad. Modeled on Atria's own starts
 * (from a reference, clone an ad, from an ad's suggestions, ask Raya). The gallery's "New creative" offers three;
 * the fourth (from an ad's suggestions) already lives on the ad page.
 */
export type NewCreativeStart = 'scratch' | 'clone';
export const NEW_CREATIVE_STARTS: { value: NewCreativeStart; title: string; help: string }[] = [
  // Mancini 10:31: two starts, named the same as the gallery tabs (From a brief, Clones). Reference and clone were one idea told twice.
  { value: 'scratch', title: 'AI playground', help: 'Create creatives first and turn them into an ad later.' },
  { value: 'clone', title: 'Start from ads you like', help: 'Pick 1 to 10 ads. Atria rebuilds their idea with your brand and product.' },
];
let projectCount = 0;
/** Adds an untied project to the account and returns it; start its first round with `startJob({ creativeId: project.id, recIds: ['r1'], … })`. */
export function newProject(start: NewCreativeStart, name: string, accountId: string): Creative {
  projectCount += 1;
  const base = PROJECT_CREATIVES.find((c) => c.project === (start === 'clone' ? 'clone' : 'scratch')) ?? PROJECT_CREATIVES[0];
  const c: Creative = { ...base, id: `${start}-new-${projectCount}`, accountId, name: name.trim() || (start === 'clone' ? 'From an ad you like' : 'Untitled creative'), project: start === 'clone' ? 'clone' : 'scratch', ads: [] };
  ALL_CREATIVES.push(c);
  return c;
}
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
  { ...mk({ id: 'job-hero-1', creativeId: 'mm-1090245', recIds: ['cta'], perRec: 8, cost: 32, size: '2:3', state: 'ready', progress: 1, failed: [], unseen: false, date: 'Nov 12', minutesAgo: 8 * 1440 }) },
  // Partly failed, ready and unseen: the dot on the bell and on the row.
  mk({ id: 'job-1086424', creativeId: 'mm-1086424', recIds: ['stop', 'offer'], perRec: 4, cost: 32, size: '2:3', state: 'ready', progress: 1, failed: [3, 7], unseen: true, date: TODAY_LABEL(), minutesAgo: 120 }),
  // Running now.
  mk({ id: 'job-1090247', creativeId: 'mm-1090247', recIds: ['different', 'offer'], perRec: 4, cost: 32, size: '2:3', state: 'generating', progress: 0.45, failed: [], unseen: false, date: TODAY_LABEL(), minutesAgo: 1 }),
  // Failed on the other account: Tasks spans accounts.
  // Cloned and from-scratch projects (Image ads only).
  mk({ id: 'job-clone-1', creativeId: 'clone-1', recIds: ['different'], perRec: 4, cost: 16, size: '2:3', state: 'ready', progress: 1, failed: [], unseen: false, date: 'Nov 3', minutesAgo: 17 * 1440 }),
  mk({ id: 'job-scratch-1', creativeId: 'scratch-1', recIds: ['offer', 'cta'], perRec: 3, cost: 24, size: '2:3', state: 'ready', progress: 1, failed: [], unseen: false, date: 'Oct 28', minutesAgo: 23 * 1440 }),
  mk({ id: 'job-tt-1', creativeId: 'tt-toaster-static', recIds: ['stop', 'offer'], perRec: 2, cost: 16, size: '2:3', state: 'failed', progress: 0, failed: [], unseen: false, date: 'Nov 19', minutesAgo: 1100 }),
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
  return 'Nov 20';
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
  applyChange: (jobId: string, v: Variation, fromN: number, instruction: string, asNew?: boolean) => string;
  /** ED-09: free text edit on the editable layer; adds a version. */
  saveText: (v: Variation, copy: Variation['copy']) => void;
  /** ED-10 / ED-09b: a new variation from an edited prompt or as stylized text. Returns its id. */
  branch: (jobId: string, v: Variation, how: 'prompt' | 'stylized', note: string) => string;
  deleteVariation: (jobId: string, vid: string) => void;
  /** Demo 1: add shortlisted variations as paused ads. */
  launch: (jobId: string, vids: string[], audience: string) => void;
  /**
   * Creative model (Mancini 11:00). A round's options are drafts; starring one saves it to the gallery.
   * Saved ids persist per browser. Archived ones leave the gallery until "Show archived" is on.
   */
  saved: string[];
  setSaved: (scope: string[], next: string[]) => void;
  archived: string[];
  setArchived: (ids: string[], on: boolean) => void;
  /** The version a creative shows and sends to an ad. Defaults to the newest. */
  chosen: Record<string, number>;
  choose: (vid: string, n: number | null) => void;
  /** A creative in an ad can't change. Iterate copies its chosen version into a new saved creative, free, and returns its id. */
  iterate: (jobId: string, v: Variation) => string;
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
      'Moody Mochi Sad Pink: a slow-rise squishy toy with a hand-painted sad face. $14 each, 3 for $36. For adults 18 to 34 who buy small comfort gifts for themselves or friends. Goal: more purchases from people who already click. Tone: warm and a little deadpan, for grown-ups.',
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

  /** L-163: swap a variation's sample image for a live one when it arrives. */
  const setVarImg = useCallback((jobId: string, vid: string, img: string) => {
    setJobs((p) => p.map((j) => (j.id === jobId ? { ...j, variations: j.variations.map((v) => (v.id === vid ? { ...v, img } : v)) } : j)));
  }, []);
  const runLive = useCallback(
    (jobId: string, creativeId: string, list: Variation[], ratio: string) => {
      const src = ALL_CREATIVES.find((c) => c.id === creativeId)?.img;
      if (!src) return;
      let k = 0;
      const next = async (): Promise<void> => {
        const v = list[k++];
        if (!v) return;
        const why = ANGLE_REASON[v.angle] ?? '';
        const slot = await generateLive(src, `${recName(creativeId, v.recId)}. Angle: ${v.angle}. ${why}`, ratio === '3:4' ? '3:4' : '2:3');
        if (slot) setVarImg(jobId, v.id, slot);
        return next();
      };
      // Three at a time: fast enough for a round of 8 without tripping rate limits.
      void Promise.all([next(), next(), next()]);
    },
    [setVarImg],
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
      runLive(id, o.creativeId, variations, o.size);
      if (!o.like) setLast((l) => ({ ...l, [o.creativeId]: { perRec: o.perRec, size: o.size } }));
      setBump((b) => b + 1);
      return job;
    },
    [jobs, runLive],
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

  /** L-163: editor changes go live too; the version's image is replaced when Gemini answers. */
  const liveVersion = useCallback((vid: string, n: number, fromSlot: string, instruction: string) => {
    void generateLive(fromSlot, instruction).then((slot) => {
      if (slot) setVersions((p) => ({ ...p, [vid]: (p[vid] ?? []).map((x) => (x.n === n ? { ...x, img: slot } : x)) }));
    });
  }, []);

  const applyChange = useCallback(
    (jobId: string, v: Variation, fromN: number, instruction: string, asNew = false) => {
      const list = versionsOf(v);
      const src = list.find((x) => x.n === fromN) ?? list.at(-1)!;
      const out = applyToImage(src.img, src.copy, instruction);
      setCredits((c) => c - ACCOUNT.creditsPerImage);
      if (!asNew && fromN === list.at(-1)!.n) {
        const n = list.length + 1;
        setVersions((p) => ({ ...p, [v.id]: [...list, { n, ...out, caption: instruction, cost: ACCOUNT.creditsPerImage, state: 'applying' }] }));
        land(v.id, n);
        liveVersion(v.id, n, src.img, instruction);
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
      liveVersion(nid, 2, src.img, instruction);
      return nid;
    },
    [versionsOf, land, addVariation, liveVersion],
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
      const render = how === 'stylized' ? stylizedRender(last.img, v.img) : undefined;
      const img = how === 'stylized' ? render ?? last.img : applyToImage(last.img, last.copy, note).img;
      // Item 11: with a ready-made render the text is in the picture; without one the copy stays, flagged as stylized.
      const copy = how === 'stylized' ? (render ? undefined : last.copy && { ...last.copy, stylized: true }) : last.copy;
      setCredits((c) => c - ACCOUNT.creditsPerImage);
      const nv: Variation = { ...v, id: nid, img, copy, typo: undefined, launched: undefined, stylized: how === 'stylized', from: { id: v.id, v: last.n, angle: v.angle, how } };
      setVersions((p) => ({ ...p, [nid]: [{ n: 1, img, copy, caption: how === 'stylized' ? 'Stylized text' : 'Edited prompt', cost: ACCOUNT.creditsPerImage, state: 'applying' }] }));
      addVariation(jobId, nv);
      land(nid, 1, 3000);
      if (how === 'prompt') liveVersion(nid, 1, last.img, note);
      // No ready-made render: ask the model to draw the text in; when it lands, the overlay copy is dropped.
      if (how === 'stylized' && !render && last.copy)
        void generateLive(last.img, 'Keep the composition. Leave clear space for the text.', '3:4', adText(last.copy)).then((slot) => {
          if (slot) setVersions((p) => ({ ...p, [nid]: (p[nid] ?? []).map((x) => (x.n === 1 ? { ...x, img: slot, copy: undefined } : x)) }));
        });
      return nid;
    },
    [versionsOf, land, addVariation, liveVersion],
  );

  const persisted = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const persist = (key: string, v: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage can be unavailable */
    }
  };
  // Seed: the first two options of every finished round, so the gallery isn't empty on first visit.
  const [saved, setSavedState] = useState<string[]>(() =>
    persisted('atria.saved.v1', SEED.filter((j) => j.state === 'ready').flatMap((j) => j.variations.slice(0, 2).map((v) => v.id))),
  );
  const [archived, setArchivedState] = useState<string[]>(() => persisted('atria.archived.v1', []));
  const [chosen, setChosen] = useState<Record<string, number>>(() => persisted('atria.chosen.v1', {}));
  const setSaved = useCallback((scope: string[], next: string[]) => {
    setSavedState((p) => {
      const out = [...p.filter((x) => !scope.includes(x)), ...next];
      persist('atria.saved.v1', out);
      return out;
    });
  }, []);
  const setArchived = useCallback((ids: string[], on: boolean) => {
    setArchivedState((p) => {
      const out = on ? [...new Set([...p, ...ids])] : p.filter((x) => !ids.includes(x));
      persist('atria.archived.v1', out);
      return out;
    });
  }, []);
  const choose = useCallback((vid: string, n: number | null) => {
    setChosen((p) => {
      const out = { ...p };
      if (n == null) delete out[vid];
      else out[vid] = n;
      persist('atria.chosen.v1', out);
      return out;
    });
  }, []);
  const iterate = useCallback(
    (jobId: string, v: Variation) => {
      const list = versionsOf(v);
      const src = list.find((x) => x.n === chosen[v.id]) ?? list.at(-1)!;
      counter.current += 1;
      const nid = `${v.id}-i${counter.current}`;
      const nv: Variation = { ...v, id: nid, img: src.img, copy: src.copy, typo: undefined, launched: undefined, from: { id: v.id, v: src.n, angle: v.angle, how: 'version' } };
      setVersions((p) => ({ ...p, [nid]: [{ n: 1, img: src.img, copy: src.copy, caption: `Copied from ${v.angle} v${src.n}`, cost: 0, state: 'ready' }] }));
      addVariation(jobId, nv);
      setSaved([], [nid]);
      return nid;
    },
    [versionsOf, chosen, addVariation, setSaved],
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
      saved,
      setSaved,
      archived,
      setArchived,
      chosen,
      choose,
      iterate,
    }),
    [saved, setSaved, archived, setArchived, chosen, choose, iterate, jobs, credits, accountId, statusOf, startJob, briefs, lastSettings, tasksOpen, bump, finished, versionsOf, applyChange, saveText, branch, windowDays],
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

/** Credits a job gave back: all of them when the round failed, 4 per image when only some failed (R-AI8). */
export const creditsReturned = (j: Pick<Job, 'state' | 'cost' | 'failed' | 'count'>) => (j.state === 'failed' ? j.cost : Math.round((j.cost / Math.max(1, j.count)) * j.failed.length));

export function timeAgo(min: number) {
  // R-M10: relative times are spelled out and agree in number ("1 day ago", never "1 days ago").
  const n = (v: number, unit: string) => `${v} ${unit}${v === 1 ? '' : 's'} ago`;
  if (min < 1) return 'just now';
  if (min < 60) return n(Math.round(min), 'minute');
  if (min < 1440) return n(Math.round(min / 60), 'hour');
  return n(Math.round(min / 1440), 'day');
}

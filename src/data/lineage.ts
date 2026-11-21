/**
 * Ad lineage (plan items 16 and 17, DL-04): how an ad got to where it is, step by step.
 *
 *   A (original) → B → C → D      each step is a variation that went live as its own ad
 *                     └ rounds     variations and versions made from a step but not live yet
 *
 * Every step after the first says what changed, why, and how it did against its parent.
 * A step that goes back to something an earlier step already moved away from gets a repeat warning,
 * so teams stop testing the same idea twice.
 *
 * Data and logic only. The UI branch renders it (timeline on phones, tree on desktop).
 */
import { METRIC_META, type Creative, type Grade, type MetricKey } from './mock';
import type { Job } from './store';
import type { Variation, Version } from './variations';

/** What a step set, in plain attribute and value pairs. Repeat detection compares these along the chain. */
export type Traits = Partial<Record<'offer' | 'price' | 'headline' | 'product' | 'background' | 'cta' | 'text', string>>;

export interface StepNote {
  /** The live ad this one was made from. Falls back to `variationOf`. */
  parentId?: string;
  /** Date the step went live, "Nov 14". */
  date: string;
  /** What changed, one line, starts with a verb. */
  summary: string;
  /** Why: the issue in the parent this was meant to fix. */
  reason: string;
  traits: Traits;
}

/** Trait labels for sentences ("removes the price again"). */
const TRAIT_LABEL: Record<keyof Traits, string> = {
  offer: 'offer',
  price: 'price',
  headline: 'headline',
  product: 'product shot',
  background: 'background',
  cta: 'button',
  text: 'text style',
};

/**
 * Notes per ad. Originals carry the traits they started with; later steps carry what they changed.
 * Ads without a note still appear in the chain, with a generic summary.
 */
export const STEP_NOTES: Record<string, StepNote> = {
  // Moody Mochi: the hero chain A → B → C → D.
  'mm-1090245': {
    date: 'Sep 2',
    summary: 'Original ad',
    reason: '',
    traits: { offer: 'two offers (save 15% and free stickers)', price: 'no price', headline: 'question', product: 'three mochi on a shelf' },
  },
  'mm-1090245-v2': {
    parentId: 'mm-1090245',
    date: 'Oct 6',
    summary: 'Cut two offers down to one and showed the price as "3 for $36".',
    reason: 'People clicked but few bought. Two offers competed and there was no price.',
    traits: { offer: 'one offer', price: 'price in a band', headline: 'invitation' },
  },
  'mm-1090245-v3': {
    parentId: 'mm-1090245-v2',
    date: 'Oct 24',
    summary: 'Made the price the headline so it fills the frame.',
    reason: 'The price sat in a small band. Making it the first thing people read gets clicks from people ready to buy.',
    traits: { price: 'price as headline', headline: 'offer', product: 'one mochi, close up' },
  },
  'mm-1090245-v4': {
    parentId: 'mm-1090245-v3',
    date: 'Nov 9',
    summary: 'Swapped the price headline for a product demo line.',
    reason: 'Tested whether showing the slow-rise squish would beat the offer.',
    traits: { price: 'no price', headline: 'demonstration', product: 'hand squeezing one mochi' },
  },
  // 231: two more Moody Mochi steps so history shows on more than one chain.
  'mm-1086424': { date: 'Sep 15', summary: 'Original ad', reason: '', traits: { headline: 'size', product: 'one mochi in a hand' } },
  'mm-1088102': {
    parentId: 'mm-1086424',
    date: 'Oct 14',
    summary: 'Swapped the size headline for "Squish me" and cropped in on the mochi.',
    reason: 'Customers scrolled past. The mochi sat small in the frame.',
    traits: { headline: 'invitation', product: 'one mochi, close up' },
  },
  'vid-ugc': { date: 'Sep 20', summary: 'Original ad', reason: '', traits: { product: 'talking head first' } },
  'vid-asmr': {
    parentId: 'vid-ugc',
    date: 'Oct 28',
    summary: 'Opened on a slow squeeze instead of a talking head.',
    reason: 'Customers left in the first 3 seconds, before the mochi appeared.',
    traits: { product: 'squeeze first' },
  },
  // Other accounts: one step each.
  'pp-duo-v2': { date: 'Oct 30', summary: 'Put the gift price in the headline.', reason: "The ad didn't say what the set costs.", traits: { price: 'price as headline' } },
  'sg-teal-v2': { date: 'Nov 3', summary: 'Changed the background to one bold color.', reason: 'The product blended into a busy scene.', traits: { background: 'one bold color' } },
};

export interface LineageStep {
  id: string;
  /** A, B, C, D along the live chain. */
  letter: string;
  name: string;
  img: string;
  parentId?: string;
  date: string;
  /** "Feed and Stories": where most of its spend goes. */
  placement: string;
  overall: Grade;
  grades: Creative['grades'];
  spend: number;
  summary: string;
  reason: string;
  /** How the step did on the metric it was meant to move, against its parent. */
  result?: { metric: MetricKey; label: string; from: string; to: string; pct: number; better: boolean; text: string };
  /** Set when the step goes back to a trait an earlier step had already moved away from. */
  repeat?: { trait: keyof Traits; firstSeenId: string; firstSeenLetter: string; text: string };
  /** True for the ad the lineage was opened from. */
  current: boolean;
  /** Variations made from this step that are not live ads (yet), newest round first. */
  rounds: { jobId: string; date: string; count: number; kept: number; state: Job['state']; versions: number; imgs: string[] }[];
  /** Other live ads made from this step (branches off the main chain). */
  branchIds: string[];
}

export interface Lineage {
  rootId: string;
  /** The chain from the original to the newest step on the path through `currentId`. */
  steps: LineageStep[];
  /** "A > B > C > D" */
  path: string;
  /** Number of repeat warnings on the chain. */
  repeats: number;
}

export const parentIdOf = (c: Pick<Creative, 'id' | 'variationOf'>) => STEP_NOTES[c.id]?.parentId ?? c.variationOf;

const pct = (from: number, to: number) => (from ? Math.round(((to - from) / from) * 100) : 0);
const placementLine = (c: Creative) =>
  c.placements
    .filter((p) => p.share >= 0.2)
    .map((p) => p.label)
    .join(' and ') || c.placements[0]?.label || 'Feed';

/** The metric a step is judged on: the one its reason targets, else the account's conversion metric. */
function judgedMetric(child: Creative): MetricKey {
  return child.grades.conversion ? 'conversion' : child.grades.ctr ? 'ctr' : 'hook';
}

function resultVs(parent: Creative, child: Creative): LineageStep['result'] {
  const metric = judgedMetric(child);
  const key = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[metric];
  const a = parent.values[key];
  const b = child.values[key];
  if (a == null || b == null) return undefined;
  const meta = METRIC_META[metric];
  const change = pct(a, b);
  const better = meta.lowerIsBetter ? b < a : b > a;
  const label = meta.plain;
  return {
    metric,
    label,
    from: meta.unit(a),
    to: meta.unit(b),
    pct: change,
    better,
    text: change === 0 ? `${label} unchanged` : `${label} ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}% vs ${''}`.trim(),
  };
}

/**
 * Repeat detection: walk the chain keeping each trait's history. A step repeats when it sets a trait to a value
 * an ancestor had, after a step in between changed it away.
 */
function findRepeat(chain: { id: string; letter: string; traits: Traits }[], i: number): LineageStep['repeat'] {
  const step = chain[i];
  for (const trait of Object.keys(step.traits) as (keyof Traits)[]) {
    const value = step.traits[trait];
    let movedAway = false;
    for (let k = i - 1; k >= 0; k--) {
      const earlier = chain[k].traits[trait];
      if (earlier === undefined) continue;
      if (earlier !== value) movedAway = true;
      else if (movedAway)
        return {
          trait,
          firstSeenId: chain[k].id,
          firstSeenLetter: chain[k].letter,
          text: `This goes back to "${value}", which ${chain[k].letter} had before the ${TRAIT_LABEL[trait]} was changed.`,
        };
    }
  }
  return undefined;
}

/** Build the lineage that runs through `currentId`. `all` is every ad in the account; `jobs` are its rounds. */
export function lineageOf(currentId: string, all: Creative[], jobs: Job[] = [], versionsOf?: (v: Variation) => Version[]): Lineage | null {
  const byId = new Map(all.map((c) => [c.id, c]));
  const current = byId.get(currentId);
  if (!current) return null;

  // Up to the original.
  const up: Creative[] = [];
  for (let c: Creative | undefined = current, guard = 0; c && guard < 12; guard++) {
    up.unshift(c);
    const pid = parentIdOf(c);
    c = pid ? byId.get(pid) : undefined;
  }
  // Down from the current ad: follow the newest child at each step.
  const childrenOf = (id: string) => all.filter((c) => parentIdOf(c) === id);
  const noteDate = (c: Creative) => STEP_NOTES[c.id]?.date ?? '';
  const chain = [...up];
  for (let c = current, guard = 0; guard < 12; guard++) {
    const kids = childrenOf(c.id);
    if (!kids.length) break;
    c = kids[kids.length - 1];
    chain.push(c);
  }

  const lettered = chain.map((c, i) => ({ id: c.id, letter: String.fromCharCode(65 + i), traits: STEP_NOTES[c.id]?.traits ?? {} }));
  const steps: LineageStep[] = chain.map((c, i) => {
    const note = STEP_NOTES[c.id];
    const parent = i > 0 ? chain[i - 1] : undefined;
    const result = parent ? resultVs(parent, c) : undefined;
    if (result && parent) result.text = result.pct === 0 ? `${result.label} unchanged vs ${lettered[i - 1].letter}` : `${result.label} ${result.pct > 0 ? 'up' : 'down'} ${Math.abs(result.pct)}% vs ${lettered[i - 1].letter}`;
    const rounds = jobs
      .filter((j) => j.creativeId === c.id)
      .map((j) => ({
        jobId: j.id,
        date: j.date,
        count: j.count,
        kept: j.state === 'failed' ? 0 : j.count - j.failed.length,
        state: j.state,
        imgs: j.variations.map((v) => v.img),
        versions: versionsOf ? j.variations.reduce((n, v) => n + Math.max(0, versionsOf(v).length - 1), 0) : 0,
      }))
      .reverse();
    return {
      id: c.id,
      letter: lettered[i].letter,
      name: c.name,
      img: c.img,
      parentId: parent?.id,
      date: noteDate(c),
      placement: placementLine(c),
      overall: c.overall,
      grades: c.grades,
      spend: c.spend,
      summary: note?.summary ?? (parent ? `Made from ${parent.name}.` : 'Original ad'),
      reason: note?.reason ?? '',
      result,
      repeat: i > 0 ? findRepeat(lettered, i) : undefined,
      current: c.id === currentId,
      rounds,
      branchIds: childrenOf(c.id)
        .filter((k) => k.id !== chain[i + 1]?.id)
        .map((k) => k.id),
    };
  });

  return { rootId: chain[0].id, steps, path: steps.map((s) => s.letter).join(' > '), repeats: steps.filter((s) => s.repeat).length };
}

/** True when an ad has any history worth showing (a parent, a child or a round). */
export const hasLineage = (id: string, all: Creative[], jobs: Job[] = []) => {
  const c = all.find((x) => x.id === id);
  return Boolean(c && (parentIdOf(c) || all.some((x) => parentIdOf(x) === id) || jobs.some((j) => j.creativeId === id)));
};

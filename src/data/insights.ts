/**
 * Derived content for the UI branch (plan items 4, 9 and 15). Data and logic only.
 */
import { GOALS, METRIC_META, goalOf, graded, money, type Creative, type MetricKey, type Recommendation } from './mock';
import type { MockAccount } from './accounts';
import type { Job } from './store';
import { lineageOf, parentIdOf } from './lineage';

type Avg = { cpa: number; ctr: number; hookRate: number; retention: number };
const TARGET_METRIC: Record<Recommendation['target'], MetricKey | null> = { CPA: 'conversion', ROAS: null, CTR: 'ctr', Hook: 'hook' };

/* ---------- Item 4: a suggestion in four parts ---------- */

export interface SuggestionParts {
  id: string;
  /** 1. What's happening. */
  diagnosis: string;
  /** 2. The number behind it, with the account average beside it. */
  evidence: { metric: string; grade: Creative['overall']; value: string; average: string | null; text: string; row: { label: string; value: string; note: string | null } };
  /** 3. What to change, and why that fixes it. */
  action: { title: string; why: string; examples: string[]; visuals: string[] };
  /** 4. What "use this" does: the suggestion is selected and its fix goes into the brief. */
  apply: { label: string; briefLine: string };
}

export function suggestionParts(c: Creative, r: Recommendation, avg: Avg): SuggestionParts {
  const metric = TARGET_METRIC[r.target];
  const meta = metric ? METRIC_META[metric] : null;
  const valueKey = metric ? ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[metric] : null;
  const value = valueKey ? c.values[valueKey] : c.roas;
  const average = meta && valueKey ? meta.unit(avg[meta.avgKey]) : null;
  const shown = meta && value != null ? meta.unit(value) : (c.roas ?? 0).toFixed(2);
  const label = r.target === 'Hook' ? 'Hook rate' : r.target;
  return {
    id: r.id,
    diagnosis: r.issue,
    evidence: {
      metric: label,
      grade: metric ? c.grades[metric] : null,
      value: shown,
      average,
      text: average ? `${label} ${shown}. Account average ${average}.` : `${label} ${shown}.`,
      row: evidenceRow(c, r, label, shown, average),
    },
    action: { title: r.fix, why: r.why, examples: r.examples, visuals: r.visuals ?? [] },
    apply: { label: 'Add to brief', briefLine: briefLineFor(r) },
  };
}

/**
 * Mancini 10:48: two suggestions on the same metric showed the same evidence and read as duplicates.
 * Each cause now cites the signal behind it; the metric line stays in the card header.
 */
function evidenceRow(c: Creative, r: Recommendation, label: string, shown: string, average: string | null) {
  const text = [c.copy?.head, c.copy?.price, c.copy?.band].filter(Boolean).join(' · ');
  if (/clear\s+reason\s+to\s+buy/i.test(r.issue) && text) {
    return { label: 'Ad text', value: `"${text.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase())}"`, note: 'no benefit or reason to choose it' };
  }
  if (/don't\s+see\s+the\s+price/i.test(r.issue) && text) {
    return { label: 'Ad text', value: `"${text.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase())}"`, note: 'no price' };
  }
  // 222: evidence for the two price suggestions on the variations of "Sad Pink · Feeling squishy?".
  if (/only\s+see\s+a\s+price/i.test(r.issue) && text) {
    return { label: 'Ad text', value: `"${text.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase())}"`, note: 'a price, but no reason to choose it' };
  }
  if (/miss\s+the\s+price/i.test(r.issue) && text) {
    return { label: 'Ad text', value: `"${text.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase())}"`, note: 'the price is in a small band' };
  }
  if (/clicking[\s\S]*aren't\s+buying|watch\s+but\s+aren't\s+buying/i.test(r.issue) && c.grades.ctr) {
    return { label: 'CTR', value: `${c.values.ctr.toFixed(2)}% (${c.grades.ctr})`, note: `but ${label} ${shown}${c.grades.conversion ? ` (${c.grades.conversion})` : ''}` };
  }
  return { label, value: shown, note: average ? `account average ${average}` : null };
}

/* ---------- Item 9: a brief filled in from the diagnosis ---------- */

const briefLineFor = (r: Recommendation) => {
  const ex = r.examples[0] ?? r.visuals?.[0];
  return `${r.fix}${ex ? ` (for example ${ex.replace(/\.$/, '')})` : ''}.`;
};

/**
 * A ready-to-edit brief in Atria's four-part shape (product, who it's for, goal, tone), plus the changes the picked
 * suggestions ask for. The dialog offers it as a starting point; every line stays editable.
 */
export function briefFromSuggestions(c: Creative, picked: Recommendation[], account: Pick<MockAccount, 'name' | 'personas'>, saved?: string): string {
  const goal = GOALS[goalOf(c)];
  const who = account.personas.map((p) => p.label.toLowerCase()).join(' and ');
  const base = saved?.trim()
    ? saved.trim()
    : [`Product: ${c.product} from ${account.name}.`, `Who it's for: ${who || 'people who already buy from this brand'}.`, `Goal: ${goal.plain}.`, 'Tone: keep the tone of the original ad.'].join('\n');
  if (!picked.length) return base;
  return `${base}\nWhat to change:\n${picked.map((r) => `- ${briefLineFor(r)}`).join('\n')}`;
}

/* ---------- Item 15: Overview as four questions ---------- */

export interface Delta {
  key: 'spend' | 'purchases' | 'cpa' | 'roas' | 'ctr' | 'value' | 'aov' | 'cpc' | 'cpm';
  label: string;
  now: number;
  before: number;
  pct: number;
  /** Whether the move is good for the account (CPA down is good). Spend is neutral. */
  tone: 'good' | 'bad' | 'neutral';
}

export interface OverviewBriefing {
  /** 1. What do I need to know now? */
  now: { headline: string; lead: { best?: Delta; worst?: Delta }; deltas: Delta[]; counts: { best: number; improve: number; rework: number } };
  /** 2. What should I do next? */
  next: { adId: string; name: string; metric: string; grade: string; spend: number; why: string }[];
  /** 3. What did I do previously? */
  done: { jobId: string; adId: string; name: string; date: string; text: string }[];
  /** 4. What changed? */
  changed: { adId: string; name: string; text: string; tone: 'good' | 'bad' }[];
  /** Section titles and one-line helps, so every surface words them the same way. */
  titles: Record<'now' | 'next' | 'done' | 'changed', { title: string; help: string }>;
}

/** Deterministic "previous period" factor per account, so the same account always tells the same story. */
function drift(id: string, salt: number) {
  const h = [...id].reduce((a, ch) => (a * 33 + ch.charCodeAt(0)) >>> 0, 5381 + salt);
  return 0.86 + (h % 29) / 100; // 0.86 to 1.14
}

const rankOf = (g: Creative['overall']) => (g ? 'ABCD'.indexOf(g[0]) : 9);

export function overviewBriefing(account: MockAccount, windowDays: number, jobs: Job[]): OverviewBriefing {
  const ads = account.creatives.map((c) => graded(c, windowDays));
  const spend = ads.reduce((s, c) => s + c.spend, 0);
  const purchases = ads.reduce((s, c) => s + (c.values.cpa ? c.spend / c.values.cpa : 0), 0);
  const cpa = purchases ? spend / purchases : 0;
  const roas = spend ? ads.reduce((s, c) => s + (c.roas ?? 0) * c.spend, 0) / spend : 0;
  const ctr = spend ? ads.reduce((s, c) => s + c.values.ctr * c.spend, 0) / spend : 0;

  const mk = (key: Delta['key'], label: string, now: number, salt: number, lowerIsBetter?: boolean, neutral?: boolean): Delta => {
    const before = now / drift(account.id, salt);
    const p = before ? Math.round(((now - before) / before) * 100) : 0;
    return { key, label, now, before, pct: p, tone: neutral || p === 0 ? 'neutral' : (lowerIsBetter ? p < 0 : p > 0) ? 'good' : 'bad' };
  };
  // Atria's Key Metrics set (Mancini 09:43, item 21). CPM is a per-account constant in the mock; clicks follow from CPM and CTR.
  const value = spend * roas;
  const aov = purchases ? value / purchases : 0;
  const cpm = 9 + (drift(account.id, 7) - 0.86) * 30;
  const cpc = ctr ? cpm / (10 * ctr) : 0;
  const deltas = [
    mk('spend', 'Spend', spend, 1, false, true),
    mk('purchases', 'Purchases', purchases, 2),
    mk('cpa', 'CPA', cpa, 3, true),
    mk('roas', 'ROAS', roas, 4),
    mk('ctr', 'CTR', ctr, 5),
    mk('value', 'Purchase value', value, 6),
    mk('aov', 'AOV', aov, 8),
    mk('cpc', 'CPC', cpc, 9, true),
    mk('cpm', 'CPM', cpm, 10, true),
  ];
  const headlineSet = deltas.filter((d) => ['roas', 'cpa', 'value', 'cpc'].includes(d.key));

  const counts = { best: ads.filter((c) => c.tab === 'winners').length, improve: ads.filter((c) => c.tab === 'potential').length, rework: ads.filter((c) => c.tab === 'candidates').length };

  // 2. Next: ads spending most with a C or D on the metric their goal needs.
  const next = ads
    .map((c) => {
      const goal = GOALS[goalOf(c)];
      const g = c.grades[goal.metric];
      return { c, goal, g };
    })
    .filter(({ g }) => g && rankOf(g) >= 2)
    .sort((a, b) => b.c.spend - a.c.spend)
    .slice(0, 3)
    .map(({ c, goal, g }) => ({
      adId: c.id,
      name: c.name,
      metric: METRIC_META[goal.metric].plain,
      grade: g as string,
      spend: c.spend,
      why: `Its goal is to ${goal.plain}, and ${METRIC_META[goal.metric].plain} is a ${g}.`,
    }));

  // 3. Done: rounds from the last 7 days, newest first.
  const mine = new Set(account.creatives.map((c) => c.id));
  const done = jobs
    .filter((j) => mine.has(j.creativeId) && j.minutesAgo < 7 * 1440)
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .map((j) => {
      const c = account.creatives.find((x) => x.id === j.creativeId)!;
      const kept = j.count - j.failed.length;
      const live = j.variations.filter((v) => v.launched).length;
      const text =
        j.state === 'failed'
          ? `Round failed. ${j.cost} credits returned.`
          : j.state === 'ready'
            ? `${kept} ${kept === 1 ? 'variation' : 'variations'} ready${live ? `, ${live} added to Meta as paused ads` : ''}.`
            : `Generating ${j.count} variations.`;
      return { jobId: j.id, adId: j.creativeId, name: c.name, date: j.date, text };
    });

  // 4. Changed: variation ads against the ad they came from, plus any repeat warnings in their history.
  const changed: OverviewBriefing['changed'] = [];
  for (const c of ads) {
    const line = lineageOf(c.id, ads);
    const step = line?.steps.find((s) => s.id === c.id);
    if (!step?.result || !step.parentId) continue;
    changed.push({
      adId: c.id,
      name: c.name,
      text: `${step.result.text} (${step.result.from} to ${step.result.to}).${step.repeat ? ' It tests an idea you already tried.' : ''}`,
      tone: step.result.better ? 'good' : 'bad',
    });
  }

  const worst = headlineSet.filter((d) => d.tone === 'bad').sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
  const best = headlineSet.filter((d) => d.tone === 'good').sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
  const move = (d: Delta) => `${d.label} is ${d.pct > 0 ? 'up' : 'down'} ${Math.abs(d.pct)}%`;
  const headline = worst && best ? `${move(best)}, but ${move(worst).replace(' is ', ' is ')} against the period before.` : worst ? `${move(worst)} against the period before.` : best ? `${move(best)} against the period before.` : 'Results are level with the period before.';

  return {
    now: { headline, lead: { best, worst }, deltas, counts },
    next,
    done,
    changed,
    titles: {
      now: { title: 'What to know now', help: `How ${account.name.replace(/\.$/, '')} is doing in this period.` },
      next: { title: 'What to do next', help: 'The ads spending most with a C or D on the metric their goal needs.' },
      done: { title: 'What you did', help: 'Variation rounds from the last 7 days.' },
      changed: { title: 'What changed', help: 'Variation ads against the ad they were made from.' },
    },
  };
}

/* ---------- Mancini 09:43, items 2 and 21: Overview breakdowns ---------- */

export interface BarRow {
  key: string;
  label: string;
  /** Share of spend, 0 to 1. */
  share: number;
  spend: number;
  count: number;
}

/** Grade groups by share of spend. Spend, not ad count, so ten tiny ads can't outweigh one that carries the account. */
export function healthBreakdown(account: MockAccount, windowDays: number): BarRow[] {
  const ads = account.creatives.map((c) => graded(c, windowDays));
  const total = ads.reduce((s, c) => s + c.spend, 0) || 1;
  const rows: [string, string][] = [
    ['winners', 'Best-performing'],
    ['potential', 'To improve'],
    ['candidates', 'Needs rework'],
  ];
  return rows.map(([key, label]) => {
    const group = ads.filter((c) => c.tab === key);
    const spend = group.reduce((s, c) => s + c.spend, 0);
    return { key, label, share: spend / total, spend, count: group.length };
  });
}

/** Spend by format, like Atria's "Breakdowns by spend". */
export function formatBreakdown(account: MockAccount, windowDays: number): BarRow[] {
  const ads = account.creatives.map((c) => graded(c, windowDays));
  const total = ads.reduce((s, c) => s + c.spend, 0) || 1;
  const formats = ['Image', 'Video', 'Carousel'] as const;
  return formats
    .map((f) => {
      const group = ads.filter((c) => c.media === f);
      const spend = group.reduce((s, c) => s + c.spend, 0);
      return { key: f, label: f, share: spend / total, spend, count: group.length };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.spend - a.spend);
}

/* ---------- Mancini 09:43, item 20: one iteration history for the ad page, Radar and Overview ---------- */

export type HistoryItem =
  | { kind: 'round'; id: string; adId: string; name: string; minutesAgo: number; job: Job; text: string }
  | { kind: 'result'; id: string; adId: string; parentId: string; name: string; text: string; tone: 'good' | 'bad'; repeat: boolean; label: string; from: string; to: string; pct: number };

/**
 * Rounds made in Atria and how the variation ads did against the ad they came from.
 * Pass `scope` to limit it to one ad and the ads around it (its parent and the ads made from it).
 */
export function iterationHistory(account: MockAccount, windowDays: number, jobs: Job[], scope?: string, side?: 'from' | 'made'): HistoryItem[] {
  const ads = account.creatives.map((c) => graded(c, windowDays));
  let ids: Set<string> | null = null;
  // 224 (Mancini 15:59, 16:00): on the ad page, "from" is the chain this ad was made from (itself included, so its own
  // result shows) and "made" is every ad made from it, at any depth, plus its own rounds.
  let roundIds: Set<string> | null = null;
  if (scope && side === 'from') {
    ids = new Set<string>();
    for (let c = ads.find((x) => x.id === scope), guard = 0; c && guard < 12; guard++) {
      ids.add(c.id);
      const pid = parentIdOf(c);
      c = pid ? ads.find((x) => x.id === pid) : undefined;
    }
    roundIds = new Set();
  } else if (scope && side === 'made') {
    ids = new Set<string>();
    const queue = [scope];
    while (queue.length) {
      const id = queue.shift()!;
      for (const k of ads.filter((x) => parentIdOf(x) === id)) if (!ids.has(k.id)) (ids.add(k.id), queue.push(k.id));
    }
    roundIds = new Set([scope]);
  } else if (scope) {
    const self = ads.find((c) => c.id === scope);
    ids = new Set([scope, ...(self?.variationOf ? [self.variationOf] : []), ...ads.filter((c) => c.variationOf === scope).map((c) => c.id)]);
  }
  const inScope = (id: string) => !ids || ids.has(id);
  const roundInScope = (id: string) => (roundIds ? roundIds.has(id) : inScope(id));
  const mine = new Set(ads.map((c) => c.id));

  const rounds: HistoryItem[] = jobs
    .filter((j) => mine.has(j.creativeId) && roundInScope(j.creativeId))
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .map((j) => {
      const c = ads.find((x) => x.id === j.creativeId)!;
      const kept = j.count - j.failed.length;
      const live = j.variations.filter((v) => v.launched).length;
      const text =
        j.state === 'failed'
          ? `Round failed. ${j.cost} credits returned.`
          : j.state === 'ready'
            ? `${kept} ${kept === 1 ? 'variation' : 'variations'} made${live ? `, ${live} added to Meta as paused ads` : ''}`
            : j.state === 'queued'
              ? 'Queued'
              : `Generating ${j.count} variations`;
      return { kind: 'round' as const, id: j.id, adId: j.creativeId, name: c.name, minutesAgo: j.minutesAgo, job: j, text };
    });

  const results: HistoryItem[] = [];
  for (const c of ads) {
    if (!inScope(c.id)) continue;
    const line = lineageOf(c.id, ads);
    const step = line?.steps.find((s) => s.id === c.id);
    if (!step?.result || !step.parentId) continue;
    results.push({
      kind: 'result',
      id: `res-${c.id}`,
      adId: c.id,
      parentId: step.parentId,
      name: c.name,
      text: `${step.result.text} (${step.result.from} to ${step.result.to})`,
      tone: step.result.better ? 'good' : 'bad',
      repeat: !!step.repeat,
      label: step.result.label,
      from: step.result.from,
      to: step.result.to,
      pct: step.result.pct,
    });
  }
  return [...rounds, ...results];
}

/* ---------- D8 (approved 10:17): Atria Overview sections we hadn't built ---------- */

/** Creative tags read from what the ad says and shows. Mock rules; Atria tags with AI. */
export function tagsOf(c: Creative): string[] {
  const t: string[] = [c.media];
  const text = [c.copy?.head, c.copy?.price, c.copy?.band].filter(Boolean).join(' ');
  if (/\$\d/.test(text)) t.push('Price shown');
  if (/save|%|free|\d+ for/i.test(text)) t.push('Offer or bundle');
  if (/\?\s*$/.test(c.copy?.head ?? '')) t.push('Question hook');
  if (/\d+ (seconds|hours)|fits|grows|self-watering|hand-/i.test(text)) t.push('Product benefit');
  if (/unboxing/i.test(c.name)) t.push('Unboxing');
  if (/asmr/i.test(c.name)) t.push('ASMR');
  if (c.copy?.cta) t.push(c.copy.cta === 'SHOP NOW' ? 'Generic CTA' : 'Specific CTA');
  if (!c.copy) t.push('No text on image');
  return t;
}

export interface TagRow {
  tag: string;
  count: number;
  spend: number;
  share: number;
  /** Spend-weighted CPA of ads with this tag, against the account's. */
  cpa: number;
  vsAccount: number;
}

/** Tags ranked by spend, with CPA against the account (Atria's "Top creative tags"). */
export function topTags(account: MockAccount, windowDays: number, n = 6): TagRow[] {
  const ads = account.creatives.map((c) => graded(c, windowDays));
  const total = ads.reduce((s, c) => s + c.spend, 0) || 1;
  const buys = (c: Creative) => (c.values.cpa ? c.spend / c.values.cpa : 0);
  const accCpa = total / (ads.reduce((s, c) => s + buys(c), 0) || 1);
  const map = new Map<string, Creative[]>();
  for (const c of ads) for (const tag of tagsOf(c)) map.set(tag, [...(map.get(tag) ?? []), c]);
  return [...map.entries()]
    .map(([tag, group]) => {
      const spend = group.reduce((s, c) => s + c.spend, 0);
      const cpa = spend / (group.reduce((s, c) => s + buys(c), 0) || 1);
      return { tag, count: group.length, spend, share: spend / total, cpa, vsAccount: Math.round(((cpa - accCpa) / accCpa) * 100) };
    })
    .filter((r) => !['Image', 'Video', 'Carousel'].includes(r.tag))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, n);
}

export interface Diversity {
  /** 0 to 100. */
  score: number;
  label: 'Low' | 'Fair' | 'Good';
  concepts: number;
  topShare: number;
  topName: string;
  formats: number;
  line: string;
  /** Ten creative dimensions, each rated on its own, as in Atria's Creative Diversity section. */
  categories: { name: string; level: 'Low' | 'Fair' | 'Good' }[];
  /** The score over the last eight weeks, oldest first. The last point is the current score. */
  trend: number[];
}

const DIVERSITY_DIMENSIONS = ['Visual hook', 'Product quality', 'Theme', 'Media format', 'USP', 'Key message', 'Emotion', 'Core desire', 'Offer type', 'Persona'] as const;

/**
 * Creative diversity: how evenly spend spreads across distinct concepts.
 * A concept is an ad and every variation made from it. Score = 100 × (1 − Herfindahl index of spend by concept):
 * one concept scores 0, ten equal concepts score 90, so 100 is out of reach on purpose.
 */
export function creativeDiversity(account: MockAccount, windowDays: number): Diversity {
  const ads = account.creatives.map((c) => graded(c, windowDays));
  const root = (c: Creative): string => {
    let cur = c;
    for (let i = 0; i < 6 && cur.variationOf; i++) cur = ads.find((x) => x.id === cur.variationOf) ?? cur;
    return cur.id;
  };
  const total = ads.reduce((s, c) => s + c.spend, 0) || 1;
  const byConcept = new Map<string, number>();
  for (const c of ads) byConcept.set(root(c), (byConcept.get(root(c)) ?? 0) + c.spend);
  const shares = [...byConcept.values()].map((v) => v / total);
  const hhi = shares.reduce((s, x) => s + x * x, 0);
  const score = Math.round((1 - hhi) * 100);
  const [topId, topSpend] = [...byConcept.entries()].sort((a, b) => b[1] - a[1])[0];
  const topShare = topSpend / total;
  const topName = ads.find((c) => c.id === topId)?.name ?? '';
  const formats = new Set(ads.map((c) => c.media)).size;
  const label = score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Low';
  const line =
    label === 'Good'
      ? `Spend is spread across ${byConcept.size} concepts, so one tired ad won't drag the account down.`
      : `${Math.round(topShare * 100)}% of spend goes to one concept. Try a new angle so results don't hang on a single ad.`;
  // Media format is rated from the real format count. The other nine dimensions are mock: the demo ads carry no
  // per-dimension tags, so each sits at or one step from the overall label, fixed per account so it doesn't jump.
  const levels = ['Low', 'Fair', 'Good'] as const;
  const base = levels.indexOf(label);
  const categories = DIVERSITY_DIMENSIONS.map((name, i) => {
    if (name === 'Media format') return { name, level: levels[Math.min(formats, 3) - 1] ?? 'Low' };
    const h = [...(account.id + name)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7 + i) % 5;
    const step = h === 0 ? -1 : h === 4 ? 1 : 0;
    return { name, level: levels[Math.max(0, Math.min(2, base + step))] };
  });
  const trend = Array.from({ length: 8 }, (_, i) => {
    const h = [...(account.id + i)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 11) % 9;
    return i === 7 ? score : Math.max(0, Math.min(100, score - (7 - i) * 2 + h - 4));
  });
  return { score, label, concepts: byConcept.size, topShare, topName, formats, line, categories, trend };
}

/** Ask Raya, mock: answers a few common questions from the same data the page shows. */
export const RAYA_PROMPTS = ['Which ad should I improve first?', 'What changed this period?', 'Which creative tags work best?'] as const;
export function askRaya(q: string, account: MockAccount, windowDays: number, jobs: Job[]): string {
  const b = overviewBriefing(account, windowDays, jobs);
  const tags = topTags(account, windowDays, 8);
  if (/improve|fix|first|next/i.test(q)) {
    const n = b.next[0];
    return n ? `Start with ${n.name}. ${n.why} It spent ${money(n.spend).replace(/\.\d\d$/, '')} this period, more than any other ad with a low grade on its goal.` : 'Every ad is B or above on the metric its goal needs, so nothing needs fixing first. Build more of your best-performing ads.';
  }
  if (/tag|work|best|creative/i.test(q)) {
    const best = [...tags].filter((t) => t.count > 1).sort((a, b) => a.vsAccount - b.vsAccount)[0];
    const worst = [...tags].filter((t) => t.count > 1).sort((a, b) => b.vsAccount - a.vsAccount)[0];
    if (!best || !worst || best.tag === worst.tag) return "There aren't enough tagged ads yet to compare.";
    const rel = (t: TagRow) => `${Math.abs(t.vsAccount)}% ${t.vsAccount <= 0 ? 'below' : 'above'}`;
    return `Ads tagged "${best.tag}" have a CPA ${rel(best)} the account average, the best of your tags. Ads tagged "${worst.tag}" are ${rel(worst)} it, so test fewer of those.`;
  }
  return `${b.now.headline} ${b.changed.length ? `${b.changed.length} variation ads have results against the ad they came from; see Iteration history.` : ''}`.trim();
}

/* ---------- Mancini 10:27: what an idea pill copies ---------- */

export interface IdeaText {
  /** What the pill shows. */
  label: string;
  /** Exactly what goes on the clipboard, without quotation marks. Null when the idea is an instruction, not ad copy. */
  copy: string | null;
}

/**
 * One quoted phrase is ad copy: copy just that phrase ('Show the price: "$14 each, 3 for $36"' copies $14 each, 3 for $36).
 * Two or more quoted phrases are a choice the person makes ('drop "Free stickers" or "Buy 3, save 15%"'), so nothing is copied.
 * No quotes at all: the whole line is the copy.
 */
export function ideaText(idea: string): IdeaText {
  const quoted = [...idea.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  // 253: only a single quoted phrase is text to use. Anything else is a direction and doesn't copy.
  if (quoted.length === 1 && idea.trim() === `"${quoted[0]}"`) return { label: idea, copy: quoted[0] };
  return { label: idea, copy: null };
}

/* ---------- Key metric tiles: daily shape for the sparkline (Mancini 13:49) ---------- */
/**
 * Mock daily values for a metric across the selected period and the period before, so the tile can draw
 * this period (solid) over the previous one (dashed). Deterministic per metric so the shape doesn't jump.
 * Each series averages to the period's real value.
 */
export function trendSeries(d: Delta, points = 10): { now: number[]; before: number[] } {
  let seed = [...d.key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const shape = (avg: number, drift: number) => {
    const raw = Array.from({ length: points }, (_, i) => avg * (1 + drift * (i / (points - 1) - 0.5) + (rand() - 0.5) * 0.1));
    const mean = raw.reduce((a, b) => a + b, 0) / points;
    return raw.map((v) => (v * avg) / mean);
  };
  const drift = Math.max(-0.4, Math.min(0.4, d.pct / 100));
  return { now: shape(d.now, drift), before: shape(d.before, 0) };
}

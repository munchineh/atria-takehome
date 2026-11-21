/**
 * Derived content for the UI branch (plan items 4, 9 and 15). Data and logic only.
 */
import { GOALS, METRIC_META, goalOf, graded, type Creative, type MetricKey, type Recommendation } from './mock';
import type { MockAccount } from './accounts';
import type { Job } from './store';
import { lineageOf } from './lineage';

type Avg = { cpa: number; ctr: number; hookRate: number; retention: number };
const TARGET_METRIC: Record<Recommendation['target'], MetricKey | null> = { CPA: 'conversion', ROAS: null, CTR: 'ctr', Hook: 'hook' };

/* ---------- Item 4: a suggestion in four parts ---------- */

export interface SuggestionParts {
  id: string;
  /** 1. What's happening. */
  diagnosis: string;
  /** 2. The number behind it, with the account average beside it. */
  evidence: { metric: string; grade: Creative['overall']; value: string; average: string | null; text: string };
  /** 3. What to change, and why that fixes it. */
  action: { title: string; why: string; examples: string[] };
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
    },
    action: { title: r.fix, why: r.why, examples: r.examples },
    apply: { label: 'Add to brief', briefLine: briefLineFor(r) },
  };
}

/* ---------- Item 9: a brief filled in from the diagnosis ---------- */

const briefLineFor = (r: Recommendation) => `${r.fix}${r.examples[0] ? ` (for example ${r.examples[0].replace(/\.$/, '')})` : ''}.`;

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
  now: { headline: string; deltas: Delta[]; counts: { best: number; improve: number; rework: number } };
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
      text: `${step.result.text} (${step.result.from} to ${step.result.to}).${step.repeat ? ' Repeats an earlier test.' : ''}`,
      tone: step.result.better ? 'good' : 'bad',
    });
  }

  const worst = headlineSet.filter((d) => d.tone === 'bad').sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
  const best = headlineSet.filter((d) => d.tone === 'good').sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
  const move = (d: Delta) => `${d.label} is ${d.pct > 0 ? 'up' : 'down'} ${Math.abs(d.pct)}%`;
  const headline = worst && best ? `${move(best)}, but ${move(worst).replace(' is ', ' is ')} against the period before.` : worst ? `${move(worst)} against the period before.` : best ? `${move(best)} against the period before.` : 'Results are level with the period before.';

  return {
    now: { headline, deltas, counts },
    next,
    done,
    changed,
    titles: {
      now: { title: 'What to know now', help: `How ${account.name.replace(/\.$/, '')} is doing against the period before.` },
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
    ['winners', 'Best'],
    ['potential', 'Improve'],
    ['candidates', 'Rework'],
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
  | { kind: 'result'; id: string; adId: string; parentId: string; name: string; text: string; tone: 'good' | 'bad'; repeat: boolean };

/**
 * Rounds made in Atria and how the variation ads did against the ad they came from.
 * Pass `scope` to limit it to one ad and the ads around it (its parent and the ads made from it).
 */
export function iterationHistory(account: MockAccount, windowDays: number, jobs: Job[], scope?: string): HistoryItem[] {
  const ads = account.creatives.map((c) => graded(c, windowDays));
  let ids: Set<string> | null = null;
  if (scope) {
    const self = ads.find((c) => c.id === scope);
    ids = new Set([scope, ...(self?.variationOf ? [self.variationOf] : []), ...ads.filter((c) => c.variationOf === scope).map((c) => c.id)]);
  }
  const inScope = (id: string) => !ids || ids.has(id);
  const mine = new Set(ads.map((c) => c.id));

  const rounds: HistoryItem[] = jobs
    .filter((j) => mine.has(j.creativeId) && inScope(j.creativeId))
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
    });
  }
  return [...rounds, ...results];
}

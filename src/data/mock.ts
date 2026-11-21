/**
 * Mock data. Moody Mochi and every other account name are fictional.
 * Keep values consistent across screens: the original product contradicts
 * itself, the prototype doesn't.
 */
export type Grade = 'A' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | null;
export type Media = 'Image' | 'Video' | 'Carousel';
export type MetricKey = 'conversion' | 'hook' | 'retention' | 'ctr';
export type TabKey = 'winners' | 'potential' | 'candidates';

/** Today in the prototype. Grades cover the 60 days up to the last sync. */
export const TODAY = 'Nov 20';
export const WINDOW = { days: 60, long: 'Last 60 days · Sep 21 to Nov 19', short: 'Last 60 days', synced: 'Nov 19, 13:43' };
/** Meta's attribution setting for the synced results (FG1 top bar). Shown in the Synced tooltip, not as its own label (Mancini 13:03). */
export const ATTRIBUTION = '7-day click, 1-day view';

export const ACCOUNT = {
  id: 'moody-mochi',
  name: 'Moody Mochi',
  monthlySpend: 96800,
  credits: 1298,
  /** Monthly allowance and the date it resets (mock). */
  creditsPlan: 2000,
  creditsReset: 'Dec 1',
  creditsPerImage: 4,
  variationsPerRecommendation: 4,
  /** RA-23: the conversion grade is set per account in Radar settings. */
  conversionMetric: 'CPA',
  avg: { cpa: 24.0, ctr: 1.42, hookRate: 24, retention: 18 },
  brand: { name: 'Moody Mochi', colors: ['#f6a5c0', '#b7d58f', '#f6e3b4', '#a9c8e8'], font: 'Fredoka' },
};

export const METRIC_META: Record<
  MetricKey,
  { label: string; plain: string; tip: string; unit: (v: number) => string; avgKey: keyof typeof ACCOUNT.avg; lowerIsBetter?: boolean; videoOnly?: boolean }
> = {
  conversion: {
    label: 'Conversion',
    plain: ACCOUNT.conversionMetric,
    tip: `How cheaply this ad turns clicks into purchases, graded on ${ACCOUNT.conversionMetric}.`,
    unit: (v) => `$${v.toFixed(2)}`,
    avgKey: 'cpa',
    lowerIsBetter: true,
  },
  hook: { label: 'Hook', plain: 'hook rate', tip: 'How many viewers keep watching past the first 3 seconds. Video ads only.', unit: (v) => `${v}%`, avgKey: 'hookRate', videoOnly: true },
  retention: {
    label: 'Retention',
    plain: 'retention',
    tip: 'How much of the video people watch before they scroll away. Video ads only.',
    unit: (v) => `${v}%`,
    avgKey: 'retention',
    videoOnly: true,
  },
  ctr: { label: 'CTR', plain: 'CTR', tip: 'How often people click the ad after seeing it.', unit: (v) => `${v.toFixed(2)}%`, avgKey: 'ctr' },
};

export interface MetaAd {
  id: string;
  campaign: string;
  adSet: string;
  spend: number;
  cpa: number;
  /** Per-copy status; falls back to the ad's status. */
  status?: 'Active' | 'Paused';
  /** Platform the copy runs on (A29); default Meta. */
  platform?: 'Meta' | 'TikTok';
  /** Campaign objective (Meta's six, 20 Nov 19:08); default Sales. */
  objective?: Objective;
}

export type Objective = 'Sales' | 'Leads' | 'Traffic' | 'Awareness' | 'Engagement' | 'App promotion';
/** Plain meaning of each goal (Mancini, 19:08: make goals obvious). `metric` is the grade the goal cares about most. */
export const GOALS: Record<Objective, { plain: string; leads: string; metric: MetricKey; primary: Recommendation['target'][]; supporting: Recommendation['target'][] }> = {
  Sales: { plain: 'get purchases', leads: 'CPA and ROAS', metric: 'conversion', primary: ['CPA', 'ROAS'], supporting: ['CTR', 'Hook'] },
  Leads: { plain: 'get sign-ups', leads: 'cost per lead', metric: 'conversion', primary: ['CPA'], supporting: ['CTR', 'Hook'] },
  Traffic: { plain: 'get site visits', leads: 'CTR', metric: 'ctr', primary: ['CTR'], supporting: ['Hook'] },
  Awareness: { plain: 'get seen by more people', leads: 'hook and retention', metric: 'hook', primary: ['Hook'], supporting: [] },
  Engagement: { plain: 'get likes, comments and views', leads: 'hook and retention', metric: 'hook', primary: ['Hook'], supporting: ['CTR'] },
  'App promotion': { plain: 'get installs', leads: 'cost per install', metric: 'conversion', primary: ['CPA'], supporting: ['CTR'] },
};
/** An ad's goal: the objective of the copies with the most spend. */
export function goalOf(c: Pick<Creative, 'ads'>): Objective {
  const by: Record<string, number> = {};
  for (const a of c.ads) by[a.objective ?? 'Sales'] = (by[a.objective ?? 'Sales'] ?? 0) + a.spend;
  return (Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0] as Objective) ?? 'Sales';
}
/** Goals across copies, when they differ ("Most spend is in Sales campaigns"). */
export const goalsOf = (c: Pick<Creative, 'ads'>) => [...new Set(c.ads.map((a) => a.objective ?? 'Sales'))] as Objective[];
/** Extra suggestion providers for accounts defined in accounts.ts. */
export const REC_PROVIDERS: Record<string, (c: Creative) => Recommendation[]> = {};

export interface Recommendation {
  id: string;
  priority: number;
  issue: string;
  issueDetail: string;
  /** Why the fix solves the issue (card order How > What > Why, Mancini 20 Nov 17:43). */
  why: string;
  fix: string;
  target: 'ROAS' | 'CPA' | 'CTR' | 'Hook';
  examples: string[];
  /** 226 (Mancini 16:00): ideas for the image itself, shown beside the copy ideas. */
  visuals?: string[];
  tried?: { date: string; count: number; jobId: string };
}

/** CSS text drawn over the photo so creatives read as ads (and text stays editable). */
export interface AdCopy {
  head: string;
  /** Big price line under the headline, so offers fill the frame. */
  price?: string;
  band?: string;
  cta?: string;
  tone?: 'light' | 'dark';
  /** Plan item 11: text drawn into the image by the model (stylized). The overlay gets the class "stylized" until a live render replaces it. */
  stylized?: boolean;
}

export interface Creative {
  id: string;
  accountId: string;
  name: string;
  /** Product the brief is remembered for (I1). */
  product: string;
  media: Media;
  /** Image slot (r01, x04…). Missing slots render a placeholder. */
  img: string;
  copy?: AdCopy;
  ads: MetaAd[];
  overall: Grade;
  grades: Record<MetricKey, Grade>;
  values: { cpa: number; ctr: number; hookRate?: number; retention?: number };
  spend: number;
  roas: number;
  /** Exactly one tab per creative (A5): the tabs describe what is true of a row. */
  tab: TabKey;
  variationOf?: string;
  placements: { label: string; share: number }[];
  /** Filters (mock). Default Active. */
  status?: 'Active' | 'Paused';
  /** Image ads projects that don't start from a Radar ad (Cloned, From scratch). Not on Radar. */
  project?: 'clone' | 'scratch';
}

/** Where an ad came from: a variation made in Atria, or uploaded to the ad account. */
export const sourceOf = (c: Creative) => (c.variationOf ? 'Created in Atria' : 'Meta');
export const statusOf = (c: Creative) => c.status ?? 'Active';

const camp = {
  prosp: 'Squishies · Broad US · Q4',
  retarget: 'Retargeting · Site visitors',
  test: 'Creative testing · October',
  gifting: 'Holiday gifting · US and CA',
  lookalike: 'Lookalike · Past buyers',
  always: 'Always on · Best sellers',
};
const feedHeavy = [
  { label: 'Feed', share: 0.7 },
  { label: 'Stories', share: 0.3 },
];
const storiesHeavy = [
  { label: 'Reels', share: 0.55 },
  { label: 'Stories', share: 0.3 },
  { label: 'Feed', share: 0.15 },
];
const reelsOnly = [
  { label: 'Reels', share: 0.8 },
  { label: 'Stories', share: 0.2 },
];
const feedOnly = [{ label: 'Feed', share: 1 }];
/** Copies of one ad: each copy in a different campaign, with uneven spend and slightly different CPA, like a real account. */
const ads = (n: number, base: number, campaign: string, adSet: string, spend: number, cpa: number): MetaAd[] => {
  const order = [campaign, ...Object.values(camp).filter((x) => x !== campaign)];
  const weights = [0.42, 0.28, 0.18, 0.12, 0.08, 0.06].slice(0, n);
  const total = weights.reduce((a, b) => a + b, 0);
  const drift = [0, 0.08, -0.06, 0.12, -0.1, 0.05];
  return Array.from({ length: n }, (_, i) => ({
    id: `1202${base + i}`,
    campaign: order[i % order.length],
    adSet: i === 0 ? adSet : ['WebVisitors_30D', 'Gifting_Interests_US', 'Variation_Test', 'Lookalike_1%', 'Broad_25-54'][(i - 1) % 5],
    spend: Math.round(((spend * weights[i]) / total) * 100) / 100,
    cpa: Math.round(cpa * (1 + drift[i]) * 100) / 100,
  }));
};

export const CREATIVES: Creative[] = [
  {
    id: 'mm-1090245',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Feeling squishy?',
    product: 'Sad Pink mochi',
    media: 'Image',
    img: 'r01',
    copy: { head: 'FEELING SQUISHY?', band: 'BUY 3, SAVE 15% · FREE STICKERS', cta: 'SHOP NOW' },
    ads: [
      { id: '120228149414612', campaign: camp.prosp, adSet: 'Broad_18-44_Advantage+', spend: 21200.1, cpa: 30.12 },
      { id: '120231602967234', campaign: camp.retarget, adSet: 'WebVisitors_30D', spend: 8943.24, cpa: 36.8 },
    ],
    overall: 'C',
    grades: { conversion: 'D', hook: null, retention: null, ctr: 'A' },
    values: { cpa: 32.06, ctr: 2.04 },
    spend: 30143.34,
    roas: 1.25,
    tab: 'potential',
    placements: feedHeavy,
  },
  {
    id: 'mm-carousel',
    accountId: 'moody-mochi',
    name: 'All moods · Collection',
    product: 'Mood collection',
    media: 'Carousel',
    img: 'r04',
    copy: { head: 'EIGHT MOODS. ONE SHELF.', cta: 'SEE ALL' },
    ads: ads(5, 28149000, camp.prosp, 'Broad_18-44_All', 38816.9, 34.75),
    overall: 'C-',
    grades: { conversion: 'D', hook: null, retention: null, ctr: 'A' },
    values: { cpa: 34.75, ctr: 1.91 },
    spend: 38816.9,
    roas: 1.08,
    tab: 'potential',
    // Many placements (Advantage+ placements), to show the list scaling.
    placements: [
      { label: 'Feed', share: 0.41 }, { label: 'Reels', share: 0.19 }, { label: 'Stories', share: 0.14 }, { label: 'Explore', share: 0.07 },
      { label: 'Marketplace', share: 0.05 }, { label: 'Video feeds', share: 0.04 }, { label: 'Search results', share: 0.03 }, { label: 'Right column', share: 0.02 },
      { label: 'Messenger inbox', share: 0.02 }, { label: 'Audience Network', share: 0.02 }, { label: 'Profile feed', share: 0.006 }, { label: 'Threads feed', share: 0.004 },
    ],
  },
  {
    id: 'mm-1086424',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Fits in your palm',
    product: 'Sad Pink mochi',
    media: 'Image',
    img: 'r02',
    copy: { head: 'FITS IN YOUR PALM', cta: 'SHOP NOW', tone: 'dark' },
    // One of six copies paused, to show the mixed state ("5 running · 1 paused").
    ads: ads(6, 29901000, camp.test, 'Static_Test', 13453.68, 26.4).map((a, i) => (i === 5 ? { ...a, status: 'Paused' as const } : a)),
    overall: 'C-',
    grades: { conversion: 'C', hook: null, retention: null, ctr: 'D' },
    values: { cpa: 26.4, ctr: 0.92 },
    spend: 13453.68,
    roas: 1.05,
    tab: 'candidates',
    placements: feedHeavy,
  },
  {
    id: 'mm-1090245-v2',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Pick your mood',
    product: 'Sad Pink mochi',
    media: 'Image',
    img: 'x04',
    copy: { head: 'PICK YOUR MOOD', band: '3 FOR $36', cta: 'GET YOURS' },
    ads: [{ id: '120234411208551', campaign: camp.test, adSet: 'Variation_Test', spend: 2140.6, cpa: 21.18 }],
    overall: 'B+',
    grades: { conversion: 'B', hook: null, retention: null, ctr: 'A' },
    values: { cpa: 21.18, ctr: 2.21 },
    spend: 2140.6,
    roas: 1.71,
    tab: 'winners',
    variationOf: 'mm-1090245',
    placements: feedHeavy,
  },
  {
    id: 'mm-1090247',
    accountId: 'moody-mochi',
    name: 'Mystery box · Stack',
    product: 'Mystery mood box',
    media: 'Image',
    img: 'r03',
    copy: { head: 'WHICH MOOD WILL YOU GET?', cta: 'OPEN ONE', tone: 'dark' },
    ads: ads(4, 28152000, camp.prosp, 'Broad_18-44_All', 9787.54, 21.8),
    overall: 'C+',
    grades: { conversion: 'B', hook: null, retention: null, ctr: 'C' },
    values: { cpa: 21.8, ctr: 1.3 },
    spend: 9787.54,
    roas: 1.31,
    tab: 'potential',
    placements: feedHeavy,
  },
  {
    id: 'mm-bau-030',
    accountId: 'moody-mochi',
    name: 'Desk buddy · Your new desk buddy',
    product: 'Desk buddy mochi',
    media: 'Image',
    img: 'r05',
    copy: { head: 'YOUR NEW DESK BUDDY', cta: 'SHOP NOW', tone: 'dark' },
    ads: ads(4, 30013000, camp.test, 'Static_Test', 7623.2, 27.1),
    overall: 'C-',
    grades: { conversion: 'C', hook: null, retention: null, ctr: 'D' },
    values: { cpa: 27.1, ctr: 0.88 },
    spend: 7623.2,
    roas: 1.12,
    tab: 'candidates',
    placements: feedHeavy,
  },
  {
    id: 'vid-unboxing',
    accountId: 'moody-mochi',
    name: 'Mystery box · Unboxing',
    product: 'Mystery mood box',
    media: 'Video',
    img: 'v01',
    ads: ads(4, 31024000, camp.prosp, 'Broad_18-44_All', 14790.35, 38.26),
    overall: 'B-',
    grades: { conversion: 'D', hook: 'A', retention: 'A', ctr: 'A' },
    values: { cpa: 38.26, ctr: 1.97, hookRate: 38, retention: 29 },
    spend: 14790.35,
    roas: 0.98,
    tab: 'potential',
    placements: storiesHeavy,
  },
  {
    id: 'vid-ugc',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Squish review',
    product: 'Sad Pink mochi',
    media: 'Video',
    img: 'v02',
    // Goal variety (19:08): the talking-head video runs for awareness, so it gets hook fixes, not CPA fixes.
    ads: ads(3, 32035000, camp.prosp, 'Broad_F_18-34', 12845.8, 29.2).map((a) => ({ ...a, objective: 'Awareness' as const })),
    overall: 'C-',
    grades: { conversion: 'D', hook: 'D', retention: 'B', ctr: 'A' },
    values: { cpa: 29.2, ctr: 1.52, hookRate: 15, retention: 21 },
    spend: 12845.8,
    roas: 1.18,
    tab: 'candidates',
    placements: storiesHeavy,
  },
  {
    id: 'mm-1090245-v3',
    accountId: 'moody-mochi',
    name: 'Sad Pink · 3 for $36',
    product: 'Sad Pink mochi',
    media: 'Image',
    img: 'x05c',
    copy: { head: '3 FOR', price: '$36', cta: 'PICK 3' },
    ads: [{ id: '120234411208577', campaign: camp.gifting, adSet: 'Gifting_Interests_US', spend: 3410.25, cpa: 19.4 }],
    overall: 'A',
    grades: { conversion: 'A', hook: null, retention: null, ctr: 'B' },
    values: { cpa: 19.4, ctr: 1.74 },
    spend: 3410.25,
    roas: 1.92,
    tab: 'winners',
    variationOf: 'mm-1090245',
    placements: feedOnly,
  },
  {
    id: 'mm-1090245-v4',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Back in shape',
    product: 'Sad Pink mochi',
    media: 'Image',
    img: 'x03c',
    copy: { head: 'BACK IN SHAPE IN 8 SECONDS', cta: 'TRY IT', tone: 'dark' },
    ads: [{ id: '120234411208590', campaign: camp.test, adSet: 'Variation_Test', spend: 1265.4, cpa: 33.1 }],
    overall: 'C+',
    grades: { conversion: 'C', hook: null, retention: null, ctr: 'A' },
    values: { cpa: 33.1, ctr: 2.05 },
    spend: 1265.4,
    roas: 1.09,
    tab: 'potential',
    variationOf: 'mm-1090245',
    placements: storiesHeavy,
  },
  {
    id: 'mm-1088102',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Squish me',
    product: 'Sad Pink mochi',
    media: 'Image',
    img: 'x01',
    copy: { head: 'SQUISH ME', cta: 'SHOP NOW' },
    ads: ads(2, 27710000, camp.retarget, 'WebVisitors_30D', 6120.8, 22.6),
    overall: 'B',
    grades: { conversion: 'B', hook: null, retention: null, ctr: 'C' },
    values: { cpa: 22.6, ctr: 1.18 },
    spend: 6120.8,
    roas: 1.44,
    tab: 'potential',
    // 231 (Mancini 16:07): more ads with history. Made from "Fits in your palm".
    variationOf: 'mm-1086424',
    placements: reelsOnly,
    status: 'Paused',
  },
  {
    id: 'mm-1087530',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Not your usual',
    product: 'Mood collection',
    media: 'Image',
    img: 'x02',
    copy: { head: 'NOT YOUR USUAL SQUISHY', cta: 'SHOP NOW', tone: 'dark' },
    ads: ads(3, 27530000, camp.test, 'Static_Test', 5480.1, 39.4),
    overall: 'D+',
    grades: { conversion: 'D', hook: null, retention: null, ctr: 'C' },
    values: { cpa: 39.4, ctr: 1.04 },
    spend: 5480.1,
    roas: 0.84,
    tab: 'candidates',
    placements: feedOnly,
    status: 'Paused',
  },
  {
    id: 'vid-asmr',
    accountId: 'moody-mochi',
    name: 'Sad Pink · Slow-rise ASMR',
    product: 'Sad Pink mochi',
    media: 'Video',
    img: 'v02',
    // One copy on TikTok, so the Platform filter and field have something to show (A29).
    ads: ads(2, 33120000, camp.prosp, 'Broad_F_18-34', 8890.0, 24.1).map((a, i) => (i === 1 ? { ...a, platform: 'TikTok' as const, campaign: 'TikTok · Squishies · Q4', adSet: 'Interest_Squishy-Toys', objective: 'Awareness' as const } : a)),
    overall: 'A',
    grades: { conversion: 'B', hook: 'A', retention: 'A', ctr: 'B' },
    values: { cpa: 24.1, ctr: 1.62, hookRate: 41, retention: 33 },
    spend: 8890.0,
    roas: 1.58,
    tab: 'winners',
    // 231: made from "Squish review", opening on the squish instead of a talking head.
    variationOf: 'vid-ugc',
    placements: reelsOnly,
  },
];

/** Plain-style recommendations (decided 20 Nov). In production these are model output, so the real fix is a style rule in the prompt. */
const HERO_RECS: Recommendation[] = [
  {
    id: 'different',
    priority: 1,
    issue: "Customers don't have a clear reason to buy",
    issueDetail: "Your ad shows a cute mochi but doesn't say what makes it better than other squishies.",
    why: `Your ad shows a cute mochi, but doesn't tell customers why they should buy it. Give them a clear reason to choose your product over other squishies.`,
    fix: 'Say what makes it different',
    target: 'CPA',
    examples: ['"Slow-rise squish. Back in shape in 8 seconds."', '"Every face is hand-painted, so no two match."'],
    visuals: ['A hand squeezing one mochi mid-squish', 'Close-up on the hand-painted face'],
  },
  {
    id: 'offer',
    priority: 2,
    issue: "Customers are clicking your ad but aren't buying",
    issueDetail: 'Customers click (CTR A) but few buy (CPA D). There is no price, and two offers compete for attention.',
    why: `There's no price, and two offers compete for attention. Show one clear price so buying is an easy yes after the click.`,
    fix: 'Make one clear offer',
    target: 'CPA',
    // 253: copy ideas are only the words to use; directions are plain sentences with no quotes.
    examples: ['"$14 each, 3 for $36"'],
    visuals: ['Keep the bundle deal and drop the free stickers', 'Three mochi side by side with the price on a sticker'],
  },
  {
    id: 'cta',
    priority: 3,
    issue: "The button doesn't say what customers get",
    issueDetail: 'CTR is already strong, so this matters less than what happens after the click.',
    why: `"Shop now" could be any brand. Tell customers what they get when they tap. Your CTR is already strong, so try this last.`,
    fix: 'Use a more specific call to action',
    target: 'CTR',
    examples: ['"Pick your mood"', '"Get the Sad Pink one"'],
    visuals: ['A button in the same pink as the mochi'],
    tried: { date: 'Nov 12', count: 8, jobId: 'job-hero-1' },
  },
];

const CTR_RECS: Recommendation[] = [
  {
    id: 'stop',
    priority: 1,
    issue: 'Customers scroll past your ad',
    issueDetail: 'CTR is the lowest grade on this ad. The product sits small in a busy scene.',
    why: `Your product sits small in a busy scene. Let it fill the frame so customers stop scrolling.`,
    fix: 'Make the product the first thing you see',
    target: 'CTR',
    examples: ['"Meet Sad Pink"'],
    visuals: ['Crop in so the mochi fills half the frame', 'Use one bold background color'],
  },
  {
    id: 'offer',
    priority: 2,
    issue: "Customers are clicking your ad but aren't buying",
    issueDetail: 'There is no price on the ad, so customers who click are still deciding.',
    why: `There's no price on your ad, so customers who click are still deciding. Show it up front to bring in people who are ready to buy.`,
    fix: 'Make one clear offer',
    target: 'CPA',
    examples: ['"$14 each, 3 for $36"'],
    visuals: ['A price sticker on the mochi'],
  },
];

const VIDEO_RECS: Recommendation[] = [
  {
    id: 'hook',
    priority: 1,
    issue: 'Customers leave in the first 3 seconds',
    issueDetail: 'Hook is the lowest grade on this ad. The video opens on a talking head before the product appears.',
    why: `Your video opens on a talking head. Lead with the squish so customers see the product before they scroll away.`,
    fix: 'Show the squish in the first second',
    target: 'Hook',
    examples: ['"Watch it bounce back"'],
    visuals: ['Open on a close-up squeeze', 'Put the price on screen by second 3'],
  },
  {
    id: 'offer',
    priority: 2,
    issue: "Customers watch but aren't buying",
    issueDetail: 'Customers watch and click, but the offer only appears in the caption.',
    why: `Your offer is only in the caption, which most customers don't read. Put it on screen so everyone who watches sees it.`,
    fix: 'Make one clear offer',
    target: 'CPA',
    examples: ['"3 for $36"'],
    visuals: ['End on all three mochi with the price on the end card'],
  },
];

/** Suggestions follow the ad's goal (19:08): goal metrics first, then supporting ones, weakest grade first in each;
 *  suggestions for metrics the goal doesn't care about are dropped (an Awareness ad gets no CPA fix). */
export function recommendationsFor(c: Creative): Recommendation[] {
  const goal = GOALS[goalOf(c)];
  const key: Record<string, MetricKey | undefined> = { CPA: 'conversion', CTR: 'ctr', Hook: 'hook' };
  const tier = (r: Recommendation) => (goal.primary.includes(r.target) ? 0 : goal.supporting.includes(r.target) ? 1 : 2);
  const rank = (r: Recommendation) => {
    const g = key[r.target] ? c.grades[key[r.target]!] : null;
    return g ? 'ABCD'.indexOf(g[0]) : 1.5;
  };
  return recsFor(c)
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => tier(r) < 2)
    .sort((a, b) => tier(a.r) - tier(b.r) || rank(b.r) - rank(a.r) || a.i - b.i)
    .map(({ r }, i) => ({ ...r, issue: glue(r.issue), fix: glue(r.fix), why: glue(r.why), issueDetail: glue(r.issueDetail), priority: i + 1 }));
}

/** 5c line breaks: joins the last two words so short labels never end on a one-word line. */
export const glue = (s: string) => s.replace(/ (\S+)$/, '\u00a0$1');

function recsFor(c: Creative): Recommendation[] {
  if (REC_PROVIDERS[c.accountId]) return REC_PROVIDERS[c.accountId](c);
  if (c.id === 'mm-1090245') return HERO_RECS;
  // Mancini 15:48: "Back in shape in 8 seconds" already states a benefit, so "say what makes it different" made no sense here.
  // This step's real gap is the price it dropped (see its lineage note), so that is its top suggestion.
  if (c.id === 'mm-1090245-v4')
    return HERO_RECS.filter((r) => r.id !== 'cta' && r.id !== 'different').map((r, i) => ({
      ...r,
      priority: i + 1,
      tried: undefined,
      ...(r.id === 'offer'
        ? {
            issue: "Customers don't see the price",
            issueDetail: 'The headline says what the mochi does, but the ad no longer shows what it costs.',
            why: 'The headline gives a reason to buy, but there is no price. The ad before this one led with "3 for $36" and cost less per purchase. Put the price back next to the benefit.',
            fix: 'Bring the price back',
            examples: ['"Back in shape in 8 seconds. 3 for $36."', '"$14 each"'],
            visuals: ['A price sticker beside the squeezing hand'],
          }
        : {}),
    }));
  // 222: "Sad Pink · 3 for $36" already leads with one price, so "two offers" and "no price" don't apply. Its gap is a
  // reason to buy next to the price (the next step swapped the price out for a benefit, and CPA got worse).
  if (c.id === 'mm-1090245-v3')
    return HERO_RECS.filter((r) => r.id === 'different').map((r) => ({
      ...r,
      priority: 1,
      tried: undefined,
      issue: 'Customers only see a price',
      issueDetail: 'The headline is the price. Nothing says why this mochi is worth it over a cheaper squishy.',
      why: 'The price brings in buyers, but the ad gives no reason to pick this mochi. Add one benefit next to the price, and keep the price. The ad made from this one dropped the price for a benefit and cost more per purchase.',
      fix: 'Add a reason to buy next to the price',
      examples: ['"3 for $36. Back in shape in 8 seconds."', '"3 for $36. Every face is hand-painted."'],
      visuals: ['Show the slow rise next to the price', 'Close-up on the hand-painted face'],
    }));
  // 222: "Sad Pink · Pick your mood" has one offer and a price ("3 for $36" in a band), so the two-offer suggestion was wrong.
  // Its real gap is that the price sits small under the headline.
  if (c.variationOf === 'mm-1090245')
    return HERO_RECS.filter((r) => r.id !== 'cta').map((r, i) => ({
      ...r,
      priority: i + 1,
      tried: undefined,
      ...(r.id === 'offer'
        ? {
            issue: 'Customers can miss the price',
            issueDetail: 'CPA improved to B with one offer, but "3 for $36" sits in a small band under the headline.',
            why: 'The ad has one clear offer now, but the price is the smallest text on it. Make it big enough to read at a glance so people who click are ready to buy.',
            fix: 'Make the price easier to see',
            examples: [],
            visuals: ['Make the price the headline', 'Put the price on its own line, larger than the band', 'Crop the mood grid to make room for the price'],
          }
        : {}),
    }));
  if (c.media === 'Video') {
    // Only suggest a hook fix when the hook is actually weak (C or D).
    const weakHook = /^[CD]/.test(c.grades.hook ?? '');
    return weakHook ? VIDEO_RECS : VIDEO_RECS.filter((r) => r.id !== 'hook').map((r, i) => ({ ...r, priority: i + 1 }));
  }
  if (c.grades.ctr?.[0] === 'D') return CTR_RECS;
  // 223: the hero's offer card names its two offers, so other image ads get the plain "no price" version.
  // 223: other image ads get the reason-to-buy card, plus the call-to-action card only when the button says "Shop now".
  // ("Clicking but not buying" was wrong for ads like "Squish me", whose CPA is B and CTR is C.)
  const cta = HERO_RECS[2];
  return c.copy?.cta === 'SHOP NOW'
    ? [HERO_RECS[0], { ...cta, priority: 2, tried: undefined, issueDetail: '"Shop now" could be any brand.', why: '"Shop now" could be any brand. Tell customers what they get when they tap.' }]
    : [HERO_RECS[0]];
}

export const PERSONAS = [
  { label: 'Gift shoppers', why: 'Likely to respond to gift and collectible messages.', icon: 'gift', tint: '#fde4ec' },
  { label: 'Stress-relief seekers', why: 'Likely to respond to calm and comfort messages.', icon: 'calm', tint: '#e6f2dc' },
];

export const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Radar works best above this monthly spend (Atria's own guidance). */
export const RELIABLE_SPEND = 10000;

/** Small account for the low-spend Alert demo. */
export const SMALL_ACCOUNT = {
  id: 'tiny-toast',
  name: 'Tiny Toast Co.',
  monthlySpend: 6200,
  brand: null as null | typeof ACCOUNT.brand,
};

export const SMALL_CREATIVES: Creative[] = [
  {
    id: 'tt-toaster-static',
    accountId: 'tiny-toast',
    name: 'Mini toaster · Morning ritual',
    product: 'Mini toaster',
    media: 'Image',
    img: 't01',
    copy: { head: 'TOAST FOR ONE', cta: 'SHOP NOW', tone: 'dark' },
    ads: [{ id: '120240118830021', campaign: 'Mini toaster · Broad US · Q4', adSet: 'Broad_25-54', spend: 3120.4, cpa: 31.2 }],
    overall: 'C',
    grades: { conversion: 'C', hook: null, retention: null, ctr: 'D' },
    values: { cpa: 31.2, ctr: 0.71 },
    spend: 3120.4,
    roas: 1.4,
    tab: 'candidates',
    placements: feedHeavy,
  },
  {
    id: 'tt-ugc-video',
    accountId: 'tiny-toast',
    name: 'Mini toaster · Breakfast review',
    product: 'Mini toaster',
    media: 'Video',
    img: 't02',
    ads: [{ id: '120240118830044', campaign: 'Mini toaster · Broad US · Q4', adSet: 'Broad_25-54', spend: 2410.0, cpa: 26.8 }],
    overall: 'B-',
    grades: { conversion: 'B', hook: 'B', retention: 'C', ctr: 'B' },
    values: { cpa: 26.8, ctr: 1.21, hookRate: 27, retention: 16 },
    spend: 2410,
    roas: 1.9,
    tab: 'potential',
    placements: storiesHeavy,
  },
  {
    id: 'tt-bundle-static',
    accountId: 'tiny-toast',
    name: 'Breakfast bundle · Save 20%',
    product: 'Toast bundle',
    media: 'Image',
    img: 't03',
    copy: { head: 'SAVE 20% ON THE SET', cta: 'SHOP NOW', tone: 'dark' },
    ads: [{ id: '120240118830067', campaign: 'Retargeting · Site visitors', adSet: 'WebVisitors_30D', spend: 1650.2, cpa: 41.9 }],
    overall: 'D+',
    grades: { conversion: 'D', hook: null, retention: null, ctr: 'C' },
    values: { cpa: 41.9, ctr: 0.96 },
    spend: 1650.2,
    roas: 0.9,
    tab: 'candidates',
    placements: feedHeavy,
  },
];

/** RA-15. One line per tab, saying what is true of the rows. */
// Mancini 14:23: full group names. Phones use the short form so all four tabs fit at 390 px.
export const TABS: { key: TabKey; label: string; short: string; desc: string }[] = [
  { key: 'winners', label: 'Best-performing', short: 'Best', desc: 'Your strongest ads. Build more of these.' },
  { key: 'potential', label: 'To improve', short: 'Improve', desc: 'These ads do well in a few places, but could be better optimized.' },
  { key: 'candidates', label: 'Needs rework', short: 'Rework', desc: 'These ads perform poorly on most metrics. Try new variations or a different approach.' },
];

/** Sidebar accounts (all fictional). Only the first two are clickable demo accounts. */
export const SIDEBAR_ACCOUNTS = ['Moody Mochi', 'Tiny Toast Co.', 'Pebble & Pine', 'Hollow Oak Candles', 'Kumo Socks', 'Lumen Tea House', 'Fernwick Pet Co.', 'Saltglass Swim'];

/** Size options (DL-15). 2:3 → Feed is an assumption (A20). */
export const SIZES = [
  { value: '2:3', label: '2:3 · 1080×1620 · Feed', placement: 'Feed' },
  { value: '9:16', label: '9:16 · 1080×1920 · Stories and Reels', placement: 'Stories' },
  { value: '1:1', label: '1:1 · 1080×1080 · Feed', placement: 'Feed square' },
];


/** Status of one running copy (copy-level wins, else the ad's). */
export const copyStatus = (c: Creative, a: MetaAd) => a.status ?? c.status ?? 'Active';

/** Panel title (Mancini, 18:55): "4 copies of this ad running", "4 copies of this ad, 3 running", "2 copies of this ad, all paused". */
export function copiesTitle(c: Creative) {
  const paused = c.ads.filter((a) => copyStatus(c, a) === 'Paused').length;
  const n = c.ads.length;
  const running = n - paused;
  const base = `${plural(n, 'copy', 'copies')} of this ad`;
  if (!paused) return `${base} running`;
  if (!running) return n === 1 ? `${base}, paused` : `${base}, all paused`;
  return `${base}, ${running} running`;
}

/** Row sub-line: "2 copies running", "2 copies paused" or "5 running · 1 paused". */
export function copiesLabel(c: Creative) {
  const paused = c.ads.filter((a) => copyStatus(c, a) === 'Paused').length;
  const running = c.ads.length - paused;
  if (!paused) return `${plural(running, 'copy', 'copies')} running`;
  if (!running) return `${plural(paused, 'copy', 'copies')} paused`;
  return `${running} running · ${paused}\u00a0paused`; // 5d Gm-08: "1 paused" never splits
}

const hash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Mock per-copy facts for the "Where it runs" panel: start date, days live, frequency. */
export function copyFacts(a: MetaAd) {
  const h = Math.abs(hash(a.id));
  const days = 6 + (h % 70);
  const d = new Date(2026, 10, 20 - days);
  return { days, since: `${MONTHS[d.getMonth()]} ${d.getDate()}`, frequency: (1.3 + ((h >>> 3) % 22) / 10).toFixed(1) };
}

/** Grade windows (deck A7). Changing the window re-grades every ad; a few mock ads change. */
export const WINDOWS = [
  { days: 30, long: 'Last 30 days · Oct 21 to Nov 19', short: 'Last 30 days' },
  { days: 60, long: 'Last 60 days · Sep 21 to Nov 19', short: 'Last 60 days' },
  { days: 90, long: 'Last 90 days · Aug 22 to Nov 19', short: 'Last 90 days' },
];
type Regrade = Partial<Pick<Creative, 'overall' | 'tab'>> & { grades?: Partial<Creative['grades']> };
const REGRADE: Record<number, Record<string, Regrade>> = {
  30: {
    // Newer variations look better on recent data; an older static slips.
    'mm-1090245-v4': { overall: 'B', tab: 'winners', grades: { conversion: 'B' } },
    'mm-1088102': { overall: 'C', tab: 'candidates', grades: { ctr: 'D' } },
  },
  90: {
    'mm-1090245-v3': { overall: 'B+', grades: { ctr: 'B' } },
    'mm-1086424': { overall: 'C', tab: 'potential', grades: { conversion: 'B' } },
  },
};
export function graded(c: Creative, days: number): Creative {
  const r = REGRADE[days]?.[c.id];
  return r ? { ...c, ...r, grades: { ...c.grades, ...r.grades } } : c;
}

export const platformOf = (a: MetaAd) => a.platform ?? 'Meta';

/** Cloned and from-scratch projects (P1: they keep today's logic). Reachable from Image ads only. */
export const PROJECT_CREATIVES: Creative[] = [
  { id: 'clone-1', accountId: 'moody-mochi', name: 'Clone · Pastel plush flat lay', product: 'Mood collection', media: 'Image', img: 'x10', copy: { head: 'SOFT THINGS ONLY', cta: 'SHOP NOW', tone: 'dark' }, ads: [], overall: null, grades: { conversion: null, hook: null, retention: null, ctr: null }, values: { cpa: 0, ctr: 0 }, spend: 0, roas: 0, tab: 'potential', placements: [], project: 'clone' },
  { id: 'scratch-1', accountId: 'moody-mochi', name: 'Holiday gift guide', product: 'Mood collection', media: 'Image', img: 'x12', copy: { head: 'THE MOOD GIFT GUIDE', cta: 'SHOP GIFTS', tone: 'dark' }, ads: [], overall: null, grades: { conversion: null, hook: null, retention: null, ctr: null }, values: { cpa: 0, ctr: 0 }, spend: 0, roas: 0, tab: 'potential', placements: [], project: 'scratch' },
];

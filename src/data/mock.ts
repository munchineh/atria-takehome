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
export const TODAY = '20 Nov';
export const WINDOW = { days: 60, long: 'Last 60 days · 21 Sep to 19 Nov', short: 'Last 60 days', synced: '19 Nov, 13:43' };

export const ACCOUNT = {
  id: 'moody-mochi',
  name: 'Moody Mochi',
  monthlySpend: 96800,
  credits: 1298,
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
    tip: `Graded on ${ACCOUNT.conversionMetric}. Change the metric in Radar settings`,
    unit: (v) => `$${v.toFixed(2)}`,
    avgKey: 'cpa',
    lowerIsBetter: true,
  },
  hook: { label: 'Hook', plain: 'hook rate', tip: 'Share of viewers who watch past the first 3 seconds. Video only', unit: (v) => `${v}%`, avgKey: 'hookRate', videoOnly: true },
  retention: {
    label: 'Retention',
    plain: 'retention',
    tip: 'How much of the video people watch, measured at 25%, 50%, 75% and 100%. Video only',
    unit: (v) => `${v}%`,
    avgKey: 'retention',
    videoOnly: true,
  },
  ctr: { label: 'CTR', plain: 'CTR', tip: 'Clicks divided by impressions', unit: (v) => `${v.toFixed(2)}%`, avgKey: 'ctr' },
};

export interface MetaAd {
  id: string;
  campaign: string;
  adSet: string;
  spend: number;
  cpa: number;
}

export interface Recommendation {
  id: string;
  priority: number;
  issue: string;
  issueDetail: string;
  fix: string;
  target: 'ROAS' | 'CPA' | 'CTR' | 'Hook';
  examples: string[];
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
}

const camp = {
  prosp: 'MM_Prospecting_Broad_US_Advantage+_Squishies_Q4-2026_CBO_7DC',
  retarget: 'MM_Retargeting_Website-Visitors-30D_US_Squishies_Q4-2026_ABO',
  test: 'MM_Creative-Testing_Static_US_Multi-Mood_Oct-2026',
  gifting: 'MM_Prospecting_Gifting_US-CA_Holiday-2026_Advantage+_CBO',
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
const ads = (n: number, base: number, campaign: string, adSet: string, spend: number, cpa: number): MetaAd[] =>
  Array.from({ length: n }, (_, i) => ({ id: `1202${base + i}`, campaign: i === 1 && n > 2 ? camp.gifting : campaign, adSet, spend: spend / n, cpa }));

export const CREATIVES: Creative[] = [
  {
    id: 'mm-1090245',
    accountId: 'moody-mochi',
    name: 'MM-1090245_Static_ar1:1_Hero_Sad-Pink_Squish-Deal',
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
    name: 'MM_Carousel_All-Moods_Collection_8-Cards',
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
    placements: feedHeavy,
  },
  {
    id: 'mm-1086424',
    accountId: 'moody-mochi',
    name: 'MM-1086424_Static_ar1:1_In-Hand_Lifestyle',
    product: 'Sad Pink mochi',
    media: 'Image',
    img: 'r02',
    copy: { head: 'FITS IN YOUR PALM', cta: 'SHOP NOW', tone: 'dark' },
    ads: ads(6, 29901000, camp.test, 'Static_Test', 13453.68, 26.4),
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
    name: 'MM-1090245_v2_Specific-CTA_Pick-Your-Mood',
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
    name: 'MM-1090247_Static_ar4:5_Mystery-Box-Stack',
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
    name: 'mm_bau_none_Batch030B_Desk-Buddy_Static',
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
    name: 'vid_creator_unboxing_Mystery-Box_Hook-v3',
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
    name: '261012.2 - UGC talking head - Squish Review_Video',
    product: 'Sad Pink mochi',
    media: 'Video',
    img: 'v02',
    ads: ads(3, 32035000, camp.prosp, 'Broad_F_18-34', 12845.8, 29.2),
    overall: 'C-',
    grades: { conversion: 'D', hook: 'D', retention: 'B', ctr: 'A' },
    values: { cpa: 29.2, ctr: 1.52, hookRate: 15, retention: 21 },
    spend: 12845.8,
    roas: 1.18,
    tab: 'candidates',
    placements: storiesHeavy,
  },
];

/** Plain-style recommendations (decided 20 Nov). In production these are model output, so the real fix is a style rule in the prompt. */
const HERO_RECS: Recommendation[] = [
  {
    id: 'different',
    priority: 1,
    issue: 'No reason to choose this one',
    issueDetail: 'The ad shows a cute mochi but never says what makes it better than other squishies.',
    fix: 'Say what makes it different',
    target: 'ROAS',
    examples: ['"Slow-rise squish. Back in shape in 8 seconds."', '"Every face is hand-painted, so no two match."'],
  },
  {
    id: 'offer',
    priority: 2,
    issue: "Clicks don't turn into purchases",
    issueDetail: 'People click (CTR A) but few buy (CPA D). There is no price, and two offers compete for attention.',
    fix: 'Make one clear offer',
    target: 'CPA',
    examples: ['Show the price: "$14 each, 3 for $36"', 'Keep one offer: drop "Free stickers" or "Buy 3, save 15%"'],
  },
  {
    id: 'cta',
    priority: 3,
    issue: 'The button says nothing specific',
    issueDetail: 'CTR is already strong, so this matters less than what happens after the click.',
    fix: 'Use a more specific call to action',
    target: 'CTR',
    examples: ['"Pick your mood"', '"Get the Sad Pink one"'],
    tried: { date: '12 Nov', count: 8, jobId: 'job-hero-1' },
  },
];

const CTR_RECS: Recommendation[] = [
  {
    id: 'stop',
    priority: 1,
    issue: 'Nothing stops the scroll',
    issueDetail: 'CTR is in the bottom 25% of this account. The product sits small in a busy scene.',
    fix: 'Make the product the first thing you see',
    target: 'CTR',
    examples: ['Crop in so the mochi fills half the frame', 'Use one bold background color'],
  },
  {
    id: 'offer',
    priority: 2,
    issue: "Clicks don't turn into purchases",
    issueDetail: 'There is no price on the ad, so people who click are still deciding.',
    fix: 'Make one clear offer',
    target: 'CPA',
    examples: ['"$14 each, 3 for $36"'],
  },
];

const VIDEO_RECS: Recommendation[] = [
  {
    id: 'hook',
    priority: 1,
    issue: 'The first 3 seconds lose people',
    issueDetail: 'Hook is in the bottom 25%. The video opens on a talking head before the product appears.',
    fix: 'Show the squish in the first second',
    target: 'Hook',
    examples: ['Open on a close-up squeeze', 'Put the price on screen by second 3'],
  },
  {
    id: 'offer',
    priority: 2,
    issue: "Clicks don't turn into purchases",
    issueDetail: 'People watch and click, but the offer only appears in the caption.',
    fix: 'Make one clear offer',
    target: 'CPA',
    examples: ['End card: "3 for $36"'],
  },
];

export function recommendationsFor(c: Creative): Recommendation[] {
  if (c.id === 'mm-1090245') return HERO_RECS;
  if (c.variationOf === 'mm-1090245')
    return HERO_RECS.filter((r) => r.id !== 'cta').map((r, i) => ({
      ...r,
      priority: i + 1,
      tried: undefined,
      ...(r.id === 'offer' ? { issueDetail: 'CPA improved to B, but the ad still carries two offers. One clear offer should close the gap.' } : {}),
    }));
  if (c.media === 'Video') return VIDEO_RECS;
  if (c.grades.ctr?.[0] === 'D') return CTR_RECS;
  return HERO_RECS.slice(0, 2);
}

export const PERSONAS = [
  { label: 'Gift shoppers', why: 'Likely to respond to gift and collectible messages' },
  { label: 'Stress-relief seekers', why: 'Likely to respond to calm and comfort messages' },
];

/** Bands for R6 (quartiles assumed, A4). */
export function gradeBand(g: Grade) {
  if (!g) return null;
  return ({ A: 'Top 25%', B: 'Upper middle 25%', C: 'Lower middle 25%', D: 'Bottom 25%' } as Record<string, string>)[g[0]];
}

export const short = (name: string, n = 22) => (name.length > n ? `${name.slice(0, n)}…` : name);
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
    name: 'TTC_Mini-Toaster_Static_ar4:5_Morning-Ritual',
    product: 'Mini toaster',
    media: 'Image',
    img: 't01',
    copy: { head: 'TOAST FOR ONE', cta: 'SHOP NOW', tone: 'dark' },
    ads: [{ id: '120240118830021', campaign: 'TTC_Prospecting_Broad_US_Mini-Toaster_Q4-2026', adSet: 'Broad_25-54', spend: 3120.4, cpa: 31.2 }],
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
    name: 'TTC_UGC_Video_Breakfast-Review_v2',
    product: 'Mini toaster',
    media: 'Video',
    img: 't02',
    ads: [{ id: '120240118830044', campaign: 'TTC_Prospecting_Broad_US_Mini-Toaster_Q4-2026', adSet: 'Broad_25-54', spend: 2410.0, cpa: 26.8 }],
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
    name: 'TTC_Bundle_Static_ar1:1_Save-20',
    product: 'Toast bundle',
    media: 'Image',
    img: 't03',
    copy: { head: 'SAVE 20% ON THE SET', cta: 'SHOP NOW', tone: 'dark' },
    ads: [{ id: '120240118830067', campaign: 'TTC_Retargeting_Website-Visitors-30D_US', adSet: 'WebVisitors_30D', spend: 1650.2, cpa: 41.9 }],
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
export const TABS: { key: TabKey; label: string; desc: string }[] = [
  { key: 'winners', label: 'Best', desc: 'Strong on every graded metric. Scale these.' },
  { key: 'potential', label: 'Improve', desc: 'Strong on one metric, weak on another. Fix the weak one.' },
  { key: 'candidates', label: 'Rework', desc: 'Low grades on most metrics, with enough spend to be worth a new version.' },
];

/** Sidebar accounts (all fictional). Only the first two are clickable demo accounts. */
export const SIDEBAR_ACCOUNTS = ['Moody Mochi', 'Tiny Toast Co.', 'Pebble & Pine', 'Hollow Oak Candles', 'Kumo Socks', 'Lumen Tea House', 'Fernwick Pet Co.', 'Saltglass Swim'];

/** Size options (DL-15). 2:3 → Feed is an assumption (A20). */
export const SIZES = [
  { value: '2:3', label: '2:3 · 1080×1620 · Feed', placement: 'Feed' },
  { value: '9:16', label: '9:16 · 1080×1920 · Stories and Reels', placement: 'Stories' },
  { value: '1:1', label: '1:1 · 1080×1080 · Feed', placement: 'Feed square' },
];

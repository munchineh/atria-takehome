export type Grade = 'A' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | null;
export type Media = 'Image' | 'Video' | 'Carousel';
export type MetricKey = 'conversion' | 'hook' | 'retention' | 'ctr';

export const ACCOUNT = {
  id: 'ancestral',
  name: 'Ancestral Supplements Ads',
  monthlySpend: 96800,
  windowDays: 60,
  windowLabel: 'Last 60 days (22 Aug – 21 Oct)',
  credits: 1298,
  creditsPerImage: 4,
  variationsPerRecommendation: 4,
  avg: { cpa: 59.0, ctr: 1.42, hookRate: 24, retention: 18 },
};

export const METRIC_META: Record<MetricKey, { label: string; plain: string; unit: (v: number) => string; avgKey: keyof typeof ACCOUNT.avg; lowerIsBetter?: boolean }> = {
  conversion: { label: 'Conversion', plain: 'CPA', unit: (v) => `$${v.toFixed(2)}`, avgKey: 'cpa', lowerIsBetter: true },
  hook: { label: 'Hook', plain: 'hook rate', unit: (v) => `${v}%`, avgKey: 'hookRate' },
  retention: { label: 'Retention', plain: 'video retention', unit: (v) => `${v}%`, avgKey: 'retention' },
  ctr: { label: 'CTR', plain: 'CTR', unit: (v) => `${v.toFixed(2)}%`, avgKey: 'ctr' },
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
  target: 'ROAS' | 'CPA' | 'CTR';
  examples: string[];
  tried?: { date: string; count: number };
}

export type RowStatus =
  | { kind: 'idle' }
  | { kind: 'generating'; count: number; progress: number; recIds?: string[] }
  | { kind: 'ready'; count: number; unseen: boolean; recIds?: string[] };

export interface Creative {
  id: string;
  name: string;
  media: Media;
  thumb: 'deal' | 'bottle' | 'liver' | 'tiktok' | 'fem' | 'variation';
  ads: MetaAd[];
  overall: Grade;
  grades: Record<MetricKey, Grade>;
  values: { cpa: number; ctr: number; hookRate?: number; retention?: number };
  spend: number;
  roas: number;
  tab: ('winners' | 'potential' | 'candidates')[];
  variationOf?: string;
  status: RowStatus;
}

const camp = {
  prosp: 'AS_Prospecting_Broad_US_Advantage+_Liver_Q3-2025_CBO_7DC',
  retarget: 'AS_Retargeting_Website-Visitors-30D_US_Liver_Q3-2025_ABO',
  test: 'AS_Creative-Testing_Static_US_Multi-Product_Sep-2025',
};

export const CREATIVES: Creative[] = [
  {
    id: 'catalog',
    name: 'Catalog - All Products',
    media: 'Carousel',
    thumb: 'bottle',
    ads: Array.from({ length: 5 }, (_, i) => ({ id: `12022814${9000 + i}`, campaign: camp.prosp, adSet: 'Broad_25-65_All', spend: 15563.38, cpa: 74.75 })),
    overall: 'C-',
    grades: { conversion: 'D', hook: null, retention: null, ctr: 'A' },
    values: { cpa: 74.75, ctr: 1.91 },
    spend: 77816.9,
    roas: 1.08,
    tab: ['potential'],
    status: { kind: 'idle' },
  },
  {
    id: 'id-1090245',
    name: 'ID-1090245_pWWHZ_ppFB_ar9:16_pt1393_hl1475_Liver',
    media: 'Image',
    thumb: 'deal',
    ads: [
      { id: '120228149414612', campaign: camp.prosp, adSet: 'Broad_25-65_Advantage+', spend: 41200.1, cpa: 64.38 },
      { id: '120231602967234', campaign: camp.retarget, adSet: 'WebVisitors_30D', spend: 16943.24, cpa: 74.52 },
    ],
    overall: 'C',
    grades: { conversion: 'D', hook: null, retention: null, ctr: 'A' },
    values: { cpa: 67.06, ctr: 2.04 },
    spend: 58143.34,
    roas: 1.25,
    tab: ['potential', 'candidates'],
    status: { kind: 'idle' },
  },
  {
    id: 'id-1086424',
    name: 'ID-1086424_pNA_tStatic_ar1:1_Bundle',
    media: 'Image',
    thumb: 'liver',
    ads: Array.from({ length: 6 }, (_, i) => ({ id: `12022990${1000 + i}`, campaign: camp.test, adSet: 'Static_Test', spend: 3908.95, cpa: 60.4 })),
    overall: 'C',
    grades: { conversion: 'C', hook: null, retention: null, ctr: 'D' },
    values: { cpa: 60.4, ctr: 0.92 },
    spend: 23453.68,
    roas: 1.05,
    tab: ['potential'],
    status: { kind: 'generating', count: 8, progress: 0.45 },
  },
  {
    id: 'id-1090245-v2',
    name: 'ID-1090245_v2_Stronger-CTA_Liver',
    media: 'Image',
    thumb: 'variation',
    ads: [{ id: '120234411208551', campaign: camp.test, adSet: 'Variation_Test', spend: 2140.6, cpa: 52.18 }],
    overall: 'B-',
    grades: { conversion: 'B', hook: null, retention: null, ctr: 'A' },
    values: { cpa: 52.18, ctr: 2.21 },
    spend: 2140.6,
    roas: 1.71,
    tab: ['candidates'],
    variationOf: 'id-1090245',
    status: { kind: 'idle' },
  },
  {
    id: 'id-1090247',
    name: 'ID-1090247_pWWHZ_ppFB_ar4:5_Organ-Complex',
    media: 'Image',
    thumb: 'bottle',
    ads: Array.from({ length: 4 }, (_, i) => ({ id: `12022815${2000 + i}`, campaign: camp.prosp, adSet: 'Broad_25-65_All', spend: 4946.89, cpa: 51.8 })),
    overall: 'C',
    grades: { conversion: 'B', hook: null, retention: null, ctr: 'C' },
    values: { cpa: 51.8, ctr: 1.3 },
    spend: 19787.54,
    roas: 1.31,
    tab: ['potential'],
    status: { kind: 'ready', count: 8, unseen: true },
  },
  {
    id: 'img-bau-030',
    name: 'img_bau_none_Batch030B_Liver_Static',
    media: 'Image',
    thumb: 'liver',
    ads: Array.from({ length: 4 }, (_, i) => ({ id: `12023001${3000 + i}`, campaign: camp.test, adSet: 'Static_Test', spend: 4405.8, cpa: 55.1 })),
    overall: 'C-',
    grades: { conversion: 'B', hook: null, retention: null, ctr: 'D' },
    values: { cpa: 55.1, ctr: 0.88 },
    spend: 17623.2,
    roas: 1.12,
    tab: ['potential', 'candidates'],
    status: { kind: 'idle' },
  },
  {
    id: 'vid-drkenberry',
    name: 'vid_partner_drkenberry_Bakery_Hook-v3',
    media: 'Video',
    thumb: 'tiktok',
    ads: Array.from({ length: 4 }, (_, i) => ({ id: `12023102${4000 + i}`, campaign: camp.prosp, adSet: 'Broad_25-65_All', spend: 3697.59, cpa: 78.26 })),
    overall: 'B-',
    grades: { conversion: 'D', hook: 'A', retention: 'A', ctr: 'A' },
    values: { cpa: 78.26, ctr: 1.97, hookRate: 38, retention: 29 },
    spend: 14790.35,
    roas: 0.98,
    tab: ['potential'],
    status: { kind: 'idle' },
  },
  {
    id: 'fem-start',
    name: '250610.2- fem start - Elizabeth_UGC_Video',
    media: 'Video',
    thumb: 'fem',
    ads: Array.from({ length: 3 }, (_, i) => ({ id: `12023203${5000 + i}`, campaign: camp.prosp, adSet: 'Broad_F_25-54', spend: 4281.93, cpa: 59.2 })),
    overall: 'C-',
    grades: { conversion: 'D', hook: 'D', retention: 'B', ctr: 'A' },
    values: { cpa: 59.2, ctr: 1.52, hookRate: 15, retention: 21 },
    spend: 12845.8,
    roas: 1.18,
    tab: ['potential', 'candidates'],
    status: { kind: 'idle' },
  },
];

/**
 * Recommendations for the hero ad. Priority is re-ordered against the original
 * (which put "Use stronger CTAs" second while CTR is already A). Stronger CTAs
 * was already tried on 12 Nov and produced the v2 variation in the table.
 */
export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'usp',
    priority: 1,
    issue: 'Missing USP',
    issueDetail: "The creative leads with a discount but never says why this liver supplement is different.",
    fix: 'Showcase a unique selling proposition',
    target: 'ROAS',
    examples: ['"Grass-fed, freeze-dried, never defatted."', '"One capsule = the nutrients of 3 oz of fresh liver."'],
  },
  {
    id: 'simplify',
    priority: 2,
    issue: 'Inefficient conversion',
    issueDetail: 'People click (CTR A) but few buy (CPA D). Two offers and three claims compete for attention.',
    fix: 'Simplify the CTA',
    target: 'CPA',
    examples: ['Replace "Click here and save" with "Shop 40% off"', 'Keep one offer: drop "Free gifts" or "Save 40%"'],
  },
  {
    id: 'stronger',
    priority: 3,
    issue: 'Generic call to action',
    issueDetail: 'CTR is already strong, so this is lower priority than fixing what happens after the click.',
    fix: 'Use stronger CTAs',
    target: 'CTR',
    examples: ['"Claim your 40% off today"', '"Start your 60-day trial"'],
    tried: { date: '12 Nov', count: 8 },
  },
];

export const PERSONAS = [
  { label: 'Health-conscious shoppers', why: 'Likely influenced by nutrient-density and ancestral health messaging.' },
  { label: 'Discount-seeking individuals', why: 'Likely influenced by cost savings and value-for-money messaging.' },
];

export const PLACEMENTS = [
  { label: 'Feed', share: 0.7 },
  { label: 'Stories', share: 0.3 },
];

/** Plain-words grade explanation (R6). Quartiles are assumed. */
export function gradeBand(g: Grade) {
  if (!g) return null;
  const letter = g[0];
  return (
    {
      A: 'top 25%',
      B: 'second 25%',
      C: 'third 25%',
      D: 'bottom 25%',
    } as Record<string, string>
  )[letter];
}

export const short = (name: string, n = 22) => (name.length > n ? `${name.slice(0, n)}…` : name);
export const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Grades are most reliable above this monthly spend (Atria's own guidance). */
export const RELIABLE_SPEND = 10000;

/** Small account for the low-spend Alert demo. Same structure, three creatives. */
export const SMALL_ACCOUNT = { id: 'javvy', name: 'Javvy Coffee', monthlySpend: 6200 };

export const SMALL_CREATIVES: Creative[] = [
  {
    id: 'jv-protein-static',
    name: 'JV_Protein-Coffee_Static_ar4:5_Morning-Ritual',
    media: 'Image', thumb: 'bottle',
    ads: [{ id: '120240118830021', campaign: 'JV_Prospecting_Broad_US_Protein-Coffee_Q4-2025', adSet: 'Broad_25-54', spend: 3120.4, cpa: 31.2 }],
    overall: 'C', grades: { conversion: 'C', hook: null, retention: null, ctr: 'D' },
    values: { cpa: 31.2, ctr: 0.71 }, spend: 3120.4, roas: 1.4, tab: ['potential'], status: { kind: 'idle' },
  },
  {
    id: 'jv-ugc-video',
    name: 'JV_UGC_Video_Barista-Review_v2',
    media: 'Video', thumb: 'fem',
    ads: [{ id: '120240118830044', campaign: 'JV_Prospecting_Broad_US_Protein-Coffee_Q4-2025', adSet: 'Broad_25-54', spend: 2410.0, cpa: 26.8 }],
    overall: 'B-', grades: { conversion: 'B', hook: 'B', retention: 'C', ctr: 'B' },
    values: { cpa: 26.8, ctr: 1.21, hookRate: 27, retention: 16 }, spend: 2410, roas: 1.9, tab: ['potential'], status: { kind: 'idle' },
  },
  {
    id: 'jv-bundle-static',
    name: 'JV_Bundle_Static_ar1:1_Save-20',
    media: 'Image', thumb: 'liver',
    ads: [{ id: '120240118830067', campaign: 'JV_Retargeting_Website-Visitors-30D_US', adSet: 'WebVisitors_30D', spend: 1650.2, cpa: 41.9 }],
    overall: 'D+', grades: { conversion: 'D', hook: null, retention: null, ctr: 'C' },
    values: { cpa: 41.9, ctr: 0.96 }, spend: 1650.2, roas: 0.9, tab: ['candidates'], status: { kind: 'idle' },
  },
];

export const TAB_DESCRIPTIONS = {
  winners: 'Strong grades on most metrics. Scale these before making new ones.',
  potential: 'Strong on one metric, weak on another. One focused fix could lift them.',
  candidates: 'Weaker overall, with enough spend to be worth testing a new version.',
  all: 'Every creative with spend in the last 60 days.',
} as const;

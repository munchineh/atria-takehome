/**
 * Mock data for the other six sidebar accounts (Mancini, 20 Nov 19:08: every account in the prototype has data
 * and real-looking thumbnails). Fictional brands; art is drawn by scripts/draw_products.py (slots pp1, ho1, …).
 * Each account mixes campaign objectives so Radar and the ad page show goal-led suggestions.
 */
import { REC_PROVIDERS, type Creative, type Grade, type Media, type MetaAd, type Objective, type Recommendation, type TabKey, type AdCopy } from './mock';

export interface Persona {
  label: string;
  why: string;
  icon: 'gift' | 'calm' | 'home' | 'leaf' | 'run' | 'paw' | 'sun' | 'cup';
  tint: string;
}

export interface MockAccount {
  id: string;
  name: string;
  monthlySpend: number;
  avg: { cpa: number; ctr: number; hookRate: number; retention: number };
  brand: { name: string; colors: string[]; font: string } | null;
  personas: Persona[];
  /** Art slots used for this account's new variations. */
  art: string[];
  /** Headlines used for this account's new variations. */
  heads: string[];
  creatives: Creative[];
}

type G = [conv: Grade, hook: Grade, ret: Grade, ctr: Grade];
interface CopySpec {
  campaign: string;
  adSet: string;
  share: number;
  objective?: Objective;
  status?: 'Paused';
  platform?: 'TikTok';
}

const feed = [
  { label: 'Feed', share: 0.65 },
  { label: 'Stories', share: 0.25 },
  { label: 'Reels', share: 0.1 },
];
const reels = [
  { label: 'Reels', share: 0.6 },
  { label: 'Stories', share: 0.3 },
  { label: 'Feed', share: 0.1 },
];

let seq = 0;
function ad(o: {
  acc: string;
  id: string;
  name: string;
  product: string;
  media?: Media;
  img: string;
  copy?: AdCopy;
  overall: Grade;
  g: G;
  cpa: number;
  ctr: number;
  hook?: number;
  ret?: number;
  spend: number;
  roas: number;
  tab: TabKey;
  copies: CopySpec[];
  variationOf?: string;
  status?: 'Paused';
}): Creative {
  const base = 120250000000 + (seq += 37) * 1000;
  const ads: MetaAd[] = o.copies.map((cp, i) => ({
    id: String(base + i),
    campaign: cp.campaign,
    adSet: cp.adSet,
    spend: Math.round(o.spend * cp.share * 100) / 100,
    cpa: Math.round(o.cpa * (1 + [0, 0.07, -0.05, 0.11][i % 4]) * 100) / 100,
    ...(cp.objective ? { objective: cp.objective } : {}),
    ...(cp.status ? { status: cp.status } : {}),
    ...(cp.platform ? { platform: cp.platform } : {}),
  }));
  return {
    id: o.id,
    accountId: o.acc,
    name: o.name,
    product: o.product,
    media: o.media ?? 'Image',
    img: o.img,
    copy: o.copy,
    ads,
    overall: o.overall,
    grades: { conversion: o.g[0], hook: o.g[1], retention: o.g[2], ctr: o.g[3] },
    values: { cpa: o.cpa, ctr: o.ctr, ...(o.hook ? { hookRate: o.hook } : {}), ...(o.ret ? { retention: o.ret } : {}) },
    spend: o.spend,
    roas: o.roas,
    tab: o.tab,
    placements: o.media === 'Video' ? reels : feed,
    ...(o.variationOf ? { variationOf: o.variationOf } : {}),
    ...(o.status ? { status: o.status } : {}),
  };
}

/** Suggestion set per account, written for its product. Same shapes as Moody Mochi's (L-008 plain wording). */
function recs(o: {
  noun: string;
  usp: string[];
  offer: string[];
  offerWhy: string;
  cta: string[];
  stop: string[];
  hook: string[];
}): (c: Creative) => Recommendation[] {
  const all: Recommendation[] = [
    {
      id: 'different',
      priority: 1,
      issue: "Customers don't have a clear reason to buy",
      issueDetail: `Your ad shows the ${o.noun} but not what makes it worth buying.`,
      why: `Your ad shows the ${o.noun}, but doesn't tell customers why they should buy it. Give them a clear reason to choose it over the rest.`,
      fix: 'Say what makes it different',
      target: 'CPA',
      examples: o.usp,
      visuals: [`The ${o.noun} in use, close up`],
    },
    {
      id: 'offer',
      priority: 2,
      issue: "Customers are clicking your ad but aren't buying",
      issueDetail: o.offerWhy,
      why: `${o.offerWhy} Show one clear offer so the next step is easy.`,
      fix: 'Make one clear offer',
      target: 'CPA',
      examples: o.offer,
      visuals: ['The price on a sticker on the image'],
    },
    {
      id: 'stop',
      priority: 3,
      issue: 'Customers scroll past your ad',
      issueDetail: `The ${o.noun} is small in the frame.`,
      why: `Your ${o.noun} sits small in a busy scene. Let it fill the frame so customers stop scrolling.`,
      fix: 'Make the product the first thing you see',
      target: 'CTR',
      examples: [],
      visuals: o.stop,
    },
    {
      id: 'cta',
      priority: 4,
      issue: "The button doesn't say what customers get",
      issueDetail: '"Shop now" could be any brand.',
      why: `"Shop now" could be any brand. Tell customers what they get when they tap.`,
      fix: 'Use a more specific call to action',
      target: 'CTR',
      examples: o.cta,
      visuals: ['A button in the brand color so it stands out'],
    },
    {
      id: 'hook',
      priority: 5,
      issue: 'Customers leave in the first 3 seconds',
      issueDetail: 'The video opens slowly before the product appears.',
      why: `Your video opens slowly. Show the ${o.noun} in the first second so customers keep watching.`,
      fix: 'Show the product in the first second',
      target: 'Hook',
      examples: [],
      visuals: o.hook,
    },
  ];
  return (c) => {
    const weak = (k: keyof Creative['grades']) => /^[CD]/.test(c.grades[k] ?? '');
    return all.filter((r) => {
      if (r.id === 'hook') return c.media === 'Video' && (weak('hook') || weak('retention'));
      if (r.id === 'stop') return weak('ctr');
      if (r.id === 'cta') return !weak('ctr') || c.media !== 'Video';
      return true;
    });
  };
}

// ── Tiny Toast Co. gets one more ad and its own suggestions (thumbnails t01–t04 are drawn) ─────────────
export const TINY_TOAST_EXTRA: Creative[] = [
  ad({
    acc: 'tiny-toast', id: 'tt-mint', name: 'Mint toaster · New color', product: 'Mini toaster', img: 't04',
    copy: { head: 'NOW IN MINT', cta: 'SEE COLORS', tone: 'dark' },
    overall: 'B+', g: ['B', null, null, 'A'], cpa: 22.4, ctr: 1.62, spend: 1020, roas: 2.4, tab: 'winners',
    copies: [{ campaign: 'Blog · Toast recipes', adSet: 'Interest_Breakfast', share: 1, objective: 'Traffic' }],
  }),
];
REC_PROVIDERS['tiny-toast'] = recs({
  noun: 'toaster',
  usp: ['"Fits a 30 cm shelf"', '"Two slices in 90 seconds"'],
  offer: ['"$39 today, free shipping"'],
  offerWhy: 'The price only shows on the product page, so people who click are still deciding.',
  cta: ['"Pick your color"', '"Get the mini"'],
  stop: ['Crop in so the toaster fills the frame', 'Pop the toast mid-air'],
  hook: ['Open on toast popping', 'Show the size next to a mug'],
});

const pp = 'pebble-pine';
const ho = 'hollow-oak';
const ks = 'kumo-socks';
const lt = 'lumen-tea';
const fp = 'fernwick-pet';
const sg = 'saltglass-swim';

export const MORE_ACCOUNTS: MockAccount[] = [
  {
    id: pp,
    name: 'Pebble & Pine',
    monthlySpend: 48000,
    avg: { cpa: 31.0, ctr: 1.18, hookRate: 22, retention: 15 },
    brand: { name: 'Pebble & Pine', colors: ['#4f7942', '#c9733d', '#e7efe2', '#b8b2a7'], font: 'DM Serif Display' },
    personas: [
      { label: 'New plant parents', why: 'Likely to respond to easy-care and no-fuss messages.', icon: 'leaf', tint: '#e7efe2' },
      { label: 'Home stylists', why: 'Likely to respond to finish, color and room shots.', icon: 'home', tint: '#f4ede2' },
    ],
    art: ['pp1', 'pp2', 'pp3', 'pp4'],
    heads: ['SELF-WATERING', 'GROWS WITH YOU', 'STONE FINISH', 'ONE POT, NO FUSS'],
    creatives: [
      ad({ acc: pp, id: 'pp-terracotta', name: 'Terracotta planter · Hero', product: 'Terracotta planter', img: 'pp1', copy: { head: 'GROWS WITH YOU', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'C', g: ['D', null, null, 'B'], cpa: 44.2, ctr: 1.31, spend: 18400, roas: 1.1, tab: 'potential',
        copies: [{ campaign: 'Planters · Broad US · Q4', adSet: 'Broad_25-54', share: 0.7 }, { campaign: 'Retargeting · Site visitors', adSet: 'WebVisitors_30D', share: 0.3 }] }),
      ad({ acc: pp, id: 'pp-duo', name: 'Planter duo · Gift set', product: 'Planter duo', img: 'pp2', copy: { head: 'THE GIFT THAT GROWS', price: '$58', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'A', g: ['A', null, null, 'B'], cpa: 24.6, ctr: 1.44, spend: 11200, roas: 3.1, tab: 'winners',
        copies: [{ campaign: 'Gifting · US and CA', adSet: 'Gifting_Interests_US', share: 1 }] }),
      ad({ acc: pp, id: 'pp-styling', name: 'Free styling call · Signup', product: 'Styling call', img: 'pp3', copy: { head: 'FREE PLANT STYLING', cta: 'BOOK A CALL', tone: 'dark' },
        overall: 'C-', g: ['C', null, null, 'D'], cpa: 18.9, ctr: 0.62, spend: 7600, roas: 0.8, tab: 'candidates',
        copies: [{ campaign: 'Styling calls · Lead form', adSet: 'Homeowners_30-55', share: 1, objective: 'Leads' }] }),
      ad({ acc: pp, id: 'pp-repot', name: 'Repotting in 30 seconds', product: 'Terracotta planter', media: 'Video', img: 'pp4',
        overall: 'B-', g: ['B', 'C', 'B', 'B'], cpa: 29.8, ctr: 1.22, hook: 18, ret: 17, spend: 6100, roas: 1.9, tab: 'potential',
        copies: [{ campaign: 'Planters · Broad US · Q4', adSet: 'Broad_25-54', share: 0.5 }, { campaign: 'Video views · Plant care', adSet: 'Interest_Houseplants', share: 0.5, objective: 'Engagement' }] }),
      ad({ acc: pp, id: 'pp-duo-v1', name: 'Planter duo · Stone finish', product: 'Planter duo', img: 'pp3', copy: { head: 'STONE FINISH', price: '$58', cta: 'PICK A COLOR', tone: 'dark' },
        overall: 'B', g: ['B', null, null, 'B'], cpa: 27.1, ctr: 1.36, spend: 2300, roas: 2.6, tab: 'winners', variationOf: 'pp-duo',
        copies: [{ campaign: 'Creative testing · November', adSet: 'Variation_Test', share: 1 }] }),
    ],
  },
  {
    id: ho,
    name: 'Hollow Oak Candles',
    monthlySpend: 22500,
    avg: { cpa: 19.5, ctr: 1.05, hookRate: 26, retention: 20 },
    brand: { name: 'Hollow Oak Candles', colors: ['#6b4e2e', '#d9c7a8', '#efe4d6', '#3b2f2a'], font: 'Cormorant' },
    personas: [
      { label: 'Cozy-night planners', why: 'Likely to respond to scent, warmth and evening scenes.', icon: 'home', tint: '#efe4d6' },
      { label: 'Gift buyers', why: 'Likely to respond to sets, wrapping and price per candle.', icon: 'gift', tint: '#f6e0e8' },
    ],
    art: ['ho1', 'ho2', 'ho3', 'ho4'],
    heads: ['60 HOURS OF GLOW', 'HAND-POURED', 'SMELLS LIKE OAK', 'LIGHT ONE TONIGHT'],
    creatives: [
      ad({ acc: ho, id: 'ho-oak', name: 'Oak & ember · Jar', product: 'Oak & ember candle', img: 'ho1', copy: { head: 'SMELLS LIKE OAK', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'B-', g: ['C', null, null, 'A'], cpa: 23.8, ctr: 1.52, spend: 8400, roas: 1.6, tab: 'potential',
        copies: [{ campaign: 'Candles · Broad US', adSet: 'Broad_25-54', share: 0.6 }, { campaign: 'Retargeting · Site visitors', adSet: 'WebVisitors_30D', share: 0.4 }] }),
      ad({ acc: ho, id: 'ho-night', name: 'Night pour · Dark jar', product: 'Oak & ember candle', img: 'ho2', copy: { head: 'LIGHT ONE TONIGHT', cta: 'SHOP NOW' },
        overall: 'A', g: ['A', null, null, 'A'], cpa: 14.2, ctr: 1.71, spend: 6900, roas: 3.4, tab: 'winners',
        copies: [{ campaign: 'Candles · Broad US', adSet: 'Broad_25-54', share: 1 }] }),
      ad({ acc: ho, id: 'ho-pour', name: 'Pour with us · Studio video', product: 'Lavender candle', media: 'Video', img: 'ho4',
        overall: 'C', g: ['C', 'D', 'C', 'B'], cpa: 25.1, ctr: 1.12, hook: 14, ret: 12, spend: 4200, roas: 1.2, tab: 'candidates',
        copies: [{ campaign: 'Studio stories · Engagement', adSet: 'Interest_Candles', share: 1, objective: 'Engagement' }] }),
      ad({ acc: ho, id: 'ho-duo', name: 'Gift duo · Two jars', product: 'Candle gift set', img: 'ho3', copy: { head: 'TWO FOR $42', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'D+', g: ['D', null, null, 'C'], cpa: 33.6, ctr: 0.84, spend: 3000, roas: 0.7, tab: 'candidates',
        copies: [{ campaign: 'Gifting · US and CA', adSet: 'Gifting_Interests_US', share: 0.5 }, { campaign: 'Gifting · US and CA', adSet: 'Lookalike_1%', share: 0.5, status: 'Paused' }] }),
    ],
  },
  {
    id: ks,
    name: 'Kumo Socks',
    monthlySpend: 64000,
    avg: { cpa: 17.0, ctr: 1.6, hookRate: 28, retention: 21 },
    brand: { name: 'Kumo Socks', colors: ['#7aa6c2', '#e76f51', '#264653', '#e9c46a'], font: 'Nunito' },
    personas: [
      { label: 'Weekend hikers', why: 'Likely to respond to comfort, grip and blister-free claims.', icon: 'run', tint: '#e3eef6' },
      { label: 'Color lovers', why: 'Likely to respond to bold patterns and mix-and-match packs.', icon: 'sun', tint: '#fdebd3' },
    ],
    art: ['ks1', 'ks2', 'ks3', 'ks4'],
    heads: ['NO MORE BLISTERS', 'CLOUD-SOFT', 'MIX ANY 3', 'MADE FOR MILES'],
    creatives: [
      ad({ acc: ks, id: 'ks-cloud', name: 'Cloud sock · Hero', product: 'Cloud sock', img: 'ks1', copy: { head: 'CLOUD-SOFT', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'C+', g: ['C', null, null, 'B'], cpa: 21.4, ctr: 1.58, spend: 21000, roas: 1.5, tab: 'potential',
        copies: [{ campaign: 'Socks · Broad US · Q4', adSet: 'Broad_18-44', share: 0.55 }, { campaign: 'Retargeting · Site visitors', adSet: 'WebVisitors_30D', share: 0.3 }, { campaign: 'Socks · Broad US · Q4', adSet: 'Advantage+', share: 0.15, platform: 'TikTok' }] }),
      ad({ acc: ks, id: 'ks-pack', name: 'Mix any 3 · Pack', product: 'Sock 3-pack', img: 'ks2', copy: { head: 'MIX ANY 3', price: '$36', cta: 'BUILD YOUR PACK', tone: 'dark' },
        overall: 'A', g: ['A', null, null, 'A'], cpa: 12.8, ctr: 2.11, spend: 17500, roas: 3.8, tab: 'winners',
        copies: [{ campaign: 'Socks · Broad US · Q4', adSet: 'Broad_18-44', share: 1 }] }),
      ad({ acc: ks, id: 'ks-guide', name: 'How to pick hiking socks', product: 'Trail sock', img: 'ks3', copy: { head: 'WHICH SOCK FOR WHICH TRAIL?', cta: 'READ THE GUIDE', tone: 'dark' },
        overall: 'C-', g: ['C', null, null, 'D'], cpa: 19.9, ctr: 0.71, spend: 8200, roas: 1.0, tab: 'candidates',
        copies: [{ campaign: 'Blog · Trail guides', adSet: 'Interest_Hiking', share: 1, objective: 'Traffic' }] }),
      ad({ acc: ks, id: 'ks-trail', name: 'Trail test · 20 km video', product: 'Trail sock', media: 'Video', img: 'ks4',
        overall: 'B', g: ['B', 'B', 'C', 'B'], cpa: 16.4, ctr: 1.66, hook: 29, ret: 16, spend: 11300, roas: 2.2, tab: 'potential',
        copies: [{ campaign: 'Socks · Broad US · Q4', adSet: 'Broad_18-44', share: 0.6 }, { campaign: 'TikTok · Trail', adSet: 'Interest_Outdoors', share: 0.4, platform: 'TikTok', objective: 'Awareness' }] }),
      ad({ acc: ks, id: 'ks-winter', name: 'Winter wool · Last season', product: 'Wool sock', img: 'ks1', copy: { head: 'WARM TOES ALL WINTER', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'D', g: ['D', null, null, 'D'], cpa: 38.2, ctr: 0.55, spend: 6000, roas: 0.6, tab: 'candidates', status: 'Paused',
        copies: [{ campaign: 'Socks · Broad US · Q4', adSet: 'Broad_18-44', share: 1 }] }),
    ],
  },
  {
    id: lt,
    name: 'Lumen Tea House',
    monthlySpend: 2400,
    avg: { cpa: 14.0, ctr: 1.3, hookRate: 25, retention: 19 },
    brand: { name: 'Lumen Tea House', colors: ['#8a9a5b', '#c98b4a', '#eef3e6', '#2f3b33'], font: 'Lora' },
    personas: [
      { label: 'Slow mornings', why: 'Likely to respond to ritual, calm and first-cup scenes.', icon: 'cup', tint: '#eef3e6' },
      { label: 'Health-curious', why: 'Likely to respond to ingredients and caffeine-free options.', icon: 'leaf', tint: '#fbeee0' },
    ],
    art: ['lt1', 'lt2', 'lt3', 'lt4'],
    heads: ['YOUR FIRST CUP', 'CAFFEINE-FREE', 'STEEP. BREATHE.', 'LOOSE LEAF, NO FUSS'],
    creatives: [
      ad({ acc: lt, id: 'lt-sencha', name: 'Morning sencha · Cup', product: 'Sencha', img: 'lt1', copy: { head: 'YOUR FIRST CUP', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'C', g: ['C', null, null, 'C'], cpa: 16.9, ctr: 1.04, spend: 980, roas: 1.3, tab: 'candidates',
        copies: [{ campaign: 'Tea · Broad US', adSet: 'Broad_25-54', share: 1 }] }),
      ad({ acc: lt, id: 'lt-rooibos', name: 'Rooibos · Caffeine-free', product: 'Rooibos', img: 'lt2', copy: { head: 'CAFFEINE-FREE', price: '$14', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'B+', g: ['B', null, null, 'A'], cpa: 12.1, ctr: 1.71, spend: 760, roas: 2.6, tab: 'winners',
        copies: [{ campaign: 'Tea · Broad US', adSet: 'Broad_25-54', share: 1 }] }),
      ad({ acc: lt, id: 'lt-steep', name: 'Steep with us · Video', product: 'Sencha', media: 'Video', img: 'lt3',
        overall: 'C+', g: ['B', 'C', 'C', 'B'], cpa: 13.6, ctr: 1.38, hook: 21, ret: 15, spend: 410, roas: 1.7, tab: 'potential',
        copies: [{ campaign: 'Tea rituals · Engagement', adSet: 'Interest_Tea', share: 1, objective: 'Engagement' }] }),
      ad({ acc: lt, id: 'lt-berry', name: 'Berry hibiscus · Iced', product: 'Hibiscus', img: 'lt4', copy: { head: 'ICED BY 3 PM', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'B', g: ['B', null, null, 'B'], cpa: 13.2, ctr: 1.41, spend: 250, roas: 2.0, tab: 'winners',
        copies: [{ campaign: 'Tea · Broad US', adSet: 'Broad_25-54', share: 1 }] }),
    ],
  },
  {
    id: fp,
    name: 'Fernwick Pet Co.',
    monthlySpend: 31000,
    avg: { cpa: 26.0, ctr: 1.25, hookRate: 30, retention: 22 },
    brand: { name: 'Fernwick Pet Co.', colors: ['#e76f51', '#2a9d8f', '#fdf0e1', '#d9a066'], font: 'Baloo 2' },
    personas: [
      { label: 'New puppy owners', why: 'Likely to respond to training, chewing and first-month bundles.', icon: 'paw', tint: '#fdf0e1' },
      { label: 'Picky-eater parents', why: 'Likely to respond to taste tests and ingredient lists.', icon: 'gift', tint: '#e6f1f4' },
    ],
    art: ['fp1', 'fp2', 'fp3', 'fp4'],
    heads: ['BOWL LICKED CLEAN', 'REAL CHICKEN FIRST', 'PUPPY STARTER KIT', 'CHEW-PROOF'],
    creatives: [
      ad({ acc: fp, id: 'fp-bowl', name: 'Kibble bowl · Real chicken', product: 'Chicken kibble', img: 'fp2', copy: { head: 'REAL CHICKEN FIRST', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'C', g: ['D', null, null, 'B'], cpa: 39.4, ctr: 1.29, spend: 12600, roas: 1.0, tab: 'potential',
        copies: [{ campaign: 'Food · Broad US · Q4', adSet: 'Broad_25-54', share: 0.65 }, { campaign: 'Retargeting · Site visitors', adSet: 'WebVisitors_30D', share: 0.35 }] }),
      ad({ acc: fp, id: 'fp-taste', name: 'Taste test · Dog video', product: 'Chicken kibble', media: 'Video', img: 'fp1',
        overall: 'B+', g: ['B', 'A', 'B', 'A'], cpa: 23.1, ctr: 1.74, hook: 38, ret: 24, spend: 9800, roas: 2.4, tab: 'winners',
        copies: [{ campaign: 'Brand · Video reach', adSet: 'Interest_Dogs', share: 0.7, objective: 'Awareness' }, { campaign: 'Food · Broad US · Q4', adSet: 'Broad_25-54', share: 0.3 }] }),
      ad({ acc: fp, id: 'fp-starter', name: 'Puppy starter kit', product: 'Puppy kit', img: 'fp3', copy: { head: 'PUPPY STARTER KIT', price: '$49', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'C-', g: ['C', null, null, 'D'], cpa: 31.5, ctr: 0.77, spend: 5400, roas: 1.1, tab: 'candidates',
        copies: [{ campaign: 'Food · Broad US · Q4', adSet: 'Broad_25-54', share: 1 }] }),
      ad({ acc: fp, id: 'fp-teal', name: 'Teal bowl · Bundle', product: 'Bowl bundle', img: 'fp4', copy: { head: 'CHEW-PROOF', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'B', g: ['B', null, null, 'B'], cpa: 24.9, ctr: 1.33, spend: 3200, roas: 2.1, tab: 'winners',
        copies: [{ campaign: 'Food · Broad US · Q4', adSet: 'Lookalike_1%', share: 1 }] }),
    ],
  },
  {
    id: sg,
    name: 'Saltglass Swim',
    monthlySpend: 120000,
    avg: { cpa: 42.0, ctr: 1.12, hookRate: 27, retention: 18 },
    brand: { name: 'Saltglass Swim', colors: ['#2a9d8f', '#f4a261', '#d8f0f2', '#0f3b4a'], font: 'Josefin Sans' },
    personas: [
      { label: 'Sun-trip planners', why: 'Likely to respond to holiday countdowns and packing lists.', icon: 'sun', tint: '#d8f0f2' },
      { label: 'Fit-first shoppers', why: 'Likely to respond to size guides and try-on proof.', icon: 'run', tint: '#fde2d0' },
    ],
    art: ['sg1', 'sg2', 'sg3', 'sg4'],
    heads: ['FITS FIRST TRY', 'SUN-READY', 'MADE FROM OCEAN PLASTIC', 'PACK LIGHT'],
    creatives: [
      ad({ acc: sg, id: 'sg-teal', name: 'Teal one-piece · Hero', product: 'Teal one-piece', img: 'sg1', copy: { head: 'SUN-READY', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'B-', g: ['C', null, null, 'A'], cpa: 51.2, ctr: 1.58, spend: 42000, roas: 1.6, tab: 'potential',
        copies: [{ campaign: 'Swim · Broad US · Winter sun', adSet: 'Broad_F_25-44', share: 0.5 }, { campaign: 'Retargeting · Site visitors', adSet: 'WebVisitors_30D', share: 0.3 }, { campaign: 'Swim · Broad US · Winter sun', adSet: 'Advantage+', share: 0.2 }] }),
      ad({ acc: sg, id: 'sg-coral', name: 'Coral one-piece · Fit', product: 'Coral one-piece', img: 'sg2', copy: { head: 'FITS FIRST TRY', cta: 'FIND MY SIZE' },
        overall: 'A', g: ['A', null, null, 'B'], cpa: 33.4, ctr: 1.29, spend: 28500, roas: 3.0, tab: 'winners',
        copies: [{ campaign: 'Swim · Broad US · Winter sun', adSet: 'Broad_F_25-44', share: 1 }] }),
      ad({ acc: sg, id: 'sg-colors', name: 'Pick your color · Carousel', product: 'One-piece range', media: 'Carousel', img: 'sg3',
        overall: 'C', g: ['C', null, null, 'C'], cpa: 47.9, ctr: 0.98, spend: 19500, roas: 1.3, tab: 'candidates',
        copies: [{ campaign: 'Swim · Broad US · Winter sun', adSet: 'Broad_F_25-44', share: 0.6 }, { campaign: 'Comments · Color poll', adSet: 'Interest_Travel', share: 0.4, objective: 'Engagement' }] }),
      ad({ acc: sg, id: 'sg-night', name: 'Night swim · Video', product: 'Teal one-piece', media: 'Video', img: 'sg4',
        overall: 'C-', g: ['C', 'D', 'C', 'B'], cpa: 46.3, ctr: 1.18, hook: 15, ret: 13, spend: 16000, roas: 1.2, tab: 'candidates',
        copies: [{ campaign: 'Brand · Video reach', adSet: 'Interest_Travel', share: 0.75, objective: 'Awareness' }, { campaign: 'TikTok · Swim', adSet: 'Interest_Beach', share: 0.25, platform: 'TikTok', objective: 'Awareness' }] }),
      ad({ acc: sg, id: 'sg-teal-v1', name: 'Teal one-piece · Ocean plastic', product: 'Teal one-piece', img: 'sg1', copy: { head: 'MADE FROM OCEAN PLASTIC', cta: 'SHOP NOW', tone: 'dark' },
        overall: 'B+', g: ['B', null, null, 'A'], cpa: 38.7, ctr: 1.61, spend: 6200, roas: 2.4, tab: 'winners', variationOf: 'sg-teal',
        copies: [{ campaign: 'Creative testing · November', adSet: 'Variation_Test', share: 1 }] }),
    ],
  },
];

REC_PROVIDERS[pp] = recs({ noun: 'planter', usp: ['"Self-watering for 2 weeks"', '"Hand-thrown in Portugal"'], offer: ['"$58 for the pair, free shipping"'], offerWhy: 'The price only shows after the click, so people are still deciding.', cta: ['"Pick your finish"', '"Find your size"'], stop: ['Crop in so the planter fills the frame', 'Use one bold wall color'], hook: ['Open on the plant going in', 'Show the before and after first'] });
REC_PROVIDERS[ho] = recs({ noun: 'candle', usp: ['"60 hours of burn time"', '"Hand-poured soy wax"'], offer: ['"Two for $42"'], offerWhy: 'The gift set has no price on the ad, and the second jar is easy to miss.', cta: ['"Choose your scent"', '"Build a gift set"'], stop: ['Show the flame close up', 'Use a dark background so the glow stands out'], hook: ['Open on the wick lighting', 'Start with the wax pour'] });
REC_PROVIDERS[ks] = recs({ noun: 'sock', usp: ['"No blisters after 20 km"', '"Merino, machine washable"'], offer: ['"Any 3 for $36"'], offerWhy: 'The multi-pack price is only on the site, so single-pair shoppers bounce.', cta: ['"Build your pack"', '"Find your trail sock"'], stop: ['Fill the frame with one sock', 'Show the pattern up close'], hook: ['Open on the trail, socks first', 'Show the 20 km counter in second one'] });
REC_PROVIDERS[lt] = recs({ noun: 'tea', usp: ['"Single-estate, picked in May"', '"Caffeine-free, still full flavor"'], offer: ['"Sampler of 4 for $18"'], offerWhy: 'There is no price or sampler on the ad, so new customers are unsure what to try.', cta: ['"Try the sampler"', '"Find your cup"'], stop: ['Fill the frame with the cup', 'Show the steam close up'], hook: ['Open on the pour', 'Show the leaves unfurling first'] });
REC_PROVIDERS[fp] = recs({ noun: 'food', usp: ['"Real chicken is the first ingredient"', '"Vet-formulated"'], offer: ['"First bag 30% off"'], offerWhy: 'People click to check the price, and the first-order discount only shows at checkout.', cta: ['"Try a starter bag"', '"Find your dog\'s size"'], stop: ['Show the bowl from above, filling the frame', 'Put the dog in the shot'], hook: ['Open on the dog running to the bowl', 'Show the empty bowl in second one'] });
REC_PROVIDERS[sg] = recs({ noun: 'swimsuit', usp: ['"Made from ocean plastic"', '"Fits first try or free returns"'], offer: ['"Free returns, any size"'], offerWhy: 'Fit worries stop people buying, and free returns are only on the FAQ.', cta: ['"Find my size"', '"Shop the color"'], stop: ['Fill the frame with the swimsuit', 'Use one bright sky color'], hook: ['Open on the dive', 'Show the color before the logo'] });

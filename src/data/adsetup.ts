/**
 * 260 (Mancini 17:36): an ad is more than its creative. These are the ad-level fields people edit in Ad Library and
 * fill in on Link to Ad, and the suggestions that change them (scope "ad") rather than the creative.
 * Data and logic only. Values are mock, shaped like Meta's ad setup.
 */
import type { Creative, Recommendation } from './mock';

export const CTA_OPTIONS = ['Shop now', 'Get offer', 'Order now', 'Learn more', 'See more', 'Sign up'] as const;
export type CtaButton = (typeof CTA_OPTIONS)[number];

export interface AdSetup {
  /** The Facebook page or Instagram account the ad runs as. */
  brand: string;
  headline: string;
  /** Meta's "Primary text": the copy above the creative. */
  primaryText: string;
  cta: CtaButton;
  landing: string;
}

export type AdField = keyof AdSetup;
export const FIELD_LABEL: Record<AdField, string> = {
  brand: 'Brand',
  headline: 'Headline',
  primaryText: 'Ad copy',
  cta: 'Call to action',
  landing: 'Landing page',
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const domainOf = (account: string) => `${slug(account).replace(/-/g, '')}.com`;
const sentence = (s: string) => s.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase()).replace(/\bi\b/g, 'I');

/** Ads whose link still opens the home page, so a "landing page" suggestion has something to fix. */
const HOME_LINK = new Set(['mm-1090245', 'mm-1090247', 'mm-1086424']);
/** Ads whose copy above the creative never states the price. */
const NO_PRICE_COPY = new Set(['mm-1090245', 'mm-1088102', 'mm-1090247']);

/** The ad's current setup in Meta (mock), derived from the ad so every ad has believable fields. */
export function adSetupOf(c: Creative, accountName: string, sales = true): AdSetup {
  const domain = domainOf(accountName);
  const product = c.product;
  const head = c.copy?.head ? sentence(c.copy.head) : product;
  return {
    brand: accountName,
    headline: head.replace(/\?$/, '?'),
    primaryText: NO_PRICE_COPY.has(c.id)
      ? `Meet ${product}: slow-rise, squishy and a little moody. Free shipping on orders over $40.`
      : `${product}, made to be squeezed. ${c.copy?.price ? `${c.copy.price} today.` : 'Free shipping on orders over $40.'}`,
    cta: sales ? 'Shop now' : 'Learn more',
    landing: HOME_LINK.has(c.id) ? `${domain}` : `${domain}/products/${slug(product)}`,
  };
}

/**
 * Suggestions that change the ad, not the creative. Picking only these makes "Duplicate ad" the next step;
 * picking any creative suggestion as well keeps the generation flow, and these are carried to Link to Ad.
 */
export function adRecsFor(c: Creative, accountName: string, sales: boolean, cpaFirst: boolean): Recommendation[] {
  const s = adSetupOf(c, accountName, sales);
  const conv = c.grades.conversion?.[0];
  const out: Recommendation[] = [];
  if (HOME_LINK.has(c.id) && (conv === 'C' || conv === 'D')) {
    out.push({
      id: 'ad-landing',
      priority: 0,
      scope: 'ad',
      field: 'landing',
      value: `${s.landing}/products/${slug(c.product)}`,
      issue: 'The link opens your home page',
      issueDetail: `People who tap land on ${s.landing}, not on the ${c.product.toLowerCase()} page, so they have to look for it.`,
      why: 'Send them straight to the product page from the ad, so the price and the buy button are the first things they see.',
      fix: 'Link to the product page',
      target: 'CPA',
      examples: [`"${s.landing}/products/${slug(c.product)}"`],
    });
  }
  if (NO_PRICE_COPY.has(c.id) && cpaFirst) {
    out.push({
      id: 'ad-copy-price',
      priority: 0,
      scope: 'ad',
      field: 'primaryText',
      value: `Meet ${c.product}: slow-rise, squishy and hand-painted. 3 for $36, free stickers with every order.`,
      issue: 'The ad copy never mentions the price',
      issueDetail: 'The copy above the creative talks about the mochi but not what it costs, so people tap without knowing.',
      why: 'State the price in the copy so the people who tap already know it, and fewer leave at the product page.',
      fix: 'Put the price in the ad copy',
      target: 'CPA',
      examples: ['"3 for $36, free stickers with every order."'],
    });
  }
  if (s.cta === 'Learn more' && sales) {
    out.push({
      id: 'ad-cta',
      priority: 0,
      scope: 'ad',
      field: 'cta',
      value: 'Shop now',
      issue: '"Learn more" sounds like reading, not buying',
      issueDetail: 'This is a sales ad, but its button asks people to learn more.',
      why: 'A buying button sets the right expectation, so the people who tap are ready to buy.',
      fix: 'Use the "Shop now" button',
      target: 'CPA',
      examples: ['"Shop now"'],
    });
  }
  return out;
}

/** Applies ad-level suggestions to a setup (Duplicate ad, Link to Ad prefill). */
export function applyAdRecs(setup: AdSetup, recs: Recommendation[]): AdSetup {
  const next = { ...setup };
  for (const r of recs) if (r.scope === 'ad' && r.field && r.value) (next as Record<string, string>)[r.field] = r.value;
  return next;
}

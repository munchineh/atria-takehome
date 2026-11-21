/**
 * Creative gallery model (DL-15). The unit is a creative (one image), not an ad.
 *
 * A creative may or may not be tied to an ad or a campaign:
 *   - made from an ad's suggestions (a variation)      → tied to that ad
 *   - cloned from another ad, or made from scratch      → tied to nothing yet
 *   - added to Meta as a paused ad                      → tied to a campaign
 * Grouping is optional. When a grouping is on, creatives with no value for it go into one last group
 * ("Not made from an ad", "Not in a campaign yet") so nothing disappears.
 *
 * Data and logic only; the UI branch renders it.
 */
import type { AdCopy, Creative } from './mock';
import type { Job } from './store';
import type { Variation, Version } from './variations';

export type Origin = 'variation' | 'cloned' | 'scratch';
export type GroupBy = 'none' | 'date' | 'ad' | 'campaign' | 'product';

export const ORIGIN_LABEL: Record<Origin, string> = { variation: 'Made from an ad', cloned: 'Cloned', scratch: 'From scratch' };
/** Atria's own Image Ads page groups by date by default and offers Product among others; Ad and Campaign are ours (DL-15). */
export const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'ad', label: 'Ad' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'product', label: 'Product' },
  { value: 'none', label: 'None' },
];
/** Origin is a tab row, as on Atria's page (All, Clone, Iterate, Raya). */
export const ORIGIN_TABS: { value: 'all' | Origin; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'variation', label: 'From ads' },
  { value: 'cloned', label: 'Cloned' },
  { value: 'scratch', label: 'From scratch' },
];
/** Title of the last group, for creatives the grouping has no value for. */
export const UNGROUPED_LABEL: Record<GroupBy, string> = { none: '', date: 'Earlier', ad: 'Not made from an ad', campaign: 'Not in a campaign yet', product: 'No product' };

export interface GalleryItem {
  /** Variation id. */
  id: string;
  img: string;
  copy?: AdCopy;
  /** The angle, used as the creative's name. */
  name: string;
  origin: Origin;
  accountId: string;
  /** The ad it was made from, when there is one. */
  ad?: { id: string; name: string };
  /** Campaigns it is used in (as a paused or running ad). Empty until it is added to Meta. */
  campaigns: string[];
  product: string;
  jobId: string;
  /** Round date ("Nov 20") and age, for sorting newest first. */
  date: string;
  minutesAgo: number;
  versions: number;
  shortlisted: boolean;
  /** Added to Meta as a paused ad. */
  inMeta: boolean;
  stylized: boolean;
  /** Opens the editor inside Creation. */
  to: string;
}

export interface GalleryGroup {
  key: string;
  title: string;
  /** "8 creatives · last made Nov 20" */
  meta: string;
  /** True for the catch-all group at the end. */
  ungrouped: boolean;
  /** For "Group by ad": the ad's id, so the group header can link to its round or to Radar. */
  adId?: string;
  items: GalleryItem[];
}

const count = (n: number) => `${n} ${n === 1 ? 'creative' : 'creatives'}`;

/** Every creative made in Atria, newest first. Failed and deleted ones are left out. */
export function galleryItems(jobs: Job[], find: (id: string) => Creative | undefined, picks: string[] = [], versionsOf?: (v: Variation) => Version[]): GalleryItem[] {
  const out: GalleryItem[] = [];
  for (const j of jobs) {
    if (j.state !== 'ready') continue;
    const source = find(j.creativeId);
    if (!source) continue;
    const origin: Origin = source.project === 'clone' ? 'cloned' : source.project === 'scratch' ? 'scratch' : 'variation';
    j.variations.forEach((v, i) => {
      if (v.deleted || j.failed.includes(i)) return;
      const latest = versionsOf?.(v).at(-1);
      out.push({
        id: v.id,
        img: latest?.img ?? v.img,
        copy: latest ? latest.copy : v.copy,
        name: v.angle,
        origin,
        accountId: source.accountId,
        ad: origin === 'variation' ? { id: source.id, name: source.name } : undefined,
        // A creative joins a campaign when it is added to Meta; it goes into the source ad's main campaign.
        campaigns: v.launched && source.ads[0] ? [source.ads[0].campaign] : [],
        product: source.product,
        jobId: j.id,
        date: j.date,
        minutesAgo: j.minutesAgo,
        versions: versionsOf ? versionsOf(v).length : 1,
        shortlisted: picks.includes(v.id),
        inMeta: Boolean(v.launched),
        stylized: Boolean(v.stylized),
        to: `/creation/${source.id}/${v.id}?round=${j.id}`,
      });
    });
  }
  return out.sort((a, b) => a.minutesAgo - b.minutesAgo);
}

/** Group creatives. Groups keep the order of their newest creative; the catch-all group is always last. */
export function groupGallery(items: GalleryItem[], by: GroupBy): GalleryGroup[] {
  if (by === 'none') return [{ key: 'all', title: 'All creatives', meta: count(items.length), ungrouped: false, items }];
  const groups = new Map<string, GalleryGroup>();
  const rest: GalleryItem[] = [];
  const add = (key: string, title: string, item: GalleryItem, adId?: string) => {
    const g = groups.get(key) ?? { key, title, meta: '', ungrouped: false, adId, items: [] };
    g.items.push(item);
    groups.set(key, g);
  };
  for (const it of items) {
    if (by === 'date') add(it.date, it.date, it);
    else if (by === 'ad') it.ad ? add(it.ad.id, it.ad.name, it, it.ad.id) : rest.push(it);
    else if (by === 'campaign') it.campaigns.length ? it.campaigns.forEach((c) => add(c, c, it)) : rest.push(it);
    else it.product ? add(it.product, it.product, it) : rest.push(it);
  }
  const out = [...groups.values()].map((g) => ({ ...g, meta: by === 'date' ? count(g.items.length) : `${count(g.items.length)} · last made ${g.items[0].date}` }));
  if (rest.length) out.push({ key: 'ungrouped', title: UNGROUPED_LABEL[by], meta: count(rest.length), ungrouped: true, items: rest });
  return out;
}

/** Counts for the page line and filter chips. */
export const gallerySummary = (items: GalleryItem[]) => ({
  total: items.length,
  fromAds: items.filter((i) => i.origin === 'variation').length,
  standalone: items.filter((i) => i.origin !== 'variation').length,
  shortlisted: items.filter((i) => i.shortlisted).length,
  inMeta: items.filter((i) => i.inMeta).length,
});

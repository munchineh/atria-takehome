/**
 * 262 (Mancini 17:36): Ad Library. Every ad in the account in one list: running and paused ads from Meta, and ads
 * set up in Atria that aren't running yet (duplicates with fixes, creatives linked to an ad).
 * Data and logic only.
 */
import { goalOf, type AdCopy, type Creative, type Media } from './mock';
import { adSetupOf, type AdSetup } from './adsetup';
import { ALL_CREATIVES, accountOf, findCreative, useStore, type DraftAd } from './store';

export type LibStatus = 'Running' | 'Paused' | 'Not running';

export interface LibAd {
  id: string;
  name: string;
  accountId: string;
  media: Media;
  img: string;
  copy?: AdCopy;
  status: LibStatus;
  setup: AdSetup;
  /** One line on where it came from. */
  source: string;
  sourceAdId?: string;
  recIds: string[];
  /** The generated creative it uses, when there is one (opens its creative page). */
  creativeRef?: { jobId?: string; vid?: string };
  draft?: DraftAd;
  ad?: Creative;
  date: string;
}

const isActive = (c: Creative) => (c.status ?? 'Active') === 'Active' && c.ads.some((a) => a.status !== 'Paused');

export function useLibrary(accountId?: string): LibAd[] {
  const { drafts, adEdits, accountId: current } = useStore();
  const acc = accountId ?? current;
  const fromMeta: LibAd[] = ALL_CREATIVES.filter((c) => c.accountId === acc && !c.project).map((c) => {
    const edit = adEdits[c.id];
    return {
      id: c.id,
      name: c.name,
      accountId: c.accountId,
      media: c.media,
      img: edit?.creative?.img ?? c.img,
      copy: edit?.creative?.copy ?? c.copy,
      status: isActive(c) ? 'Running' : 'Paused',
      setup: edit?.setup ?? adSetupOf(c, accountOf(c).name, goalOf(c) === 'Sales'),
      source: c.variationOf ? 'Made in Atria, running in Meta' : 'Synced from Meta',
      recIds: [],
      ad: c,
      date: 'Nov 19',
    };
  });
  const fromDrafts: LibAd[] = drafts
    .filter((d) => d.accountId === acc)
    .map((d) => {
      const src = d.sourceAdId ? findCreative(d.sourceAdId) : undefined;
      return {
        id: d.id,
        name: d.name,
        accountId: d.accountId,
        media: src?.media ?? 'Image',
        img: d.creative.img,
        copy: d.creative.copy,
        status: 'Not running',
        setup: d.setup,
        source: d.how === 'duplicate' ? `Duplicated from ${src?.name ?? 'an ad'}` : `Set up from a creative made from ${src?.name ?? 'an ad'}`,
        sourceAdId: d.sourceAdId,
        recIds: d.recIds,
        creativeRef: d.creative.jobId ? { jobId: d.creative.jobId, vid: d.creative.vid } : undefined,
        draft: d,
        date: d.date,
      };
    });
  return [...fromDrafts.reverse(), ...fromMeta];
}

import type { AdCopy } from './mock';

/** A variation is a new image made from a creative (glossary). */
export interface Variation {
  id: string;
  jobId: string;
  recId: string;
  angle: string;
  img: string;
  copy: AdCopy;
  /** G5 / RS-14: a likely typo in the rendered text. */
  typo?: string;
  /** Set when the variation itself was later launched as a creative (lineage). */
  becameCreative?: string;
}

/** Angle definitions (RS-08 tooltip lives in the UI). */
type Seed = Omit<Variation, 'id' | 'jobId' | 'recId'>;

/** Per recommendation, the angles Atria tries in order. Slots without a file show a placeholder. */
export const POOLS: Record<string, Seed[]> = {
  different: [
    { angle: 'Product detail', img: 'x01', copy: { head: 'SLOW-RISE SQUISH', cta: 'SHOP NOW' } },
    { angle: 'Comparison', img: 'x02', copy: { head: 'SOFTER THAN THE REST', cta: 'SHOP NOW', tone: 'dark' } },
    { angle: 'Demonstration', img: 'x03c', copy: { head: 'BACK IN SHAPE IN 8 SECONDDS', cta: 'TRY IT', tone: 'dark' }, typo: 'SECONDDS' },
    { angle: 'Collection', img: 'x04', copy: { head: 'EVERY FACE HAND-PAINTED', cta: 'SEE ALL MOODS', tone: 'dark' } },
  ],
  offer: [
    { angle: 'Bold offer', img: 'x05c', copy: { head: '3 FOR', price: '$36', cta: 'PICK 3' } },
    { angle: 'Price anchor', img: 'x06', copy: { head: '$14. WAS $18', cta: 'SHOP NOW' } },
    { angle: 'Bundle', img: 'x07', copy: { head: 'THE FULL MOOD SET', band: '$72 FOR ALL 8', cta: 'GET THE SET' } },
    { angle: 'Scarcity', img: 'x08', copy: { head: 'ONLY 200 SAD PINKS LEFT', cta: 'GET YOURS' } },
  ],
  stop: [
    { angle: 'Close-up', img: 'x01', copy: { head: 'SQUISH ME', cta: 'SHOP NOW' } },
    { angle: 'Bold color', img: 'x05c', copy: { head: 'ONE SAD PINK', price: '$14', cta: 'SHOP NOW' } },
    { angle: 'Demonstration', img: 'x03c', copy: { head: 'PRESS. RELEASE. RELAX.', cta: 'TRY IT', tone: 'dark' } },
    { angle: 'Comparison', img: 'x02', copy: { head: 'NOT YOUR USUAL SQUISHY', cta: 'SHOP NOW', tone: 'dark' } },
  ],
  cta: [
    { angle: 'Choice', img: 'x04', copy: { head: 'PICK YOUR MOOD', band: '3 FOR $36', cta: 'GET YOURS' } },
    { angle: 'Gift', img: 'x09', copy: { head: 'GIFT A MOOD', cta: 'SEND ONE' } },
    { angle: 'Urgency', img: 'x10', copy: { head: 'SHIPS TODAY', cta: 'ORDER BY 3 PM' } },
    { angle: 'Personal', img: 'x11', copy: { head: 'WHICH ONE ARE YOU?', cta: 'FIND OUT' } },
  ],
};

/** Extra slots for "More like this" and repeat rounds. */
const EXTRA = ['x12', 'x13', 'x14', 'x15', 'x16'];

/** used: how many variations each recommendation already produced for this creative (G9). */
export function buildVariations(jobId: string, recIds: string[], perRec: number, used: Record<string, number> = {}, like?: Variation): Variation[] {
  if (like) {
    return Array.from({ length: perRec }, (_, i) => ({
      id: `${jobId}-${i}`,
      jobId,
      recId: like.recId,
      angle: like.angle,
      img: EXTRA[i % EXTRA.length],
      copy: like.copy,
    }));
  }
  return recIds.flatMap((rid) => {
    const pool = POOLS[rid] ?? POOLS.different;
    const offset = used[rid] ?? 0;
    return Array.from({ length: perRec }, (_, i) => {
      const seed = pool[(i + offset) % pool.length];
      const repeat = i + offset >= pool.length;
      return {
        ...seed,
        // Later rounds skip angles already used (G9): repeats get a fresh slot.
        img: repeat ? EXTRA[(i + offset) % EXTRA.length] : seed.img,
        id: `${jobId}-${rid}-${i}`,
        jobId,
        recId: rid,
      };
    });
  });
}

export const ANGLE_TIP = 'The approach an ad takes to get a response, such as scarcity or social proof';

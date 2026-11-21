import type { AdCopy } from './mock';

/** A variation is a new image made from a creative (glossary). */
export interface Variation {
  id: string;
  jobId: string;
  recId: string;
  /** 258: the sample image a live image replaced, kept so a refresh can fall back to it (live images live in memory). */
  baseImg?: string;
  /** 250 (Mancini 16:20): other suggestions this one variation also answers. It shows under each of them. */
  alsoRecIds?: string[];
  angle: string;
  img: string;
  copy?: AdCopy;
  /** G5 / RS-14: a likely typo in the rendered text. */
  typo?: string;
  /** Set when the variation itself was later launched as a creative (lineage). */
  becameCreative?: string;
  /** ED-08: made by editing an older version or the prompt of another variation. */
  from?: { id: string; v: number; angle: string; how: 'version' | 'prompt' | 'stylized' };
  /** ED-09b: text generated into the image (version B). */
  stylized?: boolean;
  deleted?: boolean;
  /** Demo 1: added to an audience as a paused ad. */
  launched?: { audience: string; date: string };
}

/** One edit of a variation (ED-07). v1 is the variation as generated. */
export interface Version {
  n: number;
  img: string;
  copy?: AdCopy;
  caption: string;
  cost: number;
  state: 'applying' | 'ready';
}

/** ED-09b: base photos that have a stylized-text render (B) made for the comparison (L-020, L-026). */
export const STYLIZED: Record<string, string> = { x05c: 'x05t', x03c: 'x03t' };
/** Plan item 11: every variation can get a stylized-text version. Only some photos have a ready-made render;
 *  the rest keep their photo and mark the copy as stylized (live generation then draws the text in). */
export const stylizedRender = (...slots: string[]) => slots.map((x) => STYLIZED[x]).find(Boolean);
export const adText = (copy?: AdCopy) => (copy ? [copy.head, copy.price, copy.band, copy.cta].filter(Boolean).join(' · ') : '');
/** Stylized renders are 3:4 with text to the edges, so they are never cropped to 2:3. */
export const ratioFor = (slot: string) => (Object.values(STYLIZED).includes(slot) ? '3 / 4' : '2 / 3');

/** ED-04 chips. "Fix the text" opens the free text layer instead of spending credits. */
export const CHIPS = ['Fix the text', 'Simplify the layout', 'Make the product bigger', 'Change the background'];
/** ED-06 reasons and the change each one pre-fills. */
export const REASONS: { label: string; fill: string | null }[] = [
  { label: 'Text is wrong', fill: null },
  { label: 'Off-brand', fill: 'Use the brand colors and font' },
  { label: 'Too busy', fill: 'Simplify the layout' },
  { label: 'Wrong product image', fill: 'Use the Sad Pink product image' },
];

/** Prototype stand-in for the image model: which photo an instruction produces. */
const BIGGER: Record<string, string> = { x05c: 'e03', x05: 'e03', e01: 'e03', e02: 'e03', x03c: 'l02', x03: 'l02', x07: 'l01' };
const BACKGROUND: Record<string, string> = { x05c: 'e02', x05: 'e02', e01: 'e02', e03: 'e02', x01: 'x10', x02: 'x12', x04: 'x12' };
const NEXT: Record<string, string> = { x05c: 'e02', e02: 'e03', x05: 'e02', e01: 'e02', x03c: 'l02', x03: 'l02', x07: 'l01', x04: 'x12', x01: 'x10' };

export function applyToImage(img: string, copy: AdCopy | undefined, instruction: string): { img: string; copy?: AdCopy } {
  const t = instruction.toLowerCase();
  if (/bigger|larger|zoom|closer/.test(t)) return { img: BIGGER[img] ?? img, copy };
  if (/background|color|colour|warm|confetti/.test(t)) return { img: BACKGROUND[img] ?? NEXT[img] ?? img, copy };
  if (/simplif|busy|layout|clean/.test(t)) return { img, copy: copy && { ...copy, band: undefined } };
  if (/shorter|headline/.test(t)) return { img, copy: copy && { ...copy, head: copy.head.split(' ').slice(0, 2).join(' ') } };
  return { img: NEXT[img] ?? img, copy };
}

/** ED-10: the per-image prompt (E1: image level, below the campaign brief). */
export function promptFor(v: Pick<Variation, 'angle' | 'copy'>, product = 'Sad Pink mochi') {
  const text = v.copy ? `Headline "${[v.copy.head, v.copy.price].filter(Boolean).join(' ')}"${v.copy.cta ? `, button "${v.copy.cta}"` : ''}.` : '';
  return `${v.angle} ad for Moody Mochi ${product}. Soft pastel set, product centered and in sharp focus, studio light, 2:3 for Feed. ${text} Brand colors pink and cream, Fredoka for text.`;
}

/** ED-11: how Atria reads the image (read-only, O4). */
const EMOTION: Record<string, string> = { 'Bold offer': 'Excitement', Scarcity: 'Urgency', Urgency: 'Urgency', Gift: 'Warmth', Demonstration: 'Curiosity', Comparison: 'Confidence', 'Price anchor': 'Value', Bundle: 'Value', Choice: 'Playfulness', Personal: 'Playfulness' };
const THEME: Record<string, string> = { 'Bold offer': 'Savings', Scarcity: 'Limited edition', 'Price anchor': 'Savings', Bundle: 'Collection', Gift: 'Gifting', Demonstration: 'Stress relief', Comparison: 'Quality', Collection: 'Collection' };
export const tagsFor = (angle: string) => ({ Angle: angle, Emotion: EMOTION[angle] ?? 'Comfort', Theme: THEME[angle] ?? 'Self-care' });
export const TAG_TIPS: Record<string, string> = {
  Angle: 'The approach an ad takes to get a response, such as scarcity or social proof.',
  Emotion: 'The feeling the image is most likely to bring out.',
  Theme: 'The subject the image is about. Used to group results in analytics.',
};

/** Demo 2 (D2-01): predicted CTR grade before launch. Deterministic per variation. */
export function predictedCtr(id: string): 'A' | 'B' | 'C' {
  const h = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return (['B', 'A', 'B', 'C', 'B', 'A', 'B', 'C'] as const)[h % 8];
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
    { angle: 'Price anchor', img: 'x09', copy: { head: 'NOW', price: '$14', band: 'WAS $18', cta: 'SHOP NOW', tone: 'dark' } },
    { angle: 'Bundle', img: 'x12', copy: { head: 'THE FULL MOOD SET', band: '$72 FOR ALL 8', cta: 'GET THE SET', tone: 'dark' } },
    { angle: 'Scarcity', img: 'x07', copy: { head: 'ONLY 200 GOLD ONES', cta: 'GET YOURS' } },
  ],
  stop: [
    { angle: 'Close-up', img: 'x01', copy: { head: 'SQUISH ME', cta: 'SHOP NOW' } },
    { angle: 'Bold color', img: 'x05c', copy: { head: 'ONE SAD PINK', price: '$14', cta: 'SHOP NOW' } },
    { angle: 'Demonstration', img: 'x03c', copy: { head: 'PRESS. RELEASE. RELAX.', cta: 'TRY IT', tone: 'dark' } },
    { angle: 'Comparison', img: 'x02', copy: { head: 'NOT YOUR USUAL SQUISHY', cta: 'SHOP NOW', tone: 'dark' } },
  ],
  cta: [
    { angle: 'Choice', img: 'x04', copy: { head: 'PICK YOUR MOOD', band: '3 FOR $36', cta: 'GET YOURS' } },
    { angle: 'Gift', img: 'x08', copy: { head: 'GIFT A MOOD', cta: 'SEND ONE', tone: 'dark' } },
    { angle: 'Urgency', img: 'x06', copy: { head: 'SHIPS TODAY', cta: 'ORDER BY 3 PM', tone: 'dark' } },
    { angle: 'Personal', img: 'x11', copy: { head: 'WHICH ONE ARE YOU?', cta: 'FIND OUT', tone: 'dark' } },
  ],
};

/** Photos for repeat rounds once a pool's angles are used up (all generated, so no placeholders). */
const EXTRA = ['x10', 'x12', 'x09', 'x06', 'x02'];
/** "More like this" keeps the scene: direct children where we have them (l01 from x07, l02 from x03), else repeat photos. */
const CHILDREN: Record<string, string[]> = { x07: ['l01'], x03: ['l02'], x03c: ['l02'] };

/** used: how many variations each recommendation already produced for this creative (G9). */
export function buildVariations(jobId: string, recIds: string[], perRec: number, used: Record<string, number> = {}, like?: Variation): Variation[] {
  if (like) {
    return Array.from({ length: perRec }, (_, i) => ({
      id: `${jobId}-${i}`,
      jobId,
      recId: like.recId,
      angle: like.angle,
      img: [...(CHILDREN[like.img] ?? []), ...EXTRA][i % ((CHILDREN[like.img]?.length ?? 0) + EXTRA.length)],
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
        // 250: in a round with two or more suggestions, the first option of the first one answers them all at once.
        ...(recIds.length > 1 && rid === recIds[0] && i === 0 ? { alsoRecIds: recIds.slice(1) } : {}),
      };
    });
  });
}

/** 250: every suggestion a variation answers, its main one first. */
export const recIdsOf = (v: Pick<Variation, 'recId' | 'alsoRecIds'>) => [v.recId, ...(v.alsoRecIds ?? [])];
export const answers = (v: Pick<Variation, 'recId' | 'alsoRecIds'>, rid: string) => recIdsOf(v).includes(rid);

/** One definition of "angle" for every surface (R-E8). */
export const ANGLE_TIP = TAG_TIPS.Angle;

/** 5d OG-13: Atria gives every generated image a one-line reason; ours showed the angle only. */
export const ANGLE_REASON: Record<string, string> = {
  'Product detail': 'Shows the slow-rise texture up close, so people can almost feel the squish.',
  Comparison: 'Says in one line why it beats other squishies.',
  Demonstration: 'Shows the toy in use, so the benefit is obvious at a glance.',
  Collection: 'Shows the whole range, so people pick a favorite.',
  'Bold offer': 'Puts one clear price up front for buyers on the fence.',
  'Price anchor': 'Shows the old price beside the new one, so the deal reads at a glance.',
  Bundle: 'Makes buying the full set the easy choice.',
  Scarcity: 'A limited edition gives a reason to buy now.',
  'Close-up': 'A tight crop that stops the scroll.',
  'Bold color': 'One strong color that stands out in the feed.',
  Choice: 'Lets people pick their mood. The offer sits in the band.',
  Gift: 'Frames it as a small gift for someone else.',
  Urgency: 'Same-day shipping gives a reason to order today.',
  Personal: 'A question that invites people to see themselves in it.',
};

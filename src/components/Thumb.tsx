import { motion } from 'motion/react';
import { CaretRightFilled, AppstoreFilled } from '@ant-design/icons';
import type { AdCopy, Creative as CreativeT } from '../data/mock';

/**
 * Moody Mochi photos (fictional brand, Mancini's own images), keyed by slot
 * prefix: src/assets/ads/r01.webp. Run scripts/prep_ads.py to add more.
 * Missing slots render a soft placeholder so nothing breaks before Friday.
 */
const FILES = import.meta.glob('../assets/ads/*.{webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
// Photos (.webp) and drawn product art (.svg, scripts/draw_products.py). When a slot has both, the photo wins.
const BY_SLOT: Record<string, string> = {};
for (const [k, v] of Object.entries(FILES).sort(([a], [b]) => (a.endsWith('.webp') ? 1 : 0) - (b.endsWith('.webp') ? 1 : 0))) BY_SLOT[k.split('/').pop()!.replace(/\.(webp|svg)$/, '')] = v;
export const adImage = (slot: string) => BY_SLOT[slot];

const PASTELS = ['#f9d3df', '#dcebc6', '#f8ecc9', '#d6e4f3', '#e3d9f1', '#fbdcc7'];
const pastel = (slot: string) => PASTELS[[...slot].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PASTELS.length];

function Photo({ slot, alt }: { slot: string; alt: string }) {
  const src = adImage(slot);
  if (src) return <img className="ad-photo" src={src} alt={alt} loading="lazy" decoding="async" draggable={false} />;
  return (
    <span className="ad-photo ad-placeholder" style={{ background: pastel(slot) }} role="img" aria-label={alt}>
      <i className="mochi-blob" />
    </span>
  );
}

/** Copy drawn over the photo. Sizes use container units, so it scales from card to detail. */
export function Overlay({ copy, typo }: { copy?: AdCopy; typo?: string }) {
  if (!copy) return null;
  const head = typo ? copy.head.split(typo) : [copy.head];
  return (
    <span className={`ad-copy ${copy.tone === 'dark' ? 'dark' : ''}`} aria-hidden>
      <b className={`ad-head ${copy.head.length > 16 ? 'long' : ''}`}>
        {typo ? (
          <>
            {head[0]}
            <span className="typo">{typo}</span>
            {head[1]}
          </>
        ) : (
          copy.head
        )}
      </b>
      {copy.price && <b className="ad-price">{copy.price}</b>}
      {copy.band && <span className="ad-band">{copy.band}</span>}
      {copy.cta && <span className="ad-cta">{copy.cta}</span>}
    </span>
  );
}

/** Small square thumbnail for rows and lists. No copy at this size. */
export function Thumb({ c, size = 40, layoutId }: { c: Pick<CreativeT, 'img' | 'media' | 'name'>; size?: number; layoutId?: string }) {
  return (
    <motion.div layoutId={layoutId} className="thumb" style={{ width: size, height: size }}>
      <Photo slot={c.img} alt={c.name} />
      {c.media === 'Video' && <CaretRightFilled className="thumb-badge" />}
      {c.media === 'Carousel' && <AppstoreFilled className="thumb-badge" />}
    </motion.div>
  );
}

/** Large creative for the ad detail and results pages. */
export function AdArt({
  slot,
  copy,
  media = 'Image',
  ratio = '1 / 1',
  layoutId,
  alt,
  typo,
}: {
  slot: string;
  copy?: AdCopy;
  media?: CreativeT['media'];
  ratio?: string;
  layoutId?: string;
  alt: string;
  typo?: string;
}) {
  return (
    <motion.div layoutId={layoutId} className="ad-art" style={{ aspectRatio: ratio }}>
      <Photo slot={slot} alt={alt} />
      <Overlay copy={copy} typo={typo} />
      {media === 'Video' && (
        <span className="play">
          <CaretRightFilled />
        </span>
      )}
    </motion.div>
  );
}

export function Creative({ c, layoutId }: { c: CreativeT; layoutId?: string }) {
  return <AdArt slot={c.img} copy={c.copy} media={c.media} layoutId={layoutId} alt={c.name} ratio={c.img.startsWith('x') ? '3 / 4' : '1 / 1'} />;
}

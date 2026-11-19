import { motion } from 'motion/react';
import type { Creative } from '../data/mock';

/** Stand-in creatives drawn in CSS so no client artwork is copied. */
export function Thumb({ kind, size = 40, layoutId }: { kind: Creative['thumb']; size?: number; layoutId?: string }) {
  return (
    <motion.div layoutId={layoutId} className={`thumb thumb-${kind}`} style={{ width: size, height: size, fontSize: size / 4.5 }}>
      <ThumbArt kind={kind} />
    </motion.div>
  );
}

function ThumbArt({ kind }: { kind: Creative['thumb'] }) {
  if (kind === 'tiktok') return <span className="thumb-glyph">♪</span>;
  if (kind === 'fem') return <span className="thumb-glyph">▶</span>;
  const headline = kind === 'variation' ? 'CLAIM 40% OFF' : kind === 'deal' ? 'BIG DEAL' : '';
  return (
    <>
      {headline && <span className="thumb-head">{headline}</span>}
      <span className="thumb-bottles">
        <i />
        <i />
        <i />
      </span>
      {(kind === 'deal' || kind === 'variation') && <span className="thumb-band">SAVE 40%</span>}
    </>
  );
}

/** Large version for the ad detail page. */
export function Creative({ kind, layoutId }: { kind: Creative['thumb']; layoutId?: string }) {
  const variation = kind === 'variation';
  return (
    <motion.div layoutId={layoutId} className="creative" style={{ borderRadius: 8 }}>
      <div className="creative-head">
        <b>{variation ? 'CLAIM YOUR' : 'THIS DEAL IS'}</b>
        <b className="accent">{variation ? '40% OFF' : 'INSANE'}</b>
      </div>
      <div className="creative-bottles">
        <i />
        <i />
        <i />
      </div>
      <div className="creative-band">
        <b>{variation ? 'SHOP NOW' : 'SAVE 40% TODAY'}</b>
      </div>
      <div className="creative-foot">
        <span className="seal">60-day guarantee</span>
        <b>{variation ? 'START TODAY' : 'CLICK HERE AND SAVE'}</b>
      </div>
    </motion.div>
  );
}

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DislikeFilled, DislikeOutlined, LikeFilled, LikeOutlined } from './AppIcons';
import { duration, ease } from '../motion/tokens';

/**
 * One compact rating for suggestions and results (Mancini 10:51): a short question and a two-part pill.
 * Picking a side tints that half and swaps the question for "Thanks"; picking again clears it.
 */
export function Rating({ question, onRate }: { question: string; onRate?: (v: 'up' | 'down' | null) => void }) {
  const [v, setV] = useState<'up' | 'down' | null>(null);
  const pick = (x: 'up' | 'down') => {
    const next = v === x ? null : x;
    setV(next);
    onRate?.(next);
  };
  return (
    <div className="rating" role="group" aria-label={question} onClick={(e) => e.stopPropagation()}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={v ? 'thanks' : 'q'}
          className="rating-q"
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0, transition: { duration: duration.fast, ease: ease.standard } }}
          exit={{ opacity: 0, y: -3, transition: { duration: duration.instant } }}
        >
          {v ? 'Thanks for the feedback' : question}
        </motion.span>
      </AnimatePresence>
      <span className="rating-pill">
        <button type="button" className={`rating-btn up ${v === 'up' ? 'on' : ''}`} aria-pressed={v === 'up'} aria-label="Yes" title="Yes" onClick={() => pick('up')}>
          {v === 'up' ? <LikeFilled /> : <LikeOutlined />}
        </button>
        <i className="rating-div" aria-hidden />
        <button type="button" className={`rating-btn down ${v === 'down' ? 'on' : ''}`} aria-pressed={v === 'down'} aria-label="No" title="No" onClick={() => pick('down')}>
          {v === 'down' ? <DislikeFilled /> : <DislikeOutlined />}
        </button>
      </span>
    </div>
  );
}

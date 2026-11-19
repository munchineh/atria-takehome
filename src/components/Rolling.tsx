import { AnimatePresence, motion } from 'motion/react';
import { duration, ease } from '../motion/tokens';

/** Number that slides when it changes (sticky bar, dialog footer, shortlist bar). */
export function Rolling({ value }: { value: string | number }) {
  return (
    <span className="rolling">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}
          exit={{ opacity: 0, transition: { duration: duration.instant } }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

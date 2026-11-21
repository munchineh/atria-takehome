import type { ReactNode } from 'react';
import { Button, Checkbox } from 'antd';
import { AnimatePresence, motion } from 'motion/react';
import { spring, duration, ease } from '../motion/tokens';

/**
 * 274 (Mancini 19:08): bulk select for Ad Library and Creative Gallery. While selecting, a dark bar at the bottom
 * (the same bar as Radar's) says how many are picked, selects or clears them all, and holds the actions.
 */
export function BulkBar({
  open,
  count,
  total,
  onAll,
  onCancel,
  children,
}: {
  open: boolean;
  count: number;
  total: number;
  onAll: (on: boolean) => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const all = total > 0 && count === total;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sticky-bar bulk-bar"
          role="toolbar"
          aria-label="Selected items"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: spring.gentle }}
          exit={{ y: 24, opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
        >
          <div className="bulk-left">
            <Checkbox checked={all} indeterminate={count > 0 && !all} onChange={(e) => onAll(e.target.checked)} aria-label={all ? 'Clear selection' : 'Select all'} />
            <b>{count} selected</b>
          </div>
          <div className="bulk-actions">
            {children}
            <Button onClick={onCancel}>Cancel</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

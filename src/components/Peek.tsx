import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { duration, ease } from '../motion/tokens';

/**
 * Long press to preview (Mancini 13:23): on phones and tablets there's no hover, so pressing and holding
 * a creative shows it large until you let go. A tap still does what it always did. Mouse input is ignored.
 */
export function Peek({ preview, title, sub, children, className }: { preview: ReactNode; title: string; sub?: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  const close = () => {
    cancel();
    setOpen(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      className={`peekable ${className ?? ''}`}
      onContextMenu={(e) => {
        if (fired.current || open) e.preventDefault();
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          fired.current = true;
          setOpen(true);
          navigator.vibrate?.(10);
        }, 400);
      }}
      onPointerMove={(e) => {
        if (start.current && !fired.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancel();
      }}
      onPointerUp={close}
      onPointerCancel={close}
      // A long press ends in a click on some browsers. Swallow that one so the preview doesn't also navigate.
      onClickCapture={(e) => {
        if (fired.current) {
          e.preventDefault();
          e.stopPropagation();
          fired.current = false;
        }
      }}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="peek"
              className="peek-scrim"
              role="dialog"
              aria-label={`Preview of ${title}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}
              exit={{ opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
            >
              <motion.div
                className="peek-card"
                initial={{ scale: 0.92 }}
                animate={{ scale: 1, transition: { duration: duration.base, ease: ease.standard } }}
                exit={{ scale: 0.96, transition: { duration: duration.fast, ease: ease.exit } }}
              >
                <div className="peek-media">{preview}</div>
                <div className="peek-text">
                  <b className="peek-title">{title}</b>
                  {sub && <span className="peek-sub">{sub}</span>}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}

import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { duration, ease } from '../motion/tokens';

const KEY = 'atria.teach.variations-moved';
const read = () => {
  try {
    return localStorage.getItem(KEY) === 'dismissed';
  } catch {
    return false;
  }
};
const write = () => {
  try {
    localStorage.setItem(KEY, 'dismissed');
  } catch {
    /* storage can be unavailable; the card just shows again next time */
  }
};

/**
 * 6b. One card, triggered by arriving where the old habit lived (Creation › Image ads).
 * Never blocks, permanent dismiss, not a tour. ?teach=1 brings it back for demos.
 */
export function TeachingCard() {
  const [params] = useSearchParams();
  const [gone, setGone] = useState(read);
  const nav = useNavigate();
  useEffect(() => {
    if (params.get('teach') === '1') {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      setGone(false);
    }
  }, [params]);
  const dismiss = () => {
    write();
    setGone(true);
  };

  return (
    <AnimatePresence>
      {!gone && (
        <motion.aside
          className="teach-card"
          role="status"
          aria-label="Variations have moved to their ad"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: duration.base, ease: ease.standard, delay: 0.6 } }}
          exit={{ opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
        >
          <button className="teach-x" onClick={dismiss} aria-label="Dismiss">
            <CloseOutlined />
          </button>
          {/* Looping mini demo: Radar row → the ad → its variations. CSS only. */}
          <div className="teach-demo" aria-hidden>
            <div className="td-frame td-radar">
              <i className="td-row" />
              <i className="td-row hot">
                <b />
                <span className="td-chip" />
              </i>
              <i className="td-row" />
              <span className="td-cursor" />
            </div>
            <div className="td-frame td-ad">
              <b className="td-img" />
              <span className="td-lines">
                <i />
                <i />
                <i className="td-btn" />
              </span>
            </div>
            <div className="td-frame td-vars">
              {Array.from({ length: 6 }, (_, i) => (
                <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          </div>
          <div className="teach-text">
            <b>Variations have moved to their ad</b>
            <span>Open an ad in Radar to see everything made from it.</span>
          </div>
          <div className="teach-actions">
            <Button type="primary" size="small" onClick={() => nav('/')}>
              Open Radar
            </Button>
            <Button size="small" onClick={dismiss}>
              Dismiss
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

import { Tag, Tooltip } from 'antd';
import { CopyOutlined, FormOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import type { GalleryItem } from '../../data/gallery';
import { AdArt } from '../Thumb';
import { MadeFromIcon } from '../Icons';
import { duration, ease, listDelay } from '../../motion/tokens';

/**
 * Creative gallery card (DL-15): the unit is a single creative image, not an ad.
 * Opens the editor inside Creation (`item.to`); source ad is shown as a neutral chip.
 */
export function GalleryCard({
  item,
  index,
  onOpen,
  onToggleShortlist,
}: {
  item: GalleryItem;
  index: number;
  onOpen: (to: string) => void;
  onToggleShortlist: (id: string) => void;
}) {
  const sourceChip = item.ad ? (
    <Tooltip title={`Made from ${item.ad.name}.`} mouseEnterDelay={0.5}>
      <Tag className="gal-source" icon={<MadeFromIcon />}>
        <span className="ellipsis">{item.ad.name}</span>
      </Tag>
    </Tooltip>
  ) : item.origin === 'cloned' ? (
    <Tag className="gal-source" icon={<CopyOutlined />}>
      Clone
    </Tag>
  ) : (
    <Tag className="gal-source" icon={<FormOutlined />}>
      From a brief
    </Tag>
  );

  return (
    <motion.article
      className={`gal-card ${item.shortlisted ? 'is-shortlisted' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(index) } }}
    >
      <div className="gal-media">
        <button
          type="button"
          className="gal-art-btn"
          onClick={() => onOpen(item.to)}
          aria-label={`Open ${item.name} in the editor`}
        >
          <AdArt slot={item.img} copy={item.copy} ratio="2 / 3" alt={`${item.name} creative`} />
        </button>
      </div>

      <div
        className="gal-body"
        role="link"
        tabIndex={0}
        onClick={() => onOpen(item.to)}
        onKeyDown={(e) => e.key === 'Enter' && onOpen(item.to)}
      >
        <div className="gal-title-row">
          <div className="gal-title-stack">
            <strong className="gal-name">{item.name}</strong>
            <span className="gal-date">
              {item.date}
              {item.versions > 1 ? `\u00A0·\u00A0v${item.versions}` : ''}
            </span>
          </div>

          {/* R-A4 & Section 9: state-aware shortlist toggle kept off the ad art so headlines stay unobstructed. */}
          <Tooltip title={item.shortlisted ? 'Remove from shortlist.' : 'Add to shortlist.'}>
            <button
              type="button"
              className={`gal-star-btn ${item.shortlisted ? 'on' : ''}`}
              aria-pressed={item.shortlisted}
              aria-label={item.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleShortlist(item.id);
              }}
            >
              {item.shortlisted ? <StarFilled /> : <StarOutlined />}
            </button>
          </Tooltip>
        </div>

        <div className="gal-chips">
          {sourceChip}
          {item.inMeta && <Tag className="gal-state">Paused in Meta</Tag>}
          {item.stylized && <Tag className="gal-state">Stylized</Tag>}
        </div>
      </div>
    </motion.article>
  );
}

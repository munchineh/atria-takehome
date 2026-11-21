import { Dropdown, Tag, Tooltip } from 'antd';
import { ArchiveOutlined, ArchiveRestoreOutlined, CopyOutlined, EllipsisOutlined, FormOutlined, LockOutlined } from '../AppIcons';
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
  onArchive,
}: {
  item: GalleryItem;
  index: number;
  onOpen: (to: string) => void;
  onArchive: (id: string, on: boolean) => void;
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
      className={`gal-card ${item.archived ? 'is-archived' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(index) } }}
    >
      <div className="gal-media">
        <button
          type="button"
          className="gal-art-btn"
          onClick={() => onOpen(item.to)}
          aria-label={`Open ${item.name}`}
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
              {item.versions > 1 ? `\u00A0·\u00A0${item.versions} versions` : ''}
            </span>
          </div>

          {/* Mancini 11:00: everything here is saved, so the star is gone. Archive lives in the card menu. */}
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                item.archived
                  ? { key: 'unarchive', icon: <ArchiveRestoreOutlined />, label: 'Restore to gallery', onClick: (e) => (e.domEvent.stopPropagation(), onArchive(item.id, false)) }
                  : { key: 'archive', icon: <ArchiveOutlined />, label: 'Archive', onClick: (e) => (e.domEvent.stopPropagation(), onArchive(item.id, true)) },
              ],
            }}
          >
            <button type="button" className="gal-star-btn" aria-label={`More actions for ${item.name}`} onClick={(e) => e.stopPropagation()}>
              <EllipsisOutlined />
            </button>
          </Dropdown>
        </div>

        <div className="gal-chips">
          {sourceChip}
          {item.inMeta && (
            <Tooltip title="In an ad, so it can't be edited. Open it to iterate.">
              <Tag className="gal-state gal-locked" icon={<LockOutlined />}>
                In an ad
              </Tag>
            </Tooltip>
          )}
          {item.archived && <Tag className="gal-state">Archived</Tag>}
          {item.stylized && <Tag className="gal-state">Stylized</Tag>}
        </div>
      </div>
    </motion.article>
  );
}

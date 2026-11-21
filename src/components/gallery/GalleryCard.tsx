import { Button, Checkbox, Dropdown, Tag, Tooltip } from 'antd';
import { ArchiveOutlined, ArchiveRestoreOutlined, CopyOutlined, EllipsisOutlined, FormOutlined, LockOutlined, UploadOutlined } from '../AppIcons';
import { motion } from 'motion/react';
import type { GalleryItem } from '../../data/gallery';
import { AdArt } from '../Thumb';
import { Peek } from '../Peek';
import { MadeFromIcon } from '../Icons';
import { duration, ease, listDelay } from '../../motion/tokens';

/**
 * Creative Gallery card (DL-15, S-06, S-14, S-15, S-23, S-46, S-86):
 * One creative image per card. Omits facts already stated by the active group or origin tab (S-46).
 */
export function GalleryCard({
  item,
  index,
  hideDate = false,
  hideAd = false,
  hideOrigin = false,
  onOpen,
  onArchive,
  selecting = false,
  selected = false,
  onToggle,
}: {
  item: GalleryItem;
  index: number;
  hideDate?: boolean;
  hideAd?: boolean;
  hideOrigin?: boolean;
  onOpen: (to: string) => void;
  onArchive: (id: string, on: boolean) => void;
  /** 274: in select mode a tap picks the card instead of opening it. */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const open = (to: string) => (selecting ? onToggle?.() : onOpen(to));
  const metaParts: string[] = [];
  if (!hideDate) metaParts.push(item.date);
  if (item.versions > 1) metaParts.push(`${item.versions}\u00a0versions`);
  const metaText = metaParts.join('\u00a0· ');

  const sourceLine = item.source === 'uploaded' ? (
    hideOrigin ? null : (
      <span className="gal-source">
        <UploadOutlined />
        <span>Uploaded</span>
      </span>
    )
  ) : item.variantOf ? (
    // 263: a creative saved as a new variation of another names that one.
    <Tooltip title={`Saved as a new variation of ${item.variantOf.name}`} mouseEnterDelay={0.5}>
      <span className="gal-source">
        <CopyOutlined />
        <span className="ellipsis">Variation of {item.variantOf.name}</span>
      </span>
    </Tooltip>
  ) : item.ad ? (
    hideAd ? null : (
      <Tooltip title={`Generated from the ad ${item.ad.name}`} mouseEnterDelay={0.5}>
        <span className="gal-source">
          <MadeFromIcon />
          <span className="ellipsis">From {item.ad.name}</span>
        </span>
      </Tooltip>
    )
  ) : hideOrigin ? null : item.origin === 'cloned' ? (
    <span className="gal-source">
      <CopyOutlined />
      <span>From an ad you like</span>
    </span>
  ) : (
    <span className="gal-source">
      <FormOutlined />
      <span>AI playground</span>
    </span>
  );

  const hasTags = item.inMeta || item.archived || item.stylized;

  return (
    <motion.article
      className={`gal-card ${item.archived ? 'is-archived' : ''} ${selecting ? 'is-selecting' : ''} ${selected ? 'is-selected' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(index) } }}
    >
      <div className="gal-media">
        {selecting && <Checkbox className="gal-check" checked={selected} onChange={() => onToggle?.()} aria-label={`Select ${item.name}`} />}
        <button
          type="button"
          className="gal-art-btn"
          onClick={() => open(item.to)}
          aria-label={`Open ${item.name}`}
        >
          <Peek preview={<AdArt slot={item.img} copy={item.copy} ratio="2 / 3" alt="" />} title={item.name}>
            <AdArt slot={item.img} copy={item.copy} ratio="2 / 3" alt={`${item.name} creative`} />
          </Peek>
        </button>
      </div>

      <div
        className="gal-body"
        role="link"
        tabIndex={0}
        onClick={() => open(item.to)}
        onKeyDown={(e) => e.key === 'Enter' && open(item.to)}
      >
        <div className="gal-title-row">
          <div className="gal-title-stack">
            <strong className="gal-name">{item.name}</strong>
            {metaText && <span className="gal-meta">{metaText}</span>}
          </div>

          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                item.archived
                  ? {
                      key: 'unarchive',
                      icon: <ArchiveRestoreOutlined />,
                      label: 'Restore to gallery',
                      onClick: (e) => {
                        e.domEvent.stopPropagation();
                        onArchive(item.id, false);
                      },
                    }
                  : {
                      key: 'archive',
                      icon: <ArchiveOutlined />,
                      label: 'Archive',
                      onClick: (e) => {
                        e.domEvent.stopPropagation();
                        onArchive(item.id, true);
                      },
                    },
              ],
            }}
          >
              <Button
                className="gal-more-btn"
                icon={<EllipsisOutlined />}
                aria-label={`More actions for ${item.name}`}
                onClick={(e) => e.stopPropagation()}
              />
          </Dropdown>
        </div>

        {(sourceLine || hasTags) && (
          <div className="gal-foot">
            {sourceLine}
            {hasTags && (
              <div className="gal-tags">
                {item.inMeta && (
                  <Tooltip title="It runs in an ad, so it can't get a new version. You can still make a new variation.">
                    <Tag color="blue" className="gal-tag" icon={<LockOutlined />}>
                      In an ad
                    </Tag>
                  </Tooltip>
                )}
                {item.archived && <Tag className="gal-tag">Archived</Tag>}
                {item.stylized && <Tag className="gal-tag">Stylized</Tag>}
              </div>
            )}
          </div>
        )}
      </div>
      {/* 263 (Mancini 17:36): two actions on every card. */}
      {!selecting && (
      <div className="gal-actions">
        <Button onClick={() => onOpen(item.to)}>
          View
        </Button>
        <Button onClick={() => onOpen(item.linkTo)}>
          Link to Ad
        </Button>
      </div>
      )}
    </motion.article>
  );
}

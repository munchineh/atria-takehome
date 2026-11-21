import { Button, Dropdown, Tag, Tooltip } from 'antd';
import { ArchiveOutlined, ArchiveRestoreOutlined, CopyOutlined, EllipsisOutlined, FormOutlined, LockOutlined } from '../AppIcons';
import { motion } from 'motion/react';
import type { GalleryItem } from '../../data/gallery';
import { AdArt } from '../Thumb';
import { Peek } from '../Peek';
import { MadeFromIcon } from '../Icons';
import { duration, ease, listDelay } from '../../motion/tokens';

/**
 * Creative gallery card (DL-15, S-06, S-14, S-15, S-23, S-46, S-86):
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
}: {
  item: GalleryItem;
  index: number;
  hideDate?: boolean;
  hideAd?: boolean;
  hideOrigin?: boolean;
  onOpen: (to: string) => void;
  onArchive: (id: string, on: boolean) => void;
}) {
  const metaParts: string[] = [];
  if (!hideDate) metaParts.push(item.date);
  if (item.versions > 1) metaParts.push(`${item.versions}\u00a0versions`);
  const metaText = metaParts.join('\u00a0· ');

  const sourceLine = item.ad ? (
    hideAd ? null : (
      <Tooltip title={`Made from ${item.ad.name}.`} mouseEnterDelay={0.5}>
        <span className="gal-source">
          <MadeFromIcon />
          <span className="ellipsis">{item.ad.name}</span>
        </span>
      </Tooltip>
    )
  ) : hideOrigin ? null : item.origin === 'cloned' ? (
    <span className="gal-source">
      <CopyOutlined />
      <span>Clone</span>
    </span>
  ) : (
    <span className="gal-source">
      <FormOutlined />
      <span>From a brief</span>
    </span>
  );

  const hasTags = item.inMeta || item.archived || item.stylized;

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
          <Peek preview={<AdArt slot={item.img} copy={item.copy} ratio="2 / 3" alt="" />} title={item.name}>
            <AdArt slot={item.img} copy={item.copy} ratio="2 / 3" alt={`${item.name} creative`} />
          </Peek>
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
                  <Tooltip title="In an ad, so it can't be edited. Open it to iterate.">
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
    </motion.article>
  );
}

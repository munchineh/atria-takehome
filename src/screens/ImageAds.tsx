import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Progress, Typography } from 'antd';
import { BarChartOutlined, PlusOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import { plural } from '../data/mock';
import { findCreative, useStore } from '../data/store';
import { galleryItems, gallerySummary, groupGallery, type GroupBy } from '../data/gallery';
import { PopSheet } from '../components/PopSheet';
import { TeachingCard } from '../components/TeachingCard';
import { Thumb } from '../components/Thumb';
import { timeLeft } from '../components/TasksPanel';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { GalleryToolbar, type GalleryFilters } from '../components/gallery/GalleryToolbar';
import { NewCreativeModal } from '../components/gallery/NewCreativeModal';
import { pageTransition } from '../motion/tokens';

const PICKS_KEY = 'atria.gallery.picks.v1';

function loadPicks(fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const HOW = (
  <div className="grade-pop">
    <p>Every creative you make in Atria is kept here, whether it came from an ad, a clone, or a brief from scratch.</p>
    <p>Select any creative to refine it in the editor, or group the grid by ad, campaign, or&nbsp;origin.</p>
  </div>
);

/**
 * Creative gallery (DL-14, DL-15, DL-16):
 * The unit is a single creative image, newest first, with optional grouping and "New creative" creation flow.
 */
export function ImageAds() {
  const nav = useNavigate();
  const { jobs, accountId, versionsOf } = useStore();

  const [filters, setFilters] = useState<GalleryFilters>({
    accountId,
    origin: 'all',
    campaign: 'all',
    shortlistedOnly: false,
  });
  useEffect(() => {
    setFilters((f) => ({ ...f, accountId, campaign: 'all' }));
  }, [accountId]);

  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [newOpen, setNewOpen] = useState(false);

  // Seed 2 realistic shortlisted creatives on first visit so the Shortlisted filter works immediately.
  const baseItems = useMemo(() => galleryItems(jobs, findCreative, [], versionsOf), [jobs, versionsOf]);
  const [picks, setPicks] = useState<string[]>(() =>
    loadPicks(baseItems.filter((x) => x.accountId === accountId).slice(0, 2).map((x) => x.id)),
  );
  const togglePick = (id: string) => {
    setPicks((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(PICKS_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const allItems = useMemo(() => galleryItems(jobs, findCreative, picks, versionsOf), [jobs, picks, versionsOf]);

  const accountScoped = useMemo(
    () => (filters.accountId === 'all' ? allItems : allItems.filter((i) => i.accountId === filters.accountId)),
    [allItems, filters.accountId],
  );

  const campaigns = useMemo(
    () => [...new Set(accountScoped.flatMap((i) => i.campaigns))],
    [accountScoped],
  );

  const filtered = useMemo(
    () =>
      accountScoped.filter(
        (i) =>
          (filters.origin === 'all' || i.origin === filters.origin) &&
          (filters.campaign === 'all' || i.campaigns.includes(filters.campaign)) &&
          (!filters.shortlistedOnly || i.shortlisted),
      ),
    [accountScoped, filters],
  );

  const groups = useMemo(() => groupGallery(filtered, groupBy), [filtered, groupBy]);
  const summary = useMemo(() => gallerySummary(filtered), [filtered]);
  const accountShortlisted = useMemo(() => gallerySummary(accountScoped).shortlisted, [accountScoped]);

  const activeJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (j.state !== 'generating' && j.state !== 'queued') return false;
        const c = findCreative(j.creativeId);
        return c && (filters.accountId === 'all' || c.accountId === filters.accountId);
      }),
    [jobs, filters.accountId],
  );

  const clearFilters = () =>
    setFilters({
      accountId,
      origin: 'all',
      campaign: 'all',
      shortlistedOnly: false,
    });

  const hasFilters =
    filters.accountId !== accountId ||
    filters.origin !== 'all' ||
    filters.campaign !== 'all' ||
    filters.shortlistedOnly;

  const metaParts = [plural(summary.total, 'creative')];
  if (summary.fromAds > 0 && summary.standalone > 0) {
    metaParts.push(`${summary.fromAds} from ads`, `${summary.standalone} standalone`);
  }

  return (
    <motion.div {...pageTransition} className="page image-ads">
      <div className="page-head gal-head">
        <div className="gal-head-text">
          <Typography.Title level={1} className="page-title">
            Creative gallery
          </Typography.Title>
          <p className="muted desc">Every creative you've made in Atria, ready to refine or use in an ad.</p>
          <p className="t-help pl-meta">{metaParts.join('\u00a0· ')}</p>
        </div>
        <div className="gal-head-actions">
          <PopSheet content={HOW} title="How the gallery works" trigger="click" placement="bottomRight">
            <Button type="link" className="inline-link">
              How the gallery works
            </Button>
          </PopSheet>
          {/* DL-15 & DL-16: gallery's primary action, "New creative". */}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>
            New creative
          </Button>
        </div>
      </div>

      <GalleryToolbar
        filters={filters}
        onChangeFilters={setFilters}
        onClearFilters={clearFilters}
        groupBy={groupBy}
        onChangeGroupBy={setGroupBy}
        campaigns={campaigns}
        shortlistedCount={accountShortlisted}
        defaultAccountId={accountId}
      />

      {/* DL-13 & E4: inline teaching card above the grid so nothing is covered on desktop or phones. */}
      <TeachingCard />

      {/* Live generating strip for rounds currently in flight (including newly created standalone creatives). */}
      {activeJobs.length > 0 && (
        <div className="gal-live-list" aria-live="polite">
          {activeJobs.map((j) => {
            const src = findCreative(j.creativeId);
            if (!src) return null;
            return (
              <div key={j.id} className="panel gal-live-row">
                <Thumb c={src} size={40} />
                <div className="gal-live-body">
                  <div className="gal-live-head">
                    <b>{src.name}</b>
                    <span className="small muted">
                      {j.state === 'queued'
                        ? `Queued\u00a0· ${plural(j.count, 'creative')}`
                        : `Generating ${plural(j.count, 'creative')}\u00a0· ${timeLeft(j.progress)}`}
                    </span>
                  </div>
                  <Progress percent={Math.round(j.progress * 100)} showInfo={false} size="small" strokeColor="#f66c30" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="gal-empty">
          {hasFilters ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <>
                  <b>No creatives match these filters</b>
                  <br />
                  Clear a filter to see every creative in this account.
                </>
              }
            >
              <Button onClick={clearFilters}>Clear filters</Button>
            </Empty>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <>
                  <b>No creatives yet</b>
                  <br />
                  Create from a brief, a reference, or an existing ad.
                </>
              }
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>
                New creative
              </Button>
            </Empty>
          )}
        </div>
      ) : groupBy === 'none' ? (
        <div className="gal-grid">
          {filtered.map((item, i) => (
            <GalleryCard
              key={item.id}
              item={item}
              index={i}
              onOpen={(to) => nav(to)}
              onToggleShortlist={togglePick}
            />
          ))}
        </div>
      ) : (
        <div className="gal-groups">
          {groups.map((group) => (
            <section key={group.key} className={`gal-group ${group.ungrouped ? 'is-ungrouped' : ''}`}>
              <div className="gal-group-head">
                <div className="gal-group-title-wrap">
                  <h2 className="gal-group-title">{group.title}</h2>
                  <span className="t-help gal-group-meta">{group.meta}</span>
                </div>
                {group.adId && (
                  <Button
                    type="link"
                    size="small"
                    className="inline-link"
                    icon={<BarChartOutlined />}
                    onClick={() => nav(`/ad/${group.adId}`)}
                  >
                    View in Radar
                  </Button>
                )}
              </div>
              <div className="gal-grid">
                {group.items.map((item, i) => (
                  <GalleryCard
                    key={item.id}
                    item={item}
                    index={i}
                    onOpen={(to) => nav(to)}
                    onToggleShortlist={togglePick}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <NewCreativeModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          // Stay in the gallery so the user watches the new creatives arrive into the grid.
          setFilters((f) => ({ ...f, origin: 'all', campaign: 'all', shortlistedOnly: false }));
        }}
      />
    </motion.div>
  );
}

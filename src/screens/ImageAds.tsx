import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Empty, Progress, Tabs, Typography } from 'antd';
import { BarChartOutlined, PlusOutlined } from '../components/AppIcons';
import { motion } from 'motion/react';
import { plural } from '../data/mock';
import { findCreative, useStore } from '../data/store';
import { galleryItems, groupGallery, ORIGIN_TABS, type GroupBy } from '../data/gallery';
import { PopSheet } from '../components/PopSheet';
import { Thumb } from '../components/Thumb';
import { timeLeft } from '../components/TasksPanel';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { GalleryMenus, type GalleryFilters, type Order } from '../components/gallery/GalleryMenus';
import { NewCreativeModal } from '../components/gallery/NewCreativeModal';
import { pageTransition } from '../motion/tokens';

const HOW = (
  <div className="grade-pop">
    <p>A round gives you several options. Star the ones you want to keep and they're saved here. Anything you add to an ad is saved too.</p>
    <p>Each creative keeps all its versions. Once it's in an ad it can't change, so you iterate on it instead, which makes a new&nbsp;creative.</p>
    <p>Archive creatives you're done with. Turn on Show archived in Filter to see them&nbsp;again.</p>
  </div>
);

/**
 * Creative gallery (DL-14, DL-15, DL-16):
 * The unit is a single creative image, newest first, with optional grouping and "New creative" creation flow.
 */
export function ImageAds() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const { jobs, accountId, versionsOf, saved, archived, setArchived, chosen } = useStore();

  const [filters, setFilters] = useState<GalleryFilters>({
    accountId,
    origin: 'all',
    campaign: 'all',
    use: 'all',
    showArchived: false,
  });
  const [order, setOrder] = useState<Order>('newest');
  const [nudgeOff, setNudgeOff] = useState(false);
  useEffect(() => {
    setFilters((f) => ({ ...f, accountId, campaign: 'all' }));
  }, [accountId]);

  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  // Mancini 09:43: grid and list views, like Atria's own view toggles on Overview's Top performing.
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('atria-gallery-view') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const changeView = (v: 'grid' | 'list') => {
    setView(v);
    try {
      localStorage.setItem('atria-gallery-view', v);
    } catch {
      /* ignore */
    }
  };
  const itemsClass = view === 'grid' ? 'gal-grid' : 'gal-list';
  const [newOpen, setNewOpen] = useState(false);

  const allItems = useMemo(() => galleryItems(jobs, findCreative, saved, versionsOf, { archived, chosen }), [jobs, saved, versionsOf, archived, chosen]);

  const accountScoped = useMemo(
    () => (filters.accountId === 'all' ? allItems : allItems.filter((i) => i.accountId === filters.accountId)),
    [allItems, filters.accountId],
  );

  const campaigns = useMemo(
    () => [...new Set(accountScoped.flatMap((i) => i.campaigns))],
    [accountScoped],
  );

  const filtered = useMemo(() => {
    const out = accountScoped.filter(
      (i) =>
        (filters.origin === 'all' || i.origin === filters.origin) &&
        (filters.campaign === 'all' || i.campaigns.includes(filters.campaign)) &&
        (filters.use === 'all' || (filters.use === 'used') === i.inMeta) &&
        (filters.showArchived || !i.archived),
    );
    if (order === 'oldest') out.reverse();
    if (order === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [accountScoped, filters, order]);

  const groups = useMemo(() => groupGallery(filtered, groupBy), [filtered, groupBy]);
  // Suggest archiving saved creatives that never went into an ad and are over a week old.
  const stale = useMemo(() => accountScoped.filter((i) => !i.archived && !i.inMeta && i.minutesAgo > 7 * 1440), [accountScoped]);
  // Rounds with options still to review: their unstarred options aren't in the gallery.
  const toReview = useMemo(
    () => jobs.filter((j) => j.state === 'ready' && j.unseen && findCreative(j.creativeId) && (filters.accountId === 'all' || findCreative(j.creativeId)!.accountId === filters.accountId)),
    [jobs, filters.accountId],
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (j.state !== 'generating' && j.state !== 'queued') return false;
        const c = findCreative(j.creativeId);
        return c && (filters.accountId === 'all' || c.accountId === filters.accountId);
      }),
    [jobs, filters.accountId],
  );

  const clearFilters = () => setFilters({ accountId, origin: filters.origin, campaign: 'all', use: 'all', showArchived: false });
  const hasFilters = filters.accountId !== accountId || filters.campaign !== 'all' || filters.use !== 'all';
  const onArchive = (id: string, on: boolean) => {
    setArchived([id], on);
    message.success(on ? 'Archived. Turn on Show archived in Filter to see it.' : 'Restored to the gallery');
  };


  return (
    <motion.div {...pageTransition} className="page image-ads">
      <div className="page-head gal-head">
        <div className="gal-head-text">
          <Typography.Title level={1} className="page-title">
            Creative gallery
          </Typography.Title>
          {/* Mancini 09:43: one line under the title, no extra meta line; counts live in the tabs below. */}
          <p className="muted desc">Every creative you've kept, with its versions and the ads it runs in.</p>
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

      {/* DL-17: origin as tabs with counts, like Atria's All, Clone, Iterate, Raya. */}
      <Tabs
        className="gal-origin-tabs"
        activeKey={filters.origin}
        onChange={(k) => setFilters((f) => ({ ...f, origin: k as GalleryFilters['origin'] }))}
        items={ORIGIN_TABS.map((t) => {
          const live = accountScoped.filter((i) => filters.showArchived || !i.archived);
          const n = t.value === 'all' ? live.length : live.filter((i) => i.origin === t.value).length;
          return { key: t.value, label: <span className="tab-label">{t.label}<span className="tab-count">{n}</span></span> };
        })}
      />

      <GalleryMenus
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        defaultAccountId={accountId}
        campaigns={campaigns}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        view={view}
        onView={changeView}
        order={order}
        onOrder={setOrder}
      />

      {stale.length >= 3 && !nudgeOff && !filters.showArchived && (
        <div className="gal-nudge" role="status">
          <span>
            <b>{plural(stale.length, 'creative')}</b> haven't gone into an ad in over a week. Archive them to keep the gallery tidy?
          </span>
          <span className="gal-nudge-actions">
            <Button
              size="small"
              onClick={() => {
                setArchived(stale.map((i) => i.id), true);
                message.success(`Archived ${plural(stale.length, 'creative')}`);
              }}
            >
              Archive {stale.length}
            </Button>
            <Button size="small" type="text" onClick={() => setNudgeOff(true)}>
              Not now
            </Button>
          </span>
        </div>
      )}

      {toReview.length > 0 && (
        <div className="gal-live-list">
          {toReview.map((j) => {
            const src = findCreative(j.creativeId)!;
            return (
              <button key={j.id} type="button" className="panel gal-live-row gal-review-row" onClick={() => nav(`/creation/${src.id}?round=${j.id}`)}>
                <Thumb c={src} size={40} />
                <span className="gal-live-body">
                  <b>{src.name}</b>
                  <span className="t-help">{plural(j.count - j.failed.length, 'new option')} ready. Star the ones to keep.</span>
                </span>
                <span className="gal-review-cta">Review</span>
              </button>
            );
          })}
        </div>
      )}


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
        <div className={itemsClass}>
          {filtered.map((item, i) => (
            <GalleryCard
              key={item.id}
              item={item}
              index={i}
              onOpen={(to) => nav(to)}
              onArchive={onArchive}
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
              <div className={itemsClass}>
                {group.items.map((item, i) => (
                  <GalleryCard
                    key={item.id}
                    item={item}
                    index={i}
                    onOpen={(to) => nav(to)}
                    onArchive={onArchive}
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
          setFilters((f) => ({ ...f, origin: 'all', campaign: 'all', use: 'all' }));
        }}
      />
    </motion.div>
  );
}

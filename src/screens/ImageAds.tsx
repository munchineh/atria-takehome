import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Empty, Progress, Tabs, Tooltip } from 'antd';
import { BarChartOutlined, CloseOutlined, InboxOutlined, PlusOutlined, QuestionCircleOutlined } from '../components/AppIcons';
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
import { PageHeader } from '../components/PageHeader';
import { SectionHead } from '../components/SectionHead';

const HOW = (
  <div className="grade-pop">
    <p>A round gives you several options. Save the ones you want to keep and they appear here. Anything you add to an ad is saved too.</p>
    <p>Each creative keeps all its versions. Once it's in an ad it can't change, so you iterate on it instead, which makes a new&nbsp;creative.</p>
    <p>Archive creatives you're done with. Turn on Show archived in Filter to see them&nbsp;again.</p>
  </div>
);

/**
 * Creative gallery (DL-14, DL-15, DL-16, S-05, S-10, S-32, S-33, S-45, S-46):
 * Focal point: the grid/list of saved creatives. Single primary action: New creative.
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

  const allItems = useMemo(
    () => galleryItems(jobs, findCreative, saved, versionsOf, { archived, chosen }),
    [jobs, saved, versionsOf, archived, chosen],
  );

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
  const stale = useMemo(
    () => accountScoped.filter((i) => !i.archived && !i.inMeta && i.minutesAgo > 7 * 1440),
    [accountScoped],
  );
  const toReview = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.state === 'ready' &&
          j.unseen &&
          findCreative(j.creativeId) &&
          (filters.accountId === 'all' || findCreative(j.creativeId)!.accountId === filters.accountId),
      ),
    [jobs, filters.accountId],
  );

  const showNudge = stale.length >= 3 && !nudgeOff && !filters.showArchived;
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
    setFilters({ accountId, origin: filters.origin, campaign: 'all', use: 'all', showArchived: false });
  const hasFilters = filters.accountId !== accountId || filters.campaign !== 'all' || filters.use !== 'all';
  const onArchive = (id: string, on: boolean) => {
    setArchived([id], on);
    message.success(on ? 'Archived. Show archived is in Filter.' : 'Restored to the gallery');
  };

  const hideOriginOnCards = filters.origin === 'cloned' || filters.origin === 'scratch';

  return (
    <motion.div {...pageTransition} className="page image-ads">
      <PageHeader
        title="Creative gallery"
        desc="Every creative you've kept. See its versions and the ads it runs in."
        actions={
          <>
            <PopSheet content={HOW} title="How the gallery works" trigger="click" placement="bottomRight">
              <Button type="text" icon={<QuestionCircleOutlined />}>
                How the gallery works
              </Button>
            </PopSheet>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>
              New creative
            </Button>
          </>
        }
      />

      {/* Mancini 13:40: status rows (rounds to review, rounds generating, the archive nudge) sit together in one card above
          the gallery, apart from the creatives. One row pattern: thumb, title, one help line, one default button on the right. */}
      {(toReview.length > 0 || activeJobs.length > 0 || showNudge) && (
        <div className="panel gal-status" aria-live="polite">
          {toReview.map((j) => {
            const src = findCreative(j.creativeId)!;
            return (
              <div key={j.id} className="gal-status-row">
                <Thumb c={src} size={40} />
                <span className="gal-status-body">
                  <strong className="gal-status-name">{src.name}</strong>
                  <span className="t-help">{plural(j.count - j.failed.length, 'new option')} ready. Save the ones to keep.</span>
                </span>
                <Button onClick={() => nav(`/creation/${src.id}?round=${j.id}`)}>Review</Button>
              </div>
            );
          })}
          {activeJobs.map((j) => {
            const src = findCreative(j.creativeId);
            if (!src) return null;
            return (
              <div key={j.id} className="gal-status-row">
                <Thumb c={src} size={40} />
                <span className="gal-status-body">
                  <strong className="gal-status-name">{src.name}</strong>
                  <span className="t-help">
                    {j.state === 'queued' ? `Queued\u00a0· ${plural(j.count, 'creative')}` : `Generating ${plural(j.count, 'creative')}\u00a0· ${timeLeft(j.progress)}`}
                  </span>
                  <Progress percent={Math.round(j.progress * 100)} showInfo={false} size="small" strokeColor="var(--c-primary)" />
                </span>
              </div>
            );
          })}
          {showNudge && (
            <div className="gal-status-row">
              <span className="gal-status-icon" aria-hidden>
                <InboxOutlined />
              </span>
              <span className="gal-status-body">
                <strong className="gal-status-name">{plural(stale.length, 'creative')} not used in over a week</strong>
                <span className="t-help">Archive them to keep the gallery tidy. You can restore them from Filter.</span>
              </span>
              <span className="gal-status-actions">
                <Button
                  onClick={() => {
                    setArchived(
                      stale.map((i) => i.id),
                      true,
                    );
                    message.success(`Archived ${plural(stale.length, 'creative')}`);
                  }}
                >
                  Archive {stale.length}
                </Button>
                <Tooltip title="Not now.">
                  <Button type="text" icon={<CloseOutlined />} aria-label="Not now" onClick={() => setNudgeOff(true)} />
                </Tooltip>
              </span>
            </div>
          )}
        </div>
      )}

      <Tabs
        className="gal-origin-tabs"
        activeKey={filters.origin}
        onChange={(k) => setFilters((f) => ({ ...f, origin: k as GalleryFilters['origin'] }))}
        items={ORIGIN_TABS.map((t) => {
          const live = accountScoped.filter((i) => filters.showArchived || !i.archived);
          const n = t.value === 'all' ? live.length : live.filter((i) => i.origin === t.value).length;
          return {
            key: t.value,
            label: (
              <span className="tab-label">
                {t.label}
                <span className="tab-count">{n}</span>
              </span>
            ),
          };
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

      {filtered.length === 0 ? (
        <div className="gal-empty">
          {hasFilters ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <>
                  <strong>No creatives match these filters</strong>
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
                  <strong>No creatives yet</strong>
                  <br />
                  Create from a brief, a clone, or an existing ad.
                </>
              }
            >
              <Button icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>
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
              hideOrigin={hideOriginOnCards}
              onOpen={(to) => nav(to)}
              onArchive={onArchive}
            />
          ))}
        </div>
      ) : (
        <div className="gal-groups">
          {groups.map((group) => (
            <section key={group.key} className={`gal-group ${group.ungrouped ? 'is-ungrouped' : ''}`}>
              <SectionHead
                title={group.title}
                help={group.meta}
                action={
                  group.adId ? (
                    <Button
                      type="link"
                      className="inline-link"
                      icon={<BarChartOutlined />}
                      onClick={() => nav(`/ad/${group.adId}`)}
                    >
                      View in Radar
                    </Button>
                  ) : undefined
                }
              />
              <div className={itemsClass}>
                {group.items.map((item, i) => (
                  <GalleryCard
                    key={item.id}
                    item={item}
                    index={i}
                    hideDate={groupBy === 'date' && !group.ungrouped}
                    hideAd={groupBy === 'ad' && Boolean(group.adId)}
                    hideOrigin={hideOriginOnCards}
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
          setFilters((f) => ({ ...f, origin: 'all', campaign: 'all', use: 'all' }));
        }}
      />
    </motion.div>
  );
}

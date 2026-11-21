import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Empty, Progress, Tabs, Tooltip } from 'antd';
import { CheckSquareOutlined, BarChartOutlined, CloseOutlined, InboxOutlined, PlusOutlined, QuestionCircleOutlined } from '../components/AppIcons';
import { motion } from 'motion/react';
import { plural } from '../data/mock';
import { ALL_CREATIVES, findCreative, useStore } from '../data/store';
import { galleryItems, groupGallery, uploadedItems, ORIGIN_TABS, type GroupBy } from '../data/gallery';
import { PopSheet } from '../components/PopSheet';
import { Thumb } from '../components/Thumb';
import { timeLeft } from '../components/TasksPanel';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { BulkBar } from '../components/BulkBar';
import { GalleryMenus, type GalleryFilters, type Order } from '../components/gallery/GalleryMenus';
import { NewCreativeModal } from '../components/gallery/NewCreativeModal';
import { pageTransition } from '../motion/tokens';
import { PageHeader } from '../components/PageHeader';
import { SectionHead } from '../components/SectionHead';

/**
 * Mancini 15:06: three paragraphs were heavy to read. Each idea is now a small box with a looping picture of what
 * happens, a short title and one line. The pictures are CSS only (transform and opacity) and stop under reduced motion.
 */
const HOW = (
  <div className="how-cards">
    <div className="how-card">
      <span className="how-art how-save" aria-hidden>
        <i /><i /><i /><b />
      </span>
      <span className="how-text">
        <strong>Save what you want to keep</strong>
        <span>A round gives you several options. The ones you save appear here.</span>
      </span>
    </div>
    <div className="how-card">
      <span className="how-art how-versions" aria-hidden>
        <i /><i /><i />
      </span>
      <span className="how-text">
        <strong>Each creative keeps its versions</strong>
        <span>Once it runs in an ad it can't get a new version, but you can make a new&nbsp;variation.</span>
      </span>
    </div>
    <div className="how-card">
      <span className="how-art how-archive" aria-hidden>
        <i /><b />
      </span>
      <span className="how-text">
        <strong>Archive when you're done</strong>
        <span>Archived creatives stay next to the&nbsp;tabs.</span>
      </span>
    </div>
  </div>
);

/**
 * Creative Gallery (DL-14, DL-15, DL-16, S-05, S-10, S-32, S-33, S-45, S-46):
 * Focal point: the grid/list of saved creatives. Single primary action: New creative.
 */
export function ImageAds() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const { jobs, accountId, versionsOf, saved, archived, setArchived, chosen, markSeen } = useStore();

  const [filters, setFilters] = useState<GalleryFilters>({
    accountId,
    origin: 'all',
    campaign: 'all',
    use: 'all',
    showArchived: false,
  });
  const [order, setOrder] = useState<Order>('newest');
  const [nudgeOff, setNudgeOff] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);
  // 274 (Mancini 19:08): bulk select. Review opens it with the unused creatives filtered and picked, ready to archive.
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const toggleSel = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const endSelect = () => {
    setSelecting(false);
    setSel([]);
    setStaleOnly(false);
  };
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
    () => [...galleryItems(jobs, findCreative, saved, versionsOf, { archived, chosen, all: true }), ...uploadedItems(ALL_CREATIVES, archived)],
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
        (filters.origin === 'all' || i.source === filters.origin) &&
        (filters.campaign === 'all' || i.campaigns.includes(filters.campaign)) &&
        (filters.use === 'all' || (filters.use === 'used') === i.inMeta) &&
        // Mancini 13:45: archived creatives have their own view (the Archived button by the tabs), not a filter.
        (filters.showArchived ? i.archived : !i.archived) &&
        (!staleOnly || (!i.inMeta && i.minutesAgo > 7 * 1440)),
    );
    if (order === 'oldest') out.reverse();
    if (order === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [accountScoped, filters, order, staleOnly]);

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
  const archivedCount = accountScoped.filter((i) => i.archived).length;
  const [hidden, setHidden] = useState<string[]>([]);
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
    message.success(on ? 'Archived. Find it under Archived.' : 'Restored to the gallery');
  };

  const hideOriginOnCards = false;

  return (
    <motion.div {...pageTransition} className="page image-ads">
      <PageHeader
        title="Creative Gallery"
        desc="All your creatives in one place. Open one to see its history and the ads it's linked to."
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
      {(toReview.length > 0 || activeJobs.some((j) => !hidden.includes(j.id)) || showNudge) && (
        <div className="panel gal-status" aria-live="polite">
          {toReview.map((j) => {
            const src = findCreative(j.creativeId)!;
            return (
              <div key={j.id} className="gal-status-row">
                <Thumb c={src} size={40} />
                <span className="gal-status-body">
                  <strong className="gal-status-name">{src.name}</strong>
                  <span className="t-help">{plural(j.count - j.failed.length, 'new creative')} ready to compare.</span>
                </span>
                <span className="gal-status-actions">
                  <Button onClick={() => nav(`/creation/${src.id}?round=${j.id}`)}>Review</Button>
                  <Tooltip title="Dismiss. The round stays in the gallery.">
                    <Button type="text" icon={<CloseOutlined />} aria-label="Dismiss" onClick={() => markSeen(j.id)} />
                  </Tooltip>
                </span>
              </div>
            );
          })}
          {activeJobs.filter((j) => !hidden.includes(j.id)).map((j) => {
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
                <span className="gal-status-actions">
                  <Tooltip title="Hide. The round keeps generating and shows up when it's ready.">
                    <Button type="text" icon={<CloseOutlined />} aria-label="Hide" onClick={() => setHidden((h) => [...h, j.id])} />
                  </Tooltip>
                </span>
              </div>
            );
          })}
          {showNudge && (
            <div className="gal-status-row">
              {/* Mancini 14:58: a stack of the creatives themselves says what will be archived better than an inbox icon. */}
              <span className="gal-status-stack" aria-hidden>
                {stale.slice(0, 3).map((i) => (
                  <Thumb key={i.id} c={{ img: i.img, media: 'Image', name: i.name }} size={28} />
                ))}
              </span>
              <span className="gal-status-body">
                <strong className="gal-status-name">{plural(stale.length, 'creative')} not used in over a week</strong>
                <span className="t-help">Archive them to keep the gallery tidy. They stay under Archived.</span>
              </span>
              <span className="gal-status-actions">
                {/* Mancini 14:35: two actions. Review shows only these creatives; Archive all is the main one. */}
                <Button
                  onClick={() => {
                    if (staleOnly) return endSelect();
                    setStaleOnly(true);
                    setSelecting(true);
                    setSel(stale.map((i) => i.id));
                  }}
                >
                  {staleOnly ? 'Show all' : 'Review'}
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setArchived(
                      stale.map((i) => i.id),
                      true,
                    );
                    setStaleOnly(false);
                    message.success(`Archived ${plural(stale.length, 'creative')}`);
                  }}
                >
                  Archive all
                </Button>
                <Tooltip title="Dismiss">
                  <Button type="text" icon={<CloseOutlined />} aria-label="Dismiss" onClick={() => setNudgeOff(true)} />
                </Tooltip>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="gal-bar">
      <Tabs
        className="gal-origin-tabs"
        activeKey={filters.origin}
        onChange={(k) => setFilters((f) => ({ ...f, origin: k as GalleryFilters['origin'] }))}
        tabBarExtraContent={
          archivedCount > 0 || filters.showArchived ? (
            <Button type="text" icon={<InboxOutlined />} onClick={() => setFilters((f) => ({ ...f, showArchived: !f.showArchived }))}>
              {filters.showArchived ? 'Back to gallery' : `Archived ${archivedCount}`}
            </Button>
          ) : null
        }
        items={ORIGIN_TABS.map((t) => {
          const live = accountScoped.filter((i) => (filters.showArchived ? i.archived : !i.archived));
          const n = t.value === 'all' ? live.length : live.filter((i) => i.source === t.value).length;
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

      <div className="gal-tools">
      {!selecting && (
        <Button icon={<CheckSquareOutlined />} onClick={() => setSelecting(true)}>
          Select
        </Button>
      )}
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
      </div>
      </div>

      {staleOnly && (
        <div className="gal-review-note">
          Showing {plural(filtered.length, 'creative')} not used in over a week.{' '}
          <Button type="link" className="inline-link" onClick={endSelect}>
            Show all
          </Button>
        </div>
      )}

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
                  Use the AI playground, start from ads you like, or make variations of your own ads.
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
              selecting={selecting}
              selected={sel.includes(item.id)}
              onToggle={() => toggleSel(item.id)}
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
                    selecting={selecting}
                    selected={sel.includes(item.id)}
                    onToggle={() => toggleSel(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <BulkBar open={selecting} count={sel.length} total={filtered.length} onAll={(on) => setSel(on ? filtered.map((i) => i.id) : [])} onCancel={endSelect}>
        {filters.showArchived ? (
          <Button
            type="primary"
            disabled={!sel.length}
            onClick={() => {
              setArchived(sel, false);
              message.success(`Restored ${plural(sel.length, 'creative')}`);
              endSelect();
            }}
          >
            Restore
          </Button>
        ) : (
          <Button
            type="primary"
            disabled={!sel.length}
            onClick={() => {
              setArchived(sel, true);
              message.success(`Archived ${plural(sel.length, 'creative')}`);
              endSelect();
            }}
          >
            Archive
          </Button>
        )}
      </BulkBar>

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

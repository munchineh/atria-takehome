import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Checkbox, Empty, Grid, Segmented, Select, Tooltip } from 'antd';
import { motion } from 'motion/react';
import { AppstoreOutlined, CheckSquareOutlined, DownOutlined, RightOutlined, SlidersOutlined, UnorderedListOutlined } from '../components/AppIcons';
import { PopSheet } from '../components/PopSheet';
import { BulkBar } from '../components/BulkBar';
import { useStore } from '../data/store';
import { PageHeader } from '../components/PageHeader';
import { AdArt, Thumb } from '../components/Thumb';
import { useLibrary, type LibStatus } from '../data/library';
import { FIELD_LABEL } from '../data/adsetup';
import { ratioFor } from '../data/variations';
import { pageTransition } from '../motion/tokens';

/**
 * 262 (Mancini 17:36): Ad Library. Every ad in the account, running, paused or not running yet. Analytics is for
 * performance; this is where an ad's setup and creative get changed before it runs.
 */
export function AdLibrary() {
  const ads = useLibrary();
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const [tab, setTab] = useState<'All' | LibStatus>('All');
  // 266 (Mancini 18:24): grid or list, remembered like the gallery's.
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('atria.lib.view') as 'grid' | 'list') || 'list';
    } catch {
      return 'list';
    }
  });
  const changeView = (v: 'grid' | 'list') => {
    setView(v);
    try {
      localStorage.setItem('atria.lib.view', v);
    } catch {
      /* storage can be unavailable */
    }
  };
  const status = (a: (typeof ads)[number]) => <span className={`lib-status s-${a.status.replace(' ', '-').toLowerCase()}`}>{a.status}</span>;
  const count = (t: 'All' | LibStatus) => (t === 'All' ? ads.length : ads.filter((a) => a.status === t).length);
  // 272 (Mancini 19:03): the same Display menu as Creative Gallery: Grid or List, and an order.
  const [order, setOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
  // 274 (Mancini 19:08): bulk select, like Creative Gallery.
  const { message, modal } = App.useApp();
  const { deleteDrafts } = useStore();
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const toggleSel = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const endSelect = () => {
    setSelecting(false);
    setSel([]);
  };
  const open = (id: string) => (selecting ? toggleSel(id) : nav(`/creation/ads/${id}`));
  const filtered = tab === 'All' ? ads : ads.filter((a) => a.status === tab);
  const shown = order === 'name' ? [...filtered].sort((x, y) => x.name.localeCompare(y.name)) : order === 'oldest' ? [...filtered].reverse() : filtered;
  return (
    <motion.div {...pageTransition} className="page lib">
      <PageHeader title="Ad Library" desc="Every ad in this account. Change an ad's setup or creative here, then run it from your ad manager." />
      <div className="lib-toolbar">
      <Segmented
        className="lib-tabs"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={(['All', 'Running', 'Paused', 'Not running'] as const).map((t) => ({
          value: t,
          label: (
            <span className="lib-tab">
              {t} <span className="tab-count">{count(t)}</span>
            </span>
          ),
        }))}
      />
      <span className="lib-tools">
      {!selecting && (
        <Button icon={<CheckSquareOutlined />} onClick={() => setSelecting(true)}>
          Select
        </Button>
      )}
      <PopSheet
        title="Display"
        trigger="click"
        placement="bottomRight"
        classNames={{ root: 'menu-pop' }}
        content={
          <div className="menu-body">
            <Segmented
              block
              className="menu-view"
              value={view}
              onChange={(v) => changeView(v as 'grid' | 'list')}
              options={[
                { value: 'grid', label: <span className="menu-view-opt"><AppstoreOutlined />Grid</span> },
                { value: 'list', label: <span className="menu-view-opt"><UnorderedListOutlined />List</span> },
              ]}
            />
            <div className="menu-row">
              <span className="menu-label">Order</span>
              <Select
                value={order}
                onChange={setOrder}
                className="menu-select"
                options={[
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'name', label: 'Name, A to Z' },
                ]}
              />
            </div>
          </div>
        }
      >
        <Button icon={<SlidersOutlined />} className="lib-display">
          Display <DownOutlined className="menu-chev" />
        </Button>
      </PopSheet>
      </span>
      </div>
      {shown.length && view === 'grid' ? (
        <ul className="lib-grid">
          {shown.map((a) => (
            <li key={a.id}>
              {selecting && <Checkbox className="gal-check" checked={sel.includes(a.id)} onChange={() => toggleSel(a.id)} aria-label={`Select ${a.name}`} />}
              <button type="button" className={`lib-card ${sel.includes(a.id) ? 'is-selected' : ''}`} onClick={() => open(a.id)}>
                <AdArt slot={a.img} copy={a.copy} media={a.media} ratio={ratioFor(a.img)} alt={a.name} />
                <span className="lib-card-body">
                  <b className="lib-name">{a.name}</b>
                  <span className="lib-card-top">
                    <span className="lib-sub">{a.setup.headline || a.source}</span>
                    {status(a)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : shown.length ? (
        <ul className="lib-list">
          {shown.map((a) => (
            <li key={a.id}>
              <button type="button" className={`lib-row ${sel.includes(a.id) ? 'is-selected' : ''}`} onClick={() => open(a.id)}>
                {selecting && <Checkbox checked={sel.includes(a.id)} tabIndex={-1} aria-hidden />}
                <Thumb c={{ img: a.img, media: a.media, name: a.name }} size={48} />
                <span className="lib-main">
                  <b className="lib-name">{a.name}</b>
                  <span className="lib-sub">{a.source}</span>
                </span>
                {bp.md && (
                  <span className="lib-head">
                    <span className="lib-k">{FIELD_LABEL.headline}</span>
                    <span className="lib-v">{a.setup.headline}</span>
                  </span>
                )}
                {status(a)}
                <RightOutlined className="lib-chev" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tab === 'Not running' ? 'No ads waiting to run. Duplicate an ad from Radar, or link a creative to an ad.' : 'No ads here'} />
      )}
      <BulkBar open={selecting} count={sel.length} total={shown.length} onAll={(on) => setSel(on ? shown.map((a) => a.id) : [])} onCancel={endSelect}>
        <Tooltip title={sel.some((id) => !shown.find((a) => a.id === id)?.draft) ? 'Only ads that never ran can be deleted here. Ads from Meta are removed in Ads Manager.' : undefined}>
          <Button
            danger
            disabled={!sel.filter((id) => shown.find((a) => a.id === id)?.draft).length}
            onClick={() => {
              const ids = sel.filter((id) => shown.find((a) => a.id === id)?.draft);
              modal.confirm({
                title: `Delete ${ids.length === 1 ? 'this ad' : `${ids.length} ads`}?`,
                content: "They never ran, so nothing changes in Meta. This can't be undone.",
                okText: 'Delete',
                okButtonProps: { danger: true },
                onOk: () => {
                  deleteDrafts(ids);
                  message.success(`Deleted ${ids.length === 1 ? '1 ad' : `${ids.length} ads`}`);
                  endSelect();
                },
              });
            }}
          >
            Delete
          </Button>
        </Tooltip>
        <Button type="primary" disabled={!sel.length} onClick={() => message.info("In the live product, this opens the selected ads in Ads Manager. It's not part of this prototype.")}>
          Open in Ads Manager
        </Button>
      </BulkBar>
    </motion.div>
  );
}

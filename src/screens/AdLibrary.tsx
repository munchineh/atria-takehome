import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Grid, Segmented } from 'antd';
import { motion } from 'motion/react';
import { AppstoreOutlined, RightOutlined, UnorderedListOutlined } from '../components/AppIcons';
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
  const shown = tab === 'All' ? ads : ads.filter((a) => a.status === tab);
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
      <Segmented
        className="lib-view"
        value={view}
        onChange={(v) => changeView(v as 'grid' | 'list')}
        options={[
          { value: 'grid', label: <AppstoreOutlined aria-label="Grid" />, title: 'Grid' },
          { value: 'list', label: <UnorderedListOutlined aria-label="List" />, title: 'List' },
        ]}
      />
      </div>
      {shown.length && view === 'grid' ? (
        <ul className="lib-grid">
          {shown.map((a) => (
            <li key={a.id}>
              <button type="button" className="lib-card" onClick={() => nav(`/creation/ads/${a.id}`)}>
                <AdArt slot={a.img} copy={a.copy} media={a.media} ratio={ratioFor(a.img)} alt={a.name} />
                <span className="lib-card-body">
                  <b className="lib-name">{a.name}</b>
                  <span className="lib-sub">{a.setup.headline || a.source}</span>
                  {status(a)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : shown.length ? (
        <ul className="lib-list">
          {shown.map((a) => (
            <li key={a.id}>
              <button type="button" className="lib-row" onClick={() => nav(`/creation/ads/${a.id}`)}>
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
    </motion.div>
  );
}

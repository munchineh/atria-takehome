import { useEffect, useState, type ReactNode } from 'react';
import { App, Badge, Button, Drawer, Grid, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  BellOutlined,
  BulbOutlined,
  CompassOutlined,
  MenuOutlined,
  SyncOutlined,
  VideoCameraOutlined,
} from './AppIcons';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ACCOUNT, SIDEBAR_ACCOUNTS, plural } from '../data/mock';
import { DEMO_ACCOUNTS, accountOf, findCreative, useStore } from '../data/store';
import { TasksPanel } from './TasksPanel';
import { Thumb } from './Thumb';
import { duration, ease } from '../motion/tokens';

const RAIL = [
  { icon: <CompassOutlined />, label: 'Inspo' },
  { icon: <BarChartOutlined />, label: 'Analytics', to: '/' },
  { icon: <BulbOutlined />, label: 'Creation', to: '/creation' },
  { icon: <VideoCameraOutlined />, label: 'Assets' },
  { icon: <AppstoreOutlined />, label: 'Brands' },
];

function AccountList({ onPick }: { onPick?: () => void }) {
  const { accountId, setAccount } = useStore();
  const { message } = App.useApp();
  const loc = useLocation();
  const nav = useNavigate();
  return (
    <div className="accounts">
      <div className="accounts-head">
        Ad accounts <span className="muted-dark">({SIDEBAR_ACCOUNTS.length})</span>
      </div>
      {SIDEBAR_ACCOUNTS.map((a) => {
        const demo = DEMO_ACCOUNTS.find((d) => d.name === a);
        return (
          <div
            key={a}
            className={`account ${demo?.id === accountId ? 'active' : ''} ${demo ? 'demo' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!demo) {
                message.info({ content: `${a} has no demo data. Try Moody Mochi or Tiny Toast Co.`, key: 'demo' });
                return;
              }
              setAccount(demo.id);
              nav(loc.pathname.startsWith('/overview') ? '/overview' : '/');
              onPick?.();
            }}
          >
            <span className="meta-glyph">∞</span>
            {a}
          </div>
        );
      })}
    </div>
  );
}

/** TR-13: completion toast, one action. */
function useCompletionToasts(mobile: boolean) {
  const { finished, clearFinished, markSeen, accountId } = useStore();
  const { notification } = App.useApp();
  const nav = useNavigate();
  useEffect(() => {
    if (!finished.length) return;
    for (const j of finished) {
      const c = findCreative(j.creativeId);
      const key = `done-${j.id}`;
      notification.open({
        key,
        className: 'done-toast',
        icon: c ? <Thumb c={c} size={40} /> : undefined,
        title: `${plural(j.count - j.failed.length, 'variation')} ready`,
        // 5d Gm-10: name the account when the round belongs to another one.
        description: c ? (accountOf(c).id !== accountId ? `${accountOf(c).name}\u00a0· ${c.name}` : c.name) : '',
        placement: mobile ? 'top' : 'topRight',
        duration: 6,
        actions: (
          <Button
            type="link"
            className="toast-action"
            onClick={() => {
              markSeen(j.id);
              nav(`/ad/${j.creativeId}/variations?round=${j.id}`);
              notification.destroy(key);
            }}
          >
            View variations <ArrowRightOutlined />
          </Button>
        ),
      });
    }
    clearFinished();
  }, [finished, clearFinished, notification, nav, markSeen, mobile, accountId]);
}

/** 20 × 20 panel glyph, like Atria's collapse and expand buttons. */
const PanelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <rect x="3" y="4" width="14" height="12" rx="2.5" />
    <path d="M8 4v12" />
  </svg>
);

export function Shell({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const wide = bp.xl;
  const { message } = App.useApp();
  const [drawer, setDrawer] = useState(false);
  // Mancini 09:43, item 22: Atria's panel collapses from a button at its top right; the expand button then sits at the top of the rail.
  const [sideOpen, setSideOpen] = useState(() => {
    try {
      return localStorage.getItem('atria-side') !== 'closed';
    } catch {
      return true;
    }
  });
  const toggleSide = (open: boolean) => {
    setSideOpen(open);
    try {
      localStorage.setItem('atria-side', open ? 'open' : 'closed');
    } catch {
      /* storage can be unavailable */
    }
  };
  const { jobs, credits, accountId, tasksOpen, setTasksOpen, bump } = useStore();
  const loc = useLocation();
  const nav = useNavigate();
  const accountName = DEMO_ACCOUNTS.find((d) => d.id === accountId)?.name ?? ACCOUNT.name;
  const running = jobs.filter((j) => j.state === 'generating' || j.state === 'queued').length;
  const unseen = jobs.some((j) => j.unseen);
  const bellLabel = running ? `Tasks, ${running} generating` : unseen ? 'Tasks, new results' : 'Tasks';
  const inCreation = loc.pathname.startsWith('/creation');
  useCompletionToasts(mobile);

  return (
    <div className={`shell ${wide && !sideOpen ? 'side-collapsed' : ''}`}>
      {!mobile && (
        <nav className="rail" aria-label="Main">
          <div className="rail-logo">A</div>
          {wide && !sideOpen && (
            <Tooltip title="Expand panel" placement="right">
              <button type="button" className="panel-toggle-btn rail-expand" aria-label="Expand panel" onClick={() => toggleSide(true)}>
                <PanelIcon />
              </button>
            </Tooltip>
          )}
          {RAIL.map((r) => {
            const active = r.to === '/creation' ? inCreation : r.to === '/' && !inCreation;
            return (
              <Tooltip key={r.label} title={wide ? '' : r.label} placement="right">
                <div
                  className={`rail-item link ${active ? 'active' : ''}`}
                  role="link"
                  tabIndex={0}
                  onClick={() => (r.to ? nav(r.to) : message.info({ content: `In the live product, this opens ${r.label}. It's not part of this prototype.`, key: 'rail' }))}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </div>
              </Tooltip>
            );
          })}
        </nav>
      )}
      {wide && sideOpen && (
        <aside className="sidebar">
          <div className="sidebar-title sidebar-title-row">
            <span>{inCreation ? 'Creation' : 'Analytics'}</span>
            <Tooltip title="Collapse panel" placement="right">
              <button type="button" className="panel-toggle-btn" aria-label="Collapse panel" onClick={() => toggleSide(false)}>
                <PanelIcon />
              </button>
            </Tooltip>
          </div>
          <AccountList />
        </aside>
      )}
      <div className="main">
        <header className="topbar">
          {!wide && <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="Ad accounts" />}
          <div className="topbar-title">
            <span className="meta-glyph blue">∞</span>
            <span className="ellipsis">{accountName}</span>
          </div>
          {!inCreation && header}
          <div className="topbar-right">
            {!mobile && (
              <span className="sync muted">
                <SyncOutlined /> Synced 1 day ago
              </span>
            )}
            <Tooltip title={`Credits left in this workspace. Each image Atria makes uses ${ACCOUNT.creditsPerImage}\u00a0credits.`}>
              <span className="credits">{credits.toLocaleString('en-US')}{'\u00a0'}credits</span>
            </Tooltip>
            <Tooltip title={tasksOpen ? '' : 'Tasks'}>
              <motion.span
                key={bump}
                className="bell-wrap"
                initial={bump ? { opacity: 0.4 } : false}
                animate={{ opacity: 1, transition: { duration: duration.base, ease: ease.standard } }}
              >
                <Badge count={running} size="small" dot={!running && unseen} offset={[-4, 4]} color="#f66c30">
                  <Button type="text" className="bell-btn" icon={<BellOutlined />} aria-label={bellLabel} aria-expanded={tasksOpen} onClick={() => setTasksOpen(!tasksOpen)} />
                </Badge>
              </motion.span>
            </Tooltip>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      <TasksPanel mobile={mobile} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" size={300} title={inCreation ? 'Creation' : 'Analytics'} className="dark-drawer">
        {/* 5d Gm-01: phones hide the top bar switch, so Overview and Radar sit at the top of the drawer. */}
        {mobile && !inCreation && header && (
          <div className="drawer-nav" onClick={() => setDrawer(false)}>
            {header}
          </div>
        )}
        <AccountList onPick={() => setDrawer(false)} />
        {mobile && (
          <div className="drawer-sync">
            <SyncOutlined /> Synced 1 day ago
          </div>
        )}
      </Drawer>
    </div>
  );
}

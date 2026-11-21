import { useEffect, useState, type ReactNode } from 'react';
import { LIVE_FAIL_EVENT } from '../data/live';
import { App, Badge, Button, Drawer, Grid, Tooltip, Popover, Progress } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  BulbOutlined,
  CompassOutlined,
  MenuOutlined,
  SyncOutlined,
  VideoCameraOutlined,
} from './AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ACCOUNT, ATTRIBUTION, SIDEBAR_ACCOUNTS, WINDOW } from '../data/mock';
import { DEMO_ACCOUNTS, useStore } from '../data/store';
import { TasksPanel } from './TasksPanel';
import { GenBanners } from './GenBanners';
import { duration, ease } from '../motion/tokens';
import { leave } from '../data/leaveGuard';

const RAIL = [
  { icon: <CompassOutlined />, label: 'Inspo' },
  { icon: <BarChartOutlined />, label: 'Analytics', to: '/' },
  { icon: <BulbOutlined />, label: 'Creation', to: '/creation/ads' },
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
              leave(() => {
                setAccount(demo.id);
                nav(loc.pathname.startsWith('/overview') ? '/overview' : '/');
              });
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
  useEffect(() => {
    const onFail = (e: Event) =>
      message.warning({
        content: (e as CustomEvent).detail === 'limit' ? "Today's live images are used up. Showing a sample image." : "The image couldn't be generated. Showing a sample image.",
        duration: 4,
      });
    window.addEventListener(LIVE_FAIL_EVENT, onFail);
    return () => window.removeEventListener(LIVE_FAIL_EVENT, onFail);
  }, [message]);
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
  // 258 (Mancini 17:36): the bell is Notifications.
  const bellLabel = running ? `Notifications, ${running} creating` : unseen ? 'Notifications, new' : 'Notifications';
  const inCreation = loc.pathname.startsWith('/creation');

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
            const active = r.to?.startsWith('/creation') ? inCreation : r.to === '/' && !inCreation;
            return (
              <Tooltip key={r.label} title={wide ? '' : r.label} placement="right">
                <div
                  className={`rail-item link ${active ? 'active' : ''}`}
                  role="link"
                  tabIndex={0}
                  onClick={() => (r.to ? leave(() => nav(r.to!)) : message.info({ content: `In the live product, this opens ${r.label}. It's not part of this prototype.`, key: 'rail' }))}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </div>
              </Tooltip>
            );
          })}
        </nav>
      )}
      {/* Mancini 15:28: one movement only. A clip wrapper animates its width and the panel inside keeps its full width,
          so the panel is revealed as one piece and the page moves with the same edge. No fade, no offset. */}
      <AnimatePresence initial={false}>
      {wide && sideOpen && (
        <motion.div className="sidebar-clip" initial={{ width: 0 }} animate={{ width: 'auto', transition: { duration: 0.22, ease: [0.2, 0, 0, 1] } }} exit={{ width: 0, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } }}>
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
        </motion.div>
      )}
      </AnimatePresence>
      <div className="main">
        <header className="topbar">
          {!wide && <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="Ad accounts" />}
          <div className="topbar-title">
            <span className="meta-glyph blue">∞</span>
            <span className="ellipsis">{accountName}</span>
          </div>
          {header}
          <div className="topbar-right">
            {!mobile && (
              <Tooltip title={`Last synced from Meta on ${WINDOW.synced}. Results use ${ATTRIBUTION} attribution.`}>
                <span className="sync muted" tabIndex={0}>
                  <SyncOutlined /> Synced 1 day ago
                </span>
              </Tooltip>
            )}
{/* Mancini 15:21: a ring shows how much of the month's credits is left, and the popover says when it resets. */}
            <Popover
              classNames={{ root: 'credits-popover' }}
              placement="bottomRight"
              content={
                <div className="credits-pop">
                  <b>
                    {credits.toLocaleString('en-US')} of {ACCOUNT.creditsPlan.toLocaleString('en-US')} credits left
                  </b>
                  <span className="t-help">Resets {ACCOUNT.creditsReset}. Each image uses {ACCOUNT.creditsPerImage}{'\u00a0'}credits.</span>
                </div>
              }
            >
              <span className="credits" tabIndex={0}>
                <Progress type="circle" size={16} strokeWidth={14} showInfo={false} percent={Math.round((credits / ACCOUNT.creditsPlan) * 100)} strokeColor="var(--c-primary)" aria-hidden />
                {credits.toLocaleString('en-US')}{'\u00a0'}credits
              </span>
            </Popover>
            <Tooltip title={tasksOpen ? '' : 'Notifications'}>
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
      <GenBanners />
      <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" size={300} title={inCreation ? 'Creation' : 'Analytics'} className="dark-drawer">
        {/* Mancini 15:36: phones have no rail, so the product areas sit at the top of the drawer. Without them there was no way to reach Creation. */}
        {mobile && (
          <nav className="drawer-rail" aria-label="Main">
            {RAIL.map((r) => {
              const active = r.to?.startsWith('/creation') ? inCreation : r.to === '/' && !inCreation;
              return (
                <button
                  key={r.label}
                  type="button"
                  className={`drawer-rail-item ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    if (!r.to) return message.info({ content: `In the live product, this opens ${r.label}. It's not part of this prototype.`, key: 'rail' });
                    setDrawer(false);
                    leave(() => nav(r.to!));
                  }}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </button>
              );
            })}
          </nav>
        )}
        {/* 5d Gm-01: phones hide the top bar switch, so Overview and Radar sit at the top of the drawer. */}
        {mobile && header && (
          <div className="drawer-nav" onClick={() => setDrawer(false)}>
            {header}
          </div>
        )}
        <AccountList onPick={() => setDrawer(false)} />
        {mobile && (
          <div className="drawer-sync">
            <SyncOutlined /> Synced 1 day ago · {ATTRIBUTION} attribution
          </div>
        )}
      </Drawer>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { App, Badge, Button, Drawer, Grid, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  BulbOutlined,
  CompassOutlined,
  MenuOutlined,
  SyncOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ACCOUNT, SIDEBAR_ACCOUNTS, short, plural } from '../data/mock';
import { DEMO_ACCOUNTS, findCreative, useStore } from '../data/store';
import { TasksPanel } from './TasksPanel';
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
            role={demo ? 'button' : undefined}
            tabIndex={demo ? 0 : undefined}
            onClick={() => {
              if (!demo) return;
              setAccount(demo.id);
              nav('/');
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
function useCompletionToasts() {
  const { finished, clearFinished, markSeen } = useStore();
  const { notification } = App.useApp();
  const nav = useNavigate();
  useEffect(() => {
    if (!finished.length) return;
    for (const j of finished) {
      const c = findCreative(j.creativeId);
      const key = `done-${j.id}`;
      notification.success({
        key,
        message: `${plural(j.count, 'variation')} ready for ${short(c?.name ?? '', 20)}`,
        placement: 'topRight',
        duration: 6,
        btn: (
          <Button
            type="primary"
            size="small"
            onClick={() => {
              markSeen(j.id);
              nav(`/ad/${j.creativeId}/variations?round=${j.id}`);
              notification.destroy(key);
            }}
          >
            View variations
          </Button>
        ),
      });
    }
    clearFinished();
  }, [finished, clearFinished, notification, nav, markSeen]);
}

export function Shell({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const wide = bp.xl;
  const [drawer, setDrawer] = useState(false);
  const { jobs, credits, accountId, tasksOpen, setTasksOpen, bump } = useStore();
  const loc = useLocation();
  const nav = useNavigate();
  const accountName = DEMO_ACCOUNTS.find((d) => d.id === accountId)?.name ?? ACCOUNT.name;
  const running = jobs.filter((j) => j.state === 'generating' || j.state === 'queued').length;
  const unseen = jobs.some((j) => j.unseen);
  const bellLabel = running ? `Tasks, ${running} generating` : unseen ? 'Tasks, new results' : 'Tasks';
  const inCreation = loc.pathname.startsWith('/creation');
  useCompletionToasts();

  return (
    <div className="shell">
      {!mobile && (
        <nav className="rail" aria-label="Main">
          <div className="rail-logo">A</div>
          {RAIL.map((r) => {
            const active = r.to === '/creation' ? inCreation : r.to === '/' && !inCreation;
            return (
              <Tooltip key={r.label} title={wide ? '' : r.label} placement="right">
                <div
                  className={`rail-item ${active ? 'active' : ''} ${r.to ? 'link' : ''}`}
                  role={r.to ? 'link' : undefined}
                  tabIndex={r.to ? 0 : undefined}
                  onClick={() => r.to && nav(r.to)}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </div>
              </Tooltip>
            );
          })}
        </nav>
      )}
      {wide && (
        <aside className="sidebar">
          <div className="sidebar-title">{inCreation ? 'Creation' : 'Analytics'}</div>
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
            <Tooltip title={`Credits left in this workspace. One variation uses ${ACCOUNT.creditsPerImage}`}>
              <span className="credits">{credits.toLocaleString()} credits</span>
            </Tooltip>
            <Tooltip title={tasksOpen ? '' : 'Tasks'}>
              <motion.span
                key={bump}
                className="bell-wrap"
                initial={bump ? { opacity: 0.4 } : false}
                animate={{ opacity: 1, transition: { duration: duration.base, ease: ease.standard } }}
              >
                <Badge count={running} size="small" dot={!running && unseen} offset={[-4, 4]} color="#f5582a">
                  <Button type="text" className="bell-btn" icon={<BellOutlined />} aria-label={bellLabel} aria-expanded={tasksOpen} onClick={() => setTasksOpen(!tasksOpen)} />
                </Badge>
              </motion.span>
            </Tooltip>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      <TasksPanel mobile={mobile} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" size={300} title="Analytics" className="dark-drawer">
        <AccountList onPick={() => setDrawer(false)} />
      </Drawer>
    </div>
  );
}

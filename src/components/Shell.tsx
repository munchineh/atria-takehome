import { useState, type ReactNode } from 'react';
import { Badge, Button, Drawer, Grid, Tooltip } from 'antd';
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
import { ACCOUNT } from '../data/mock';
import { useStore } from '../data/store';

const ACCOUNTS = [
  'Ancestral Supplements Ads',
  'Tian Lin',
  'Blackout Coffee Copy',
  'Cosy Box Gurgaon',
  'Wonderland4children',
  'Javvy Coffee',
  'UniversDuJapon',
  'Fun in Motion Toys',
  'Q30 Innovations',
  'PrivacyHawk',
  "Dippin' Daisy's",
  'Mix Tape Music Bingo',
];

const RAIL = [
  { icon: <CompassOutlined />, label: 'Inspo' },
  { icon: <BarChartOutlined />, label: 'Analytics', active: true },
  { icon: <BulbOutlined />, label: 'Creation' },
  { icon: <VideoCameraOutlined />, label: 'Assets' },
  { icon: <AppstoreOutlined />, label: 'Brands' },
];

function AccountList() {
  return (
    <div className="accounts">
      <div className="accounts-head">
        Ad accounts <span className="muted-dark">(26)</span>
      </div>
      {ACCOUNTS.map((a, i) => (
        <div key={a} className={`account ${i === 0 ? 'active' : ''}`}>
          <span className="meta-glyph">∞</span>
          {a}
        </div>
      ))}
    </div>
  );
}

export function Shell({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const wide = bp.xl;
  const [drawer, setDrawer] = useState(false);
  const { status, credits } = useStore();
  const running = Object.values(status).filter((s) => s.kind === 'generating').length;
  const unseen = Object.values(status).some((s) => s.kind === 'ready' && s.unseen);

  return (
    <div className="shell">
      {!mobile && (
        <nav className="rail" aria-label="Main">
          <div className="rail-logo">A</div>
          {RAIL.map((r) => (
            <Tooltip key={r.label} title={wide ? '' : r.label} placement="right">
              <div className={`rail-item ${r.active ? 'active' : ''}`}>
                {r.icon}
                <span>{r.label}</span>
              </div>
            </Tooltip>
          ))}
        </nav>
      )}
      {wide && (
        <aside className="sidebar">
          <div className="sidebar-title">Analytics</div>
          <AccountList />
        </aside>
      )}
      <div className="main">
        <header className="topbar">
          {!wide && <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="Ad accounts" />}
          <div className="topbar-title">
            <span className="meta-glyph blue">∞</span>
            <span className="ellipsis">{ACCOUNT.name}</span>
          </div>
          {header}
          <div className="topbar-right">
            {!mobile && (
              <span className="sync muted">
                <SyncOutlined /> Synced 1d ago
              </span>
            )}
            <Tooltip title="Image credits left on this workspace">
              <span className="credits">{credits.toLocaleString()} credits</span>
            </Tooltip>
            <Tooltip title="Generation tracker (screen 4)">
              <Badge count={running} size="small" dot={!running && unseen} offset={[-4, 4]}>
                <Button type="text" icon={<BellOutlined />} aria-label="Generation tracker" />
              </Badge>
            </Tooltip>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" width={300} title="Analytics" className="dark-drawer">
        <AccountList />
      </Drawer>
    </div>
  );
}

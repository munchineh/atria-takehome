import { useEffect } from 'react';
import { App as AntApp, ConfigProvider, Segmented } from 'antd';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGroup, MotionConfig } from 'motion/react';
import { StoreProvider } from './data/store';
import { Shell } from './components/Shell';
import { Radar } from './screens/Radar';
import { AdDetail } from './screens/AdDetail';
import { theme } from './theme';
import { ease, duration } from './motion/tokens';

function TopNav() {
  const loc = useLocation();
  const nav = useNavigate();
  return (
    <Segmented
      className="top-nav"
      value="radar"
      onChange={(v) => v === 'radar' && loc.pathname !== '/' && nav('/')}
      options={[
        { label: 'Overview', value: 'overview', disabled: true },
        { label: 'Radar', value: 'radar' },
      ]}
    />
  );
}

function Routed() {
  const loc = useLocation();
  useEffect(() => window.scrollTo({ top: 0 }), [loc.pathname]);
  return (
    <Shell header={<TopNav />}>
      <LayoutGroup>
        <Routes location={loc}>
          <Route path="/" element={<Radar />} />
          <Route path="/ad/:id" element={<AdDetail />} />
        </Routes>
      </LayoutGroup>
    </Shell>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntApp>
        {/* reducedMotion="user": transforms are skipped for people who ask for less motion; opacity fades stay. */}
        <MotionConfig reducedMotion="user" transition={{ duration: duration.base, ease: ease.standard }}>
          <StoreProvider>
            <BrowserRouter>
              <Routed />
            </BrowserRouter>
          </StoreProvider>
        </MotionConfig>
      </AntApp>
    </ConfigProvider>
  );
}

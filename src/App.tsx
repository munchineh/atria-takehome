import { useEffect } from 'react';
import { App as AntApp, ConfigProvider, Segmented } from 'antd';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGroup, MotionConfig } from 'motion/react';
import { StoreProvider } from './data/store';
import { Shell } from './components/Shell';
import { Radar } from './screens/Radar';
import { AdDetail } from './screens/AdDetail';
import { Results } from './screens/Results';
import { ImageAds } from './screens/ImageAds';
import { Editor } from './screens/Editor';
import { Overview } from './screens/Overview';
import { theme } from './theme';
import { ease, duration } from './motion/tokens';

function TopNav() {
  const loc = useLocation();
  const nav = useNavigate();
  // Overview and Radar switch pages and keep the account (chat 5c).
  return (
    <Segmented
      className="top-nav"
      value={loc.pathname.startsWith('/overview') ? 'overview' : 'radar'}
      onChange={(v) => nav(v === 'overview' ? '/overview' : '/')}
      options={[
        { label: 'Overview', value: 'overview' },
        { label: 'Radar', value: 'radar' },
      ]}
    />
  );
}

function Routed() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  return (
    <Shell header={<TopNav />}>
      <LayoutGroup>
        <Routes location={loc}>
          <Route path="/" element={<Radar />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/ad/:id" element={<AdDetail key={loc.pathname} />} />
          <Route path="/ad/:id/variations" element={<Results />} />
          <Route path="/ad/:id/variations/:vid" element={<Editor key={loc.pathname} />} />
          <Route path="/creation" element={<ImageAds />} />
        </Routes>
      </LayoutGroup>
    </Shell>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntApp notification={{ placement: 'topRight', top: 68 }}>
        {/* reducedMotion="user": transforms are skipped for people who ask for less motion; opacity fades stay. */}
        <MotionConfig reducedMotion="user" transition={{ duration: duration.base, ease: ease.standard }}>
          <StoreProvider>
            <HashRouter>
              <Routed />
            </HashRouter>
          </StoreProvider>
        </MotionConfig>
      </AntApp>
    </ConfigProvider>
  );
}

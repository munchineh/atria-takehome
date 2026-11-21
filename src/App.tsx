import { useEffect, useState } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutGroup, MotionConfig } from 'motion/react';
import { StoreProvider } from './data/store';
import { Shell } from './components/Shell';
import { ModeSwitch } from './components/ModeSwitch';
import { Radar } from './screens/Radar';
import { AdDetail } from './screens/AdDetail';
import { Results } from './screens/Results';
import { ImageAds } from './screens/ImageAds';
import { CreativePage } from './screens/CreativePage';
import { Editor } from './screens/Editor';
import { Overview } from './screens/Overview';
import { theme } from './theme';
import { ease, duration } from './motion/tokens';

function TopNav() {
  return <ModeSwitch />;
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
          {/* DL-06: rounds and the editor also live under Creation, so gallery tiles never leave it. */}
          <Route path="/creation/:id" element={<Results />} />
          <Route path="/creation/:id/:vid" element={<CreativePage key={loc.pathname} />} />
          <Route path="/creation/:id/:vid/edit" element={<Editor key={loc.pathname} />} />
        </Routes>
      </LayoutGroup>
    </Shell>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

export default function App() {
  const reduce = usePrefersReducedMotion();
  return (
    <ConfigProvider theme={{ ...theme, token: { ...theme.token, motion: !reduce } }}>
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

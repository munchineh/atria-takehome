import { hubCrumb } from '../data/nav';
import { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Overview and Radar switch (Item 13, DL-02; reworked 21 Nov after Mancini 09:43).
 *
 * Why it felt stunted: the thumb used layoutId on a span that unmounted with the route change, the page render
 * landed in the same frame as the slide, and the label weight jumped from 400 to 600 so the buttons changed width
 * mid-slide. Now: one thumb measured from the buttons and moved with x and width, the selection updates at once and
 * navigation runs a frame later inside startTransition, and the label weight never changes.
 * Motion: a soft spring with no overshoot, about a third of a second, like a native segmented control.
 * Icons play one short gesture when their side becomes active: bars dip in a wave; the radar's data shape reaches out along its fixed axes and settles back.
 */

const SLIDE = { type: 'spring', bounce: 0, visualDuration: 0.32 } as const;

function BarsIcon({ play }: { play: number }) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (play) void controls.start((i: number) => ({ scaleY: [1, 0.2, 1.15, 1], transition: { duration: 0.6, delay: i * 0.08, ease: [0.2, 0, 0, 1] } }));
  }, [play, controls]);
  const bars = [
    { x: 2.5, h: 6 },
    { x: 6.5, h: 10 },
    { x: 10.5, h: 4 },
  ];
  return (
    <svg className="ms-icon" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden>
      <path d="M1.5 14.5h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {bars.map((b, i) => (
        <motion.rect
          key={b.x}
          custom={i}
          animate={controls}
          x={b.x}
          y={13 - b.h}
          width="2.4"
          height={b.h}
          rx="0.6"
          fill="currentColor"
          style={{ originY: 1, transformBox: 'fill-box' }}
        />
      ))}
    </svg>
  );
}

/** Drawn like a real radar chart: the frame and axes stay put; the data shape inside reaches out along its axes and settles back. */
const AXES = [0, 72, 144, 216, 288].map((deg) => {
  const r = (deg - 90) * (Math.PI / 180);
  return { x: Math.cos(r), y: Math.sin(r) };
});
const REST = [0.78, 0.5, 0.68, 0.42, 0.6];
const PEAK = [1, 0.95, 0.35, 1, 0.92];
const pts = (vals: number[], radius = 6.2) => AXES.map((a, i) => `${(8 + a.x * radius * vals[i]).toFixed(2)},${(8 + a.y * radius * vals[i]).toFixed(2)}`).join(' ');

function RadarIcon({ play }: { play: number }) {
  const [shape, setShape] = useState(pts(REST));
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!play || reduce) return;
    // Mancini 10:48: the first pass was too subtle. Bigger reach, a ripple that travels round the spokes, about 0.7 s.
    const c = animate(0, 1, {
      duration: 0.7,
      ease: 'linear',
      onUpdate: (t) => {
        const k = Math.sin(t * Math.PI);
        setShape(pts(REST.map((v, i) => Math.min(1, Math.max(0.2, v + (PEAK[i] - v) * k + 0.18 * k * Math.sin(t * 2 * Math.PI * 1.5 + i * 1.3))))));
      },
    });
    return () => c.stop();
  }, [play, reduce]);
  return (
    <svg className="ms-icon" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
      <polygon points={pts([1, 1, 1, 1, 1])} strokeWidth="1.1" opacity="0.55" />
      {AXES.map((a, i) => (
        <line key={i} x1="8" y1="8" x2={8 + a.x * 6.2} y2={8 + a.y * 6.2} strokeWidth="0.8" opacity="0.35" />
      ))}
      <polygon points={shape} strokeWidth="1.2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

/** 262 (Mancini 17:36): Ad Library. Three ad cards stacked; on activation they fan out and settle, like flicking through ads. */
function LibraryIcon({ play }: { play: number }) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (play) void controls.start((i: number) => ({ rotate: [0, (i - 1) * 14, 0], x: [0, (i - 1) * 1.6, 0], transition: { duration: 0.6, ease: [0.2, 0, 0, 1] } }));
  }, [play, controls]);
  return (
    <svg className="ms-icon" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeLinejoin="round">
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          custom={i}
          animate={controls}
          x={3.5 + i * 0.5}
          y={2.5 + i * 1.6}
          width="9"
          height="10.5"
          rx="1.6"
          strokeWidth="1.2"
          fill={i === 2 ? 'currentColor' : 'none'}
          fillOpacity={0.3}
          opacity={i === 2 ? 1 : 0.55}
          style={{ originX: 0.5, originY: 1, transformBox: 'fill-box' }}
        />
      ))}
    </svg>
  );
}

/** 262: Creative Gallery. Four tiles; on activation they pop in turn, like images landing in a grid. */
function GalleryIcon({ play }: { play: number }) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (play) void controls.start((i: number) => ({ scale: [1, 0.55, 1.08, 1], transition: { duration: 0.5, delay: i * 0.07, ease: [0.2, 0, 0, 1] } }));
  }, [play, controls]);
  const tiles = [
    { x: 2, y: 2 },
    { x: 8.6, y: 2 },
    { x: 2, y: 8.6 },
    { x: 8.6, y: 8.6 },
  ];
  return (
    <svg className="ms-icon" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden>
      {tiles.map((t, i) => (
        <motion.rect
          key={i}
          custom={i}
          animate={controls}
          x={t.x}
          y={t.y}
          width="5.4"
          height="5.4"
          rx="1.3"
          fill={i === 1 ? 'currentColor' : 'none'}
          fillOpacity={0.3}
          stroke="currentColor"
          strokeWidth="1.2"
          style={{ originX: 0.5, originY: 0.5, transformBox: 'fill-box' }}
        />
      ))}
    </svg>
  );
}

type Opt = { value: string; label: string; to: string; Icon: (p: { play: number }) => React.JSX.Element };
const ANALYTICS: Opt[] = [
  { value: 'overview', label: 'Overview', to: '/overview', Icon: BarsIcon },
  { value: 'radar', label: 'Radar', to: '/', Icon: RadarIcon },
];
const CREATION: Opt[] = [
  { value: 'library', label: 'Ad Library', to: '/creation/ads', Icon: LibraryIcon },
  { value: 'gallery', label: 'Creative Gallery', to: '/creation', Icon: GalleryIcon },
];
type Mode = string;

export function ModeSwitch() {
  const loc = useLocation();
  const nav = useNavigate();
  // 262: in Creation the same switch reads Ad Library and Creative Gallery.
  const creation = loc.pathname.startsWith('/creation');
  const OPTIONS = creation ? CREATION : ANALYTICS;
  // Below the hubs (an ad, its rounds), the switch shows where you came from, like the breadcrumb.
  const routeMode: Mode = creation
    ? loc.pathname.startsWith('/creation/ads') || loc.pathname.startsWith('/creation/link')
      ? 'library'
      : 'gallery'
    : loc.pathname.startsWith('/overview') || (loc.pathname.startsWith('/ad/') && hubCrumb().to === '/overview')
      ? 'overview'
      : 'radar';
  const [active, setActive] = useState<Mode>(routeMode);
  const [plays, setPlays] = useState<Record<Mode, number>>({ overview: 0, radar: 0, library: 0, gallery: 0 });
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const first = useRef(true);

  useEffect(() => setActive(routeMode), [routeMode]);

  // Switching between areas jumps the thumb instead of sliding from the other area's position.
  useEffect(() => {
    first.current = true;
  }, [creation]);
  useLayoutEffect(() => {
    const measure = () => {
      const b = btns.current[active];
      if (b) setThumb({ x: b.offsetLeft, w: b.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, creation]);

  const choose = (m: Mode) => {
    if (m === active) return;
    setActive(m);
    setPlays((p) => ({ ...p, [m]: p[m] + 1 }));
    first.current = false;
    const to = OPTIONS.find((o) => o.value === m)!.to;
    // Let the slide start before the next page renders.
    requestAnimationFrame(() => startTransition(() => nav(to)));
  };

  return (
    <div className="mode-switch top-nav" role="tablist" aria-label="View">
      {thumb && (
        <motion.span
          className="mode-pill-thumb"
          aria-hidden
          initial={false}
          animate={{ x: thumb.x, width: thumb.w }}
          transition={first.current ? { duration: 0 } : SLIDE}
        />
      )}
      {OPTIONS.map((opt, idx) => {
        const selected = active === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              btns.current[opt.value] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`mode-pill-btn ${selected ? 'active' : ''}`}
            onClick={() => choose(opt.value)}
            onMouseEnter={() => setPlays((p) => ({ ...p, [opt.value]: p[opt.value] + 1 }))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                choose(OPTIONS[(idx + 1) % OPTIONS.length].value);
              }
            }}
          >
            <span className="mode-pill-content">
              <opt.Icon play={plays[opt.value]} />
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

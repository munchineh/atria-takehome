/**
 * Motion tokens. Every animation in the prototype uses these, nothing ad hoc.
 * Rules: animate transform and opacity only; motion explains a change of state
 * (where something came from, where it went), never decoration. Reduced motion
 * is handled globally by <MotionConfig reducedMotion="user"> in App.tsx, which
 * drops transforms and keeps opacity fades.
 */
import type { Transition } from 'motion/react';

/** Durations in seconds. */
export const duration = {
  /** Hover, press, checkbox ticks. Feels instant but not abrupt. */
  instant: 0.1,
  /** Small elements changing state: tags, status text, counters. */
  fast: 0.16,
  /** Default for content entering: cards, popovers, panels. */
  base: 0.24,
  /** Larger surfaces: page content, sticky bars, expanding lists. */
  slow: 0.36,
} as const;

/** Cubic-bezier curves. */
export const ease = {
  /** Default for things moving on screen. Quick start, soft landing. */
  standard: [0.2, 0, 0, 1],
  /** Things arriving. Decelerates hard so it settles, not drifts. */
  enter: [0.05, 0.7, 0.1, 1],
  /** Things leaving. Accelerates away; exits are shorter than entries. */
  exit: [0.3, 0, 0.8, 0.15],
} as const;

/**
 * Springs with bounce: 0 (critically damped): they settle without overshoot.
 * Mancini flagged visible bounce on 20 Nov, so nothing in the prototype overshoots.
 */
export const spring = {
  /** Selections, toggles, chevrons. */
  snappy: { type: 'spring', bounce: 0, duration: 0.18 },
  /** Sticky bar, sheets, placement bars. */
  gentle: { type: 'spring', bounce: 0, duration: 0.28 },
  /** Expanders and shared elements (row thumbnail → detail image). */
  layout: { type: 'spring', bounce: 0, duration: 0.24 },
} as const satisfies Record<string, Transition>;

/** Delay between siblings in a list. Short so long lists don't feel slow. */
export const stagger = { list: 0.015, cards: 0.03, maxItems: 8 } as const;

/** Reusable variants. */
/** Plain fade (name kept for existing imports). No movement: content appears where it lives. */
export const fadeUp = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.fast, ease: ease.standard } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.exit } },
};

export const swap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.fast, ease: ease.standard } },
  exit: { opacity: 0, transition: { duration: duration.instant, ease: ease.exit } },
};

export const pageTransition = {
  // Opacity only: sliding whole pages reads as jitter on phones (flagged 19 Nov).
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.fast, ease: ease.standard } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.exit } },
};

export const listDelay = (i: number) => Math.min(i, stagger.maxItems) * stagger.list;

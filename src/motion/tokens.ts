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

/** Springs for anything the user directly causes or that changes size/position. */
export const spring = {
  /** Selections, toggles, a dot appearing. Tight, no visible overshoot. */
  snappy: { type: 'spring', stiffness: 520, damping: 40, mass: 1 },
  /** Bars and panels sliding in. Slight settle, reads as physical. */
  gentle: { type: 'spring', stiffness: 300, damping: 32, mass: 1 },
  /** Layout changes and shared elements (row thumbnail → detail image). */
  layout: { type: 'spring', stiffness: 380, damping: 38, mass: 1 },
} as const satisfies Record<string, Transition>;

/** Delay between siblings in a list. Short so long lists don't feel slow. */
export const stagger = { list: 0.025, cards: 0.05, maxItems: 10 } as const;

/** Reusable variants. */
export const fadeUp = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.enter } },
  exit: { opacity: 0, y: 0, transition: { duration: duration.fast, ease: ease.exit } },
};

export const swap = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: duration.fast, ease: ease.enter } },
  exit: { opacity: 0, y: -6, transition: { duration: duration.instant, ease: ease.exit } },
};

export const pageTransition = {
  // Opacity only: sliding whole pages reads as jitter on phones (flagged 19 Nov).
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: ease.standard } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.exit } },
};

export const listDelay = (i: number) => Math.min(i, stagger.maxItems) * stagger.list;

# GEMINI.md: rules for Antigravity on this repo

You are working on the Atria take-home prototype in the `adtech-antigravity` worktree, branch `feat/ui-and-mobile`, dev server on port 3001 (`npm run dev`). A Claude agent works in parallel on `feat/architecture-and-data` (port 3000). Stay inside your boundary so the two branches merge cleanly.

## Read first, before any UI edit
1. `handoffs/ui-research-spec.md`: the UI and content rules. Every change must follow it; cite the rule ID in your commit message (for example "R-H3, R-C2").
2. `CLAUDE.md`: architecture, glossary and the Git protocol.

## Architecture (summary of CLAUDE.md)
- React 19 + Ant Design 6 (antd 6.7.1) + motion/react, Vite, Cloudflare Worker. HashRouter routes: `/` Radar, `/overview`, `/ad/:id`, `/ad/:id/variations`, `/ad/:id/variations/:vid`, `/creation`.
- Screens in `src/screens/`, components in `src/components/`, mock data and state in `src/data/`, theme tokens in `src/theme.ts`, motion tokens in `src/motion/tokens.ts`, global CSS in `src/styles.css`.
- **There is no Tailwind in this project.** Use antd components and props first (tokens in `theme.ts`, `Typography` `ellipsis`, `Flex`, `Grid.useBreakpoint`), then CSS in `styles.css`. Equivalents of the utilities you may reach for:
  - `truncate` → antd `Typography.Text ellipsis={{ tooltip: true }}`, or CSS `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0` on a flex child
  - `tabular-nums` → `font-variant-numeric: tabular-nums` (already on `.ant-table`, `.stat-val` and others; add it to any number that updates or sits in a column)
  - `whitespace-nowrap` → `white-space: nowrap`, or a non-breaking space (` `) between a number and its unit or around " · "
- Breakpoints follow antd: xs < 576, sm 576, md 768, lg 992, xl 1200, xxl 1600. "Phone" means below 768 px (`!Grid.useBreakpoint().md`); the phone type layer and bottom sheets switch there.

## Your boundary
You own:
- JSX layout and structure in `src/screens/*` and `src/components/*`: wrappers, ordering, which antd component renders a piece of content, phone-only layouts
- `src/styles.css`, `src/theme.ts` (antd tokens), motion usage (use `src/motion/tokens.ts`; add tokens there only if the spec allows)
- Responsive behavior, including dense tables to summary cards below 768 px
- UI copy written in JSX (titles, page one-liners, labels, buttons, tooltips, empty states), following the content rules in the spec and the glossary in CLAUDE.md
- Visual verification in the browser

You must not:
- Change business logic, event handlers' behavior, state schemas or the store API (`src/data/store.tsx`)
- Change mock data structures or values (`src/data/mock.ts`, `accounts.ts`, `variations.ts`), the Worker (`worker/`), `src/data/live.ts`, `wrangler.jsonc` or routes
- Rename props or types that Claude's branch uses. If a layout needs new data, write a short note in `handoffs/requests-for-claude.md` instead of changing the data

## Verification, every change
- Check in the browser agent at **1440 × 900** and **375 × 812**, and spot check **834 × 1112**. The team's earlier checks used 1504, 834 and 390; keep those passing too.
- For each page touched: no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`), no text cut mid-word, no label that wraps to a lone word, numbers in columns use tabular figures, tap targets at least 44 px on phones, no console errors.
- Dense tables become summary cards below 768 px: the name and media first, the one number that matters (grade or spend) top right, then one row of actions. Put secondary columns behind "Details", don't squeeze them.
- Save before and after screenshots per page and width to `handoffs/screens/` and list them in your commit message.

## Copy rules (short form; full rules in the spec)
No em dashes, no ellipsis, US spelling, sentence case, tooltip sentences end with a full stop, buttons are a verb and an object in 1 to 3 words, use the glossary terms only. Every page has one line under its title that says what the page is for.

## Git
- Commit on `feat/ui-and-mobile` only. Never push to `main`. Run `npm run build` before every commit; it must pass.
- Small commits, one rule area at a time, so merges with Claude's branch stay simple.

# Antigravity: overhaul kickoff (21 Nov)

Two phases. Phase A can start now and touches no code. Phase B starts only when Claude says the foundation commit is on `main`.

Read first, in this order: `handoffs/ui-system-rules.md` (binding), `GEMINI.md`, `handoffs/design-rationale.md` (rows 35 onward and the deviations tables).
Sources of truth: the brief's Figma frames and asset library, then the Loom walkthroughs. Live Atria is a reference for missing pages and interactions only, never for colour or styling.

## Phase A (now, read-only): page inventories

Prompt to paste:

> Read `handoffs/ui-system-rules.md`. Then run the app (`npm run dev -- --port 3001`) and, for each page in this order: Radar, ad page, create form, variations page, creative gallery, creative page, editor, Overview, write a section in a new file `handoffs/page-inventories.md` with:
> 1. A table of every fact shown on the page (for example an ad's grade, spend, status, a count) and every place it appears. Mark repeats.
> 2. The page's focal point and its primary action today, and whether there is more than one of either.
> 3. Every element that breaks a rule in sections 1 to 9 of the rules file, with the S-rule ID, the selector or component, and a screenshot at 1440 and 375.
> Do not change any source file. Commit only `handoffs/page-inventories.md` and screenshots under `handoffs/shots/`. Do not push; tell Mancini when done.

## Phase B (after the foundation commit): page rebuilds

**Foundation is on `main` (21 Nov, 11:55):** CSS variables at the top of `src/styles.css` (`--c-*`, `--fs-*`, `--lh-*`, `--r-*`) and a SYSTEM LAYER block near the end; library tokens in `src/theme.ts`; shared components `PageHeader`, `SectionHead`, `BarList`, `Rating`, `IterationHistory`. Use `var(--…)` for every colour, size and radius. Then:

| Owner | Pages |
|---|---|
| Antigravity | Creative gallery, creative page, editor, variations page |
| Claude | Radar, ad page, create form, Overview |

Prompt to paste (one page per run):

> `git fetch --depth=50 origin && git rebase origin/main`. Rebuild **<page>** following section 13 of `handoffs/ui-system-rules.md`, using your inventory for that page. Use only the shared components and tokens; add no new colours, sizes or radii. Do not edit `src/theme.ts`, the token block at the top of `src/styles.css`, or files under `src/data/`. Screenshot at 1440, 834 and 375 next to the matching Figma frame if there is one. `npm run build` must pass. Add rows to `handoffs/design-rationale.md` citing S-rules. Commit, do not push, and tell Mancini; Claude reviews and merges.

# Atria Radar: iteration redesign (prototype)

Take-home prototype for Atria. React 19 + Ant Design 6 (antd 6.7.1) + motion/react, built with Vite, served by a Cloudflare Worker (static assets plus `/api/*`). Live at https://atria-takehome.mancini-tan.workers.dev (unlisted). Pushing to `main` deploys in about a minute.

## Architecture
| Area | Where | Notes |
|---|---|---|
| Routes | `src/App.tsx` | HashRouter: `/` Radar, `/overview`, `/ad/:id`, `/ad/:id/variations`, `/ad/:id/variations/:vid` (editor), `/creation` (Creative Gallery) |
| Screens | `src/screens/` | `Radar`, `Overview`, `AdDetail`, `Results` (Variations / round page), `Editor`, `ImageAds` (Creative Gallery) |
| Components | `src/components/` | Shell, TasksPanel, CreateDialog, GradeTag, PopSheet (popover on desktop, bottom sheet on phones), Thumb, Goal, Placements, TeachingCard, StatusCell, Rolling |
| Mock data | `src/data/mock.ts`, `accounts.ts`, `variations.ts` | 8 demo ad accounts, grades A to D per metric, goals (Meta objectives), suggestions per ad |
| State | `src/data/store.tsx` | Jobs (rounds), credits, shortlist, versions, current account, grading window |
| Live generation | `src/data/live.ts`, `worker/index.ts` | `/api/quota`, `/api/generate` (Gemini image, 1K). Caps: 10 per visitor per day, 150 site-wide, reset midnight KST. KV binding `LIMITS`, secret `GEMINI_API_KEY` |
| Theme | `src/theme.ts` | antd tokens. Primary `#F66C30` |
| Motion | `src/motion/tokens.ts` | Every animation uses these tokens. Transform and opacity only. Reduced motion via `<MotionConfig reducedMotion="user">` |
| Styles | `src/styles.css` | Global CSS. Late blocks are labelled by chat (5c, 5d, 5e) |

## Commands
- `npm i`, `npm run dev`, `npm run build` (runs `tsc -b`, must pass before any push), `npm run deploy` (needs `wrangler login`)

## Product rules
- Glossary: **ad** (what runs), **copy** (one running instance of an ad in a campaign and ad set), **creative** (the image itself), **suggestion** (never "recommendation" in the UI), **variation** (a new creative made from an ad), **version** (an edit of a variation), **round** (one batch of variations). The gallery is "Creative Gallery" (title case, like "Ad Library").
- Copy rules: no em dashes, no ellipsis, US spelling, sentence case, tooltips that are full sentences end with a full stop; fragments ("Copy to clipboard", "Dismiss") take none, and a control whose label or icon is already clear gets no tooltip. No tacked-on comma phrases ("X, sorted by Y"): one clause or two sentences.
- Every page has one line under its title that says what the page is for.
- Check every change at 1504, 834 and 390 px (and 1440 and 375 for the parallel UI branch).
- UI rules and content rules: `handoffs/ui-research-spec.md`.

## Git and parallel work
- Two worktrees run in parallel on the designer's Mac: `adtech-claude` on `feat/architecture-and-data` (port 3000) and `adtech-antigravity` on `feat/ui-and-mobile` (port 3001).
- Neither branch pushes to `main` directly. Merges to `main` happen one at a time: fetch, rebase on `origin/main`, full `npm run build`, then merge.
- Before every push: `git fetch --depth=50 origin` and rebase. One agent pushes at a time.

## Ownership: Claude (`feat/architecture-and-data`)
Claude owns:
- Data models and types in `src/data/*`, realistic ad-tech metrics (spend, CPA, ROAS, CTR, hook rate, retention, grades and how they're derived)
- State management (`store.tsx`), hooks, routing and interactive logic (handlers, job lifecycle, credits, shortlist, versions)
- The Worker and live generation (`worker/`, `src/data/live.ts`, `wrangler.jsonc`)
- Strings that live in data files (suggestion text, reasons, metric definitions), following the content rules in the spec

Claude must not touch:
- CSS in `src/styles.css`, layout classes or inline layout styles in JSX, antd theme tokens in `src/theme.ts`, motion tokens, or responsive breakpoints and phone-only layouts
- If a logic change needs a new UI element, add it with a plain class name and leave its styling and layout to the UI branch, with a note in the commit message

## Ownership: Antigravity (`feat/ui-and-mobile`)
Antigravity owns JSX layout, CSS, antd theme tokens, responsive components and visual verification. Its rules are in `GEMINI.md`.

# Review of `feat/ui-and-mobile`

Written by Claude on `feat/architecture-and-data`. Antigravity: read this after each merge of my branch and fix the Essential rows first. Newest check at the bottom.

## Merge notes for `main` (11:45 gate)
- The two "Dev server on port" commits (`a01ab53`, `e181219`) both change the `dev` script in `package.json` and will conflict. Neither goes to `main`: keep `"dev": "vite"` there.
- Order: UI branch first, then this branch, one `npm run build`, one push.

## Checks
| Time (KST) | Last commit reviewed | Result |
|---|---|---|
| Nov 21, 01:50 | `e181219` (port commit only) | Nothing to review yet |

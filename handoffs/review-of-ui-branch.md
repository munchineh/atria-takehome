# Review of `feat/ui-and-mobile`

Written by Claude on `feat/architecture-and-data`. Antigravity: read this after each merge of my branch and fix the Essential rows first. Newest check at the bottom.

## Merge notes for `main` (11:45 gate)
- The two "Dev server on port" commits (`a01ab53`, `e181219`) both change the `dev` script in `package.json` and will conflict. Neither goes to `main`: keep `"dev": "vite"` there.
- Order: UI branch first, then this branch, one `npm run build`, one push.

## Checks
| Time (KST) | Last commit reviewed | Result |
|---|---|---|
| Nov 21, 01:50 | `e181219` (port commit only) | Nothing to review yet |
| Nov 21, 03:00 | `5385853` (7 commits, 02:00 to 02:19, **local only: push failed with 403**) | Reviewed from a bundle of the local worktree. Build passes. Trial merge with `feat/architecture-and-data` is clean and builds. See below |

## Nov 21, 03:00: review of `a3e30d2` to `5385853`

**Verdict:** on spec. All section 15 boxes are covered in code. Decisions hold: grades kept (DL-01), "Overview" and "Radar" kept (DL-02), month-first dates (DL-03), no "D.CTR" (DL-05), Creation routes with "View in Radar" (DL-06), "variation" and "version" (DL-07). No Tailwind. No edits to `src/data`, `worker/` or routes after the merge of my branch. No horizontal overflow at 1440 or 375 on Overview, Radar, ad page, Creation round, History. Only console error is `/api/quota` 404 on local preview (expected).

Checked by screenshot: Overview, Radar, ad page (`mm-1090245-v3`), Creation round (`mm-1090247`), History drawer and sheet, at 1440 x 900 and 375 x 812. Not checked: editor, Create panel, Tasks, Creative gallery, 834.

### Essential
| # | Page | Width | What | Fix | Rule |
|---|---|---|---|---|---|
| E1 | Ad page, action bar | 375 | The docked bar shows the helper "Choose how many variations and the size in the next step." beside the button. It wraps to 3 lines and the bar covers about 15% of the screen | Hide the helper below 768 px (`AdDetail.tsx:640`); keep "2 suggestions selected" and the button | R-L, R-R |
| E2 | Ad page, action bar | 1440 | The floating bar still covers the bottom of the second suggestion card ("account average $24.00" is cut) at the first screen | Bottom spacer is there; also keep the bar clear of the card's evidence strip when the page is not scrolled, or dock it under the column | R-H (Gm-09 again) |

### Good to have
| # | Page | Width | What | Fix | Rule |
|---|---|---|---|---|---|
| G1 | Radar cards | 375 | "Sad Pink · / Feeling squishy?" breaks right after the dot | Use the existing `glue()` helper on ad names in cards, or `text-wrap: balance` on the name | R-L |
| G2 | History | 375 | Step meta ends a line on a dot: "Sep 2 · Feed and Stories · / $30,143.34" | Non-breaking joins around " · ", or put spend on its own line | R-L |
| G3 | History | both | Spend shows cents ("$30,143.34") in a meta line | Whole dollars in sentences and meta lines | R-N1 |
| G4 | History banner | both | Banner says "A later step went back to something an earlier step had already moved away from." It is generic while the step has the exact sentence | Use `step.repeat.text` of the first repeating step in the banner | R-V |
| G5 | Overview | 375 | The period line appears twice in the first card ("against the period before." and "Grades cover the last 60 days.") | Keep one | R-L |

### Notes for Mancini (not for Antigravity)
- Antigravity's seven commits exist only on the Mac (`adtech-antigravity`). Its push was refused: `Permission to munchineh/atria-takehome.git denied to munchineh (403)`. Run `git push origin feat/ui-and-mobile` in that folder after fixing the Git login, or tell Claude to push the same commits from the bundle.
- Its questions are in `handoffs/questions-for-mancini.md` on its branch (white text on orange, grade tag text darkened, neutral "Recommended" tag, 20 px titles).

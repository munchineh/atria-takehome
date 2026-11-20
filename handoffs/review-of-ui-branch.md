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
| Nov 21, 04:00 | `5385853` (no new commits; still local only) | Second pass on the pages not checked at 03:00: editor, Create panel, Creative gallery, Tasks, Radar at 834. No overflow, no console errors. Findings E3, E4, G6 to G9 below |

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

## Nov 21, 04:00: second pass (editor, Create panel, gallery, Tasks, 834)

### Essential
| # | Page | Width | What | Fix | Rule |
|---|---|---|---|---|---|
| E3 | Editor (Creation) | 375 | The breadcrumb "Creative gallery / Mystery box · Stack / Round 1 · Nov 20 / Product detail" wraps to 3 lines beside the Creation tag, with a slash ending two of them | On phones use one back link to the round ("‹ Round 1 · Nov 20"), as the round page does (`.phone-back`) | R-L, R-R |
| E4 | Creative gallery | 375, 1440 | The floating teaching card covers the list: on phones it hides the second row and everything under it; on desktop it sits on the third row's status ("Generating 8", grade) | On phones show it inline above the list (or as a sheet); on desktop keep it clear of the rows | R-E, R-H |

### Good to have
| # | Page | Width | What | Fix | Rule |
|---|---|---|---|---|---|
| G6 | Editor | 375 | The docked "Uses 4 of 1,298 credits" bar with a disabled "Apply change" is always on screen and covers the image before anything is typed | Show the docked bar only once there is a change to apply | R-R |
| G7 | Create panel | 1440 | "Pre-fill from suggestions", "Rewrite from a product page" and "Change" are small orange text links on the dark panel; orange on dark at 12 px is hard to read and they do not look like actions | Use the dark theme's link color or small default buttons | R-C |
| G8 | Creative gallery | both | "5 ads with variations" counts a cloned creative and a from-scratch project, which are not ads | "5 sets of variations", or count ads and projects apart | R-T |
| G9 | Editor banner | 1440 | For a ROAS suggestion the banner shows "ROAS 1.31" with no grade tag and no word on why | Show the grey "No grade" tag used on the ad page, same tooltip | R-I |

### For Mancini
- The gallery teaching card still says "Open that ad in Radar to see every round" with "Open Radar" as its main button. That is your wording (C5d-23), but it now pulls people out of Creation, against DL-06. Suggest: "Each round is saved with the ad it came from. Find them all here, grouped by ad." with one "Got it" button.

## Nov 21, 08:35: decisions from Mancini to apply (spec section 14, DL-08 to DL-13)
| # | Do | Where |
|---|---|---|
| D1 | Radar one-liner becomes "Find out how each ad is performing and what to do next." | `Radar.tsx` page subtitle (DL-08) |
| D2 | Gallery teaching card: body "Each round is saved with the ad it came from. Find them all here, grouped by ad.", one "Got it" button, remove "Open Radar" | `TeachingCard.tsx` (DL-13); also fixes E4 if shown inline on phones |
| D3 | No change needed: white on orange, darker grade letters, neutral tags and 20 px titles are confirmed | DL-09 to DL-12 |

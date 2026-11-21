# Figma deviation audit (Nov 21, 12:40)

Test for every row: is there a strong reason to differ from the brief's Figma (FG1, FG2, FG3, FG5, FG6)? "Strong" means Mancini approved it, or it fixes a real problem the Figma has. Style preference alone is not a reason.

## Revert to Figma (no strong reason)

| # | Where | Figma | Ours | Fix |
|---|---|---|---|---|
| R1 | Sidebar in Creation | FG6: Creation nav ("Image Ads", "AI Playground") | The same ad account list as Analytics | Show Creation's own nav: Creative Gallery |
| R2 | Top bar on Radar | FG1: quiet meta "7-day click, 1-day view" beside Synced | Synced only | Add the attribution window as meta (S-30 already lists it) |
| R3 | Radar filter position | FG1: "Dimension filter" on the left, column tools on the right | Filter on the right | Filter moves left, next to the period |
| R4 | Create form, brief | FG3: URL field with Generate, "Or import a brief", textarea always visible | A chooser of three start cards before the textarea | FG3 layout; "Fill in from the suggestions" becomes the import link |
| R5 | Ad page, persona | FG2: chips with an emoji and ⓘ | Cards with "Not right?" | FG2 chips; "Not right?" moves into the ⓘ popover |

## Keep (strong reason)

| # | Where | Figma | Ours | Reason |
|---|---|---|---|---|
| K1 | Overview / Radar switch | Sidebar items | Top bar switch | D1, approved |
| K2 | Theme | Dark, magenta (live Atria) | Light, orange | D2, the brief's library |
| K3 | Radar row action | "Iterate ▾" popover | "Improve CPA" button to the ad page | C5d-21, Mancini's wording; says what to fix |
| K4 | Radar column names | "ROAS-G", "Hook-G" | "Conversion", "Hook" | "-G" is jargon; the column is a grade by position |
| K5 | Radar names | One line, ellipsis | Wrap to two lines | 5c A-01: many names share a prefix ("Sad Pink · …"), so truncation hides the part that differs |
| K6 | Radar accuracy | Sentence in the subtitle | Card with a progress bar | D6, approved |
| K7 | Create button | Primary "Iterate ads" in the Recommendations header | Dark bar that morphs into the form | V-11, approved |
| K8 | Copies list | Plain list with IDs | Spend bars and expandable rows | D4, approved |
| K9 | Gallery | FG6 project cards, filter selects in the header | Creative cards, Filter and Display menus, origin tabs, archive | D5, D11, Mancini 10:34 and 11:00 |
| K10 | Overview | No frame | Built from live Atria's sections | V-13 |
| K11 | Ad page as a route | FG2: full-screen overlay with X | Page with breadcrumb | Shareable link and browser back; same content |

## Needs Mancini's call (some reason, but the Figma is simpler)

| # | Where | Figma | Ours | Trade-off |
|---|---|---|---|---|
| Q1 | Ad page structure | FG2: "Performance / AI Recommendation" switch, then Performance, Persona, Issues, Recommendations tabs | One scroll: Summary, Suggestions, Likely audience | Ours keeps suggestions and the numbers they cite on one screen; FG2's is shorter per view |
| Q2 | Suggestions | FG2/FG5: table (Recommendation, Metrics, Example, Iterate ads thumbnails) | Cards with checkbox, evidence, ideas, helpful | Cards let you pick which to apply and show the evidence; the table is calmer and FG5 shows results inline |
| Q3 | Issues | FG2: separate "Top issues identified" list | Each issue is the first line of its suggestion | Ours says each problem once; FG2 lets you scan problems before fixes |
| Q4 | Radar "Show ad status" | FG1 toggle | Status always in the sub-line | Toggle keeps rows to one line; ours shows it without a click |

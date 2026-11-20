# UI research spec: visual and mobile layer

Implementation rules for Antigravity on `feat/ui-and-mobile`. Derived from two research reports: "Atria content and design guide" (the master guide) and "Antd hierarchy and motion for Atria". Rule IDs are the guide's own and are not renumbered, so Figma callouts, commits and code all cite one source.

Levels: **E** = Essential (a reviewer would notice, or it affects accessibility or trust). **G** = Good to have (polish).
"Inferred" = no published source gives the number; it is a team working rule. Check it by rendering.
"Open" = a decision Mancini has not made yet. Implement the stated default until a row in section 14 says otherwise.

---

## 0. How to use this spec

### Read order

| Step | Read | Why |
|---|---|---|
| 1 | Section 0 (this section) and `GEMINI.md` | Boundary and verification |
| 2 | Section 4 glossary (R-T) | Wins every conflict |
| 3 | The section for the area you are changing | Rules to apply |
| 4 | Section 12 backlog | Known issues already located for you |
| 5 | Section 13 checklist | Run before every commit |
| 6 | Section 14 decisions log | Overrides any "Open" default in this file |

### Conflict order

When two rules disagree: 1. Glossary (R-T). 2. Accessibility (R-A, R-C). 3. Intent to component map (R-I). 4. Everything else. A row in the decisions log (section 14) overrides all of these.

### Citing rules

| Where | Format | Example |
|---|---|---|
| Commit message | Rule IDs exactly as written here, no zero padding | `fix(radar): one status word (R-T9, R-M3) K1` |
| Code comment, only where the reason is not obvious | `// R-C2` | `colorLink: '#a83411', // R-C2` |
| Known issue | K-ID next to the rule | `K17 R-AI6` |
| Decision | DL-ID | `DL-03` |

Note: `GEMINI.md` shows "R-H03, R-C12" as an example. Use "R-H3"; there is no R-C12.

### Boundary summary

| Antigravity owns | Antigravity must not change |
|---|---|
| JSX layout and structure in `src/screens/*`, `src/components/*` | Business logic, handler behavior, state schemas, store API (`src/data/store.tsx`) |
| `src/styles.css` | Mock data structures or values (`src/data/mock.ts`, `accounts.ts`, `variations.ts`) |
| antd tokens in `src/theme.ts` | Shared helpers in `src/data/*` (for example `money`, `plural`, date strings) |
| Motion usage from `src/motion/tokens.ts` (new tokens only where section 10 allows) | `worker/`, `src/data/live.ts`, `wrangler.jsonc`, routes in `src/App.tsx` |
| Responsive components, phone-only layouts | Props or types used by Claude's branch |
| UI copy written in JSX: titles, one-liners, labels, buttons, tooltips, empty states, toasts called from JSX | Strings that live in data files (suggestion text, reasons, metric definitions) |
| Visual verification in the browser | |

If a layout needs data that does not exist, write a request in `handoffs/requests-for-claude.md`. Do not add it yourself.

---

## 1. Content hierarchy

Each page reads top to bottom: title, one-liner, meta line (period, sync), then sections. Labels recede, values carry weight.

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-P1 | Page title is a short noun phrase naming the place, sentence case, no punctuation, identical at every width. | Compare title text at 1440 and 375 on every route. Strings must match exactly. | E |
| R-P2 | Every page and every page-like panel (Tasks, Create panel) has exactly one line under its title. | Open each route plus Tasks and Create panel at 1440. Count one line element under the title. | E |
| R-P3 | The line starts with a verb and states the user outcome ("what can I do here"). | Read the first word of each line: it is a verb. | E |
| R-P4 | The line does not repeat the title or name its own feature ("Radar grades" under "Radar"). | Search the line for the title word. | E |
| R-P5 | No method, conditions, counts or marketing in the line. Method goes behind "How X works", conditions in an Alert, counts in a meta line. | Line has no digits and no "because", "if", "trained". | E |
| R-P6 | Line is 90 characters or fewer: one line at 1440 and 1504, at most two lines at 375 and 390. (Inferred.) | Count characters. Render at 1440 (1 line) and 375 (2 lines max). | E |
| R-P7 | Sibling pages share key words: Overview and Radar both say "fix first". | Compare Overview and Radar lines. | G |
| R-P8 | The line is one sentence and ends with a period. | Exactly one period, at the end. | E |
| R-H3 | Label: grey 12 px (`colorTextSecondary`). Value: dark 14 px (`colorText`). One emphasis per element: size, or color, or weight. Never bold label plus bold value. | Inspect computed styles on any label and value pair at 1440. | E |
| R-A7 | Page title is the only H1. Section and card titles are H2. Annotate levels in Figma. | Devtools: one `h1` per route; card titles are `h2`. | G |

### Hierarchy roles

| Role | Desktop and tablet | Phone (below 768) | Token |
|---|---|---|---|
| Page title | 20 / 600 (Open: 20 or 24, default 20 until Mancini decides) | 20 / 600 | `fontSizeHeading4` |
| Page one-liner | 14 / 400, secondary | 14 / 400, secondary | `fontSize`, `colorTextSecondary` |
| Meta line (period, synced) | 12 / 400, tertiary | 12 / 400, tertiary | `fontSizeSM`, `colorTextTertiary` |
| Section or card title | 16 / 600 | 16 / 600 | `fontSizeLG`, Card `headerFontSize` |
| KPI value | 24 / 600 | 20 / 600 | Statistic `contentFontSize` |
| Body, table cell, value | 14 / 400 | 14 / 400 (inputs 16) | `fontSize` |
| Label, count | 12 / 400, secondary | 12 / 400, secondary | `fontSizeSM` |

---

## 2. KPI prioritization per page

The guide gives the principles (R-H5 at most 2 large elements, R-H8 one semantic color per card, R-AI2 grade implies action). The R-K rules below are spec additions that apply those principles to Atria's pages. All are inferred.

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-K1 | Goal metric first. Wherever an ad's metrics appear, the metric matching the ad's goal comes first after the Overall grade (Sales: CPA; Traffic: CTR; use the goal-to-metric mapping already in data, do not invent one). | On an ad page and a Radar row for a Sales ad and a Traffic ad, the first metric after Overall differs accordingly. | E |
| R-K2 | Overview KPI row order: Spend (the one hero), then the goal result pair (Purchases, CPA), then ROAS, then CTR. Exactly one `hero`. Phone: hero full width (`xs={24}`), others 2 per row (`xs={12}`). Tablet: 2 or 3 per row. | Overview at 1440: one row, Spend first and larger. At 375: Spend alone on row 1, then 2 per row. | E |
| R-K3 | Radar desktop table: Ad column, then Overall grade, then the goal metric, then remaining metrics, then Next step. At 834 hide lower-priority metric columns (L-140) rather than scroll silently; keep Ad, Overall, goal metric, Next step. | Radar at 1440 and 834. At 834 no horizontal scroll bar on the table. | E |
| R-K4 | Phone summary card shows grade + one number: Overall grade top right, with the goal metric value under or beside it. If the ad has no grade ("Not enough data"), the one number is Spend. No other numbers on the card face. | Radar at 375: each card has one grade and one number at top right. | E |
| R-K5 | Ad page stat strip order: Overall, goal metric (grade + value), other graded metrics, Spend, ROAS. Phone: wraps into a 2-column grid, Overall and goal metric in row 1, no horizontal scroll. | Ad page at 1440 (one row) and 375 (grid, first row Overall and goal metric). | E |
| R-K6 | KPI tile anatomy: label 12 secondary on top, value 24 (20 on phone) tabular, help line 12 tertiary below. Help line compares with the account average where one exists, using the same format as the value. | Inspect one tile at 1440 and 375. | G |

---

## 3. Metric formatting

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-M8 | Numerals always, thousands comma via `toLocaleString('en-US')`. Never "1298", "12k" or "1.2M". | Search rendered text for 4+ digit runs without commas and for `k`/`M` suffixes. Credit balance shows "1,298". | E |
| R-M9 | Money: 2 decimals in tables, panels and stat strips (`money()`), none in sentences ("about $2,141 spent so far"). | Ad page sentence vs stat strip at 1440. | E |
| R-N1 | KPI hero values (24/20 px) show whole dollars ("$214,060"). Every other non-sentence amount keeps 2 decimals. Spec addition, inferred, matches the current Overview. | Overview Spend tile vs CPA tile. | G |
| R-N2 | Rates (CTR, hook rate, retention): 2 decimals plus "%" with no space ("2.41%") in tables and KPIs. In sentences, 1 decimal ("2.4%"). Spec addition, inferred. | Overview CTR tile and any sentence with a rate. | E |
| R-N3 | ROAS: 2 decimals, no "x" suffix, same format on every page ("2.35"). The ad page currently prints the raw value; format it in JSX. Spec addition, inferred. | Overview ROAS tile and ad page ROAS stat show 2 decimals. | E |
| R-N4 | A comparison ("Account average $42.10") uses the same decimals and unit as the value it compares with. Spec addition. | Overview CPA and CTR help lines. | G |
| R-H7 | Numbers in tables, KPIs, stat strips and any number that updates use `font-variant-numeric: tabular-nums`. Empty cells show "-". Status and action columns stay on one line. | Computed style on numeric cells. Column digits align at 1440. | E |
| R-L9 | Non-breaking space between a number and its unit ("5 MB", "1,298 credits", "60 days"), inside "credits returned", and before " · ". Keep a link and its closing punctuation in one text node. | At 375, no unit or " · " starts a line on its own. | E |
| R-M5 | Ranges use "to": "21 Sep to 19 Nov", "5 to 10 variations". No en dash or hyphen. | Search rendered text for the en dash (U+2013) and digit-hyphen-digit. | E |
| R-M10 | One date and time format everywhere. Relative times spelled out: "2 hours ago", "1 day ago", "about 2 minutes left". Open: default until Mancini decides is the current build format, "21 Oct" and "19 Nov, 13:43" (24-hour), year only when not the current year. Date strings built in data are Claude's. | Every visible date matches "D Mon" or "D Mon, HH:MM". No "1d", "2h". | E |
| R-M11 | Every count goes through the shared `plural()` helper ("1 day", "1 variation"). Small sets get words ("Show both suggestions", not "Show all 2"). Changes to the helper itself are Claude's. | Force count 1 (one variation, one failure) and read the string. | E |

---

## 4. Microcopy rules

### 4.1 Voice

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-V1 | Say what Atria found, then what to do next; lead with the action, back it with the number. | Read each new string: finding then action. | E |
| R-V2 | Plain words, about US grade 7. No jargon or internal names ("tracker", "batch size", "concept"). | Search for banned internal words. | E |
| R-V3 | Second person, active voice, present tense. | Read new strings. | E |
| R-V4 | Tone follows state: first use supportive, success brief plus next step, problems direct without repeated apology, frequent messages shortest. | Compare empty, success and error strings on one flow. | E |
| R-V5 | No "!", no "please", "simply", "just", no "click" (use "select" or "choose"). | `grep -nE "!['\"<]|please|simply|just |click" src/screens src/components` on string literals. | E |
| R-V6 | Only state what Atria can know. Inferred output says "Likely", "Predicted" or "Estimated". No roadmap promises ("coming soon"). | Search for "coming", "soon", "will be". | E |
| R-V7 | Help panels explain and never sell (no "trained on $12 billion"). | Read every help Popover. | G |

### 4.2 Glossary (R-T)

| ID | Rule (checkable) | Level |
|---|---|---|
| R-T1 | The glossary below is the only source for nouns and verbs. A new term is added here (or in the decisions log) before it appears in UI. | E |
| R-T2 | **Ad** has performance data. A variation is never called an ad until it runs and is graded ("Ads made from variations"). | E |
| R-T3 | **Creative** is media only. Never a count noun ("a separate creative"). | E |
| R-T4 | **Copy** is a running instance of an ad. Ad words are **text** (fields: Headline, Body, Button). Open: default until Mancini decides is keep "copy" for instances and ban "copy" for text. | E |
| R-T5 | **Suggestion** in UI. "Recommendation" only in code and help-center mapping. Open: default is "suggestion". | E |
| R-T6 | **Variation** is a new image from an ad. **Version** is one edit of one variation (v1, v2). Never "new version" for a new variation. | E |
| R-T7 | **Round** is one run of Create variations. Define it once per screen, first use only. | E |
| R-T8 | Verbs: **Create** starts generation, **Refine** changes one variation by instruction, **Edit text** changes text free, **More like this** makes close alternates, **Retry** reruns a failure. Banned: Generate (as a button), Make, Iterate, Regenerate, Fix text, Adjust. | E |
| R-T9 | Status words: **Queued, Generating, Ready, Failed**. "Creating" is never a status; "Create" only on buttons. | E |
| R-T10 | **Period** is the grading window, paired with "covers": "Grades cover the last 60 days." | E |
| R-T11 | **Synced** for platform data. **Updated** for Atria's own output (suggestions). No "Data from". | E |
| R-T12 | Platform name comes from data (`{platform}`). Never hard-code "Meta" where a TikTok copy can appear. | E |
| R-T13 | **Atria** is the actor for AI actions ("Atria drew this text into the image"), not "AI". **Raya** only when Raya is the feature. | G |
| R-T14 | No abbreviations ("Var.", "1d", "h"). CTR, CPA, ROAS and MB are allowed. | E |
| R-T15 | Name features by outcome ("How Radar grades your ads"). Only Radar and Raya are proper-noun features. | G |

Verify R-T: `grep -rnE "Creating|Regenerate|Fix text|Make new|Var\.|Data from|recommendation|a creative|separate creative" src/screens src/components` returns no UI strings.

| Concept | Use | Banned in UI |
|---|---|---|
| Graded unit with performance data | Ad | Creative (for the row), ad creative |
| Media inside an ad | Creative | Asset, creative asset, "a creative" |
| One running instance of an ad | Copy (Open, see R-T4) | "2 ads" under an ad, ad set, Meta ad |
| Words inside an ad | Text (Headline, Body, Button) | Copy (for text) |
| Issue paired with a fix | Suggestion | Recommendation, direction, AI recommendation |
| AI-made image from an ad | Variation | Iteration, image ad, generated ad, option, pick |
| Edit of one variation | Version (v1, v2) | Revision, iteration |
| One run of Create variations | Round | Batch, project, job |
| Approach an ad takes | Angle | Concept, ad angle |
| Product information for generation | Brief | Ad context, context |
| Cost unit | Credits | Coins, AI credits, image credits |
| Grading window | Period | Window, date range, timeframe |
| Start generation | Create | Generate, Make, Iterate, Scale |
| Change by instruction | Refine | Iterate, revise, adjust, regenerate |
| Change text for free | Edit text | Fix text, Fix the text |
| Close alternates | More like this | Regenerate, remix |
| Rerun after failure | Retry | Regenerate, Try again |
| Generation states | Queued, Generating, Ready, Failed | Creating, In progress, Done |
| Saved for testing | Shortlist, Shortlisted | Picks, favorites, saved |
| Background job list | Tasks | Tracker, notifications |
| Data freshness | Synced (platform), Updated (suggestions) | Data from, refreshed |
| Radar groups | Best, Improve, Rework | Winners, iteration candidates |
| Gallery | Creative gallery | Image ads |

### 4.3 Punctuation, capitalization, mechanics (R-M)

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-M1 | Sentence case everywhere. Capitals only on the first word and proper nouns (Atria, Radar, Raya, Meta, TikTok). | Read titles, buttons, tabs, column headers. | E |
| R-M2 | No period on titles, headings, buttons, labels, tabs, tags, menu items, column headers or fragments. | Read those elements. | E |
| R-M3 | Every full sentence ends with a period, in any component. Fragments never do ("Variation deleted"). Open: default until Mancini decides is this rule (replaces copy deck helper rule and L-113). | Read tooltips, helpers, toasts, Alerts. | E |
| R-M4 | No em dashes, no typed ellipses (three periods or U+2026), no "&". Only a component-drawn truncation ellipsis is allowed. | `grep -rnP "\x{2014}|\x{2026}|\.{3}| & " src/screens src/components` | E |
| R-M6 | " · " separates facts on one line, with a non-breaking space before it. Text after it is lowercase unless a proper noun or new sentence. | Read every middle-dot line. | E |
| R-M7 | No colon between label and value ("Goal Sales"); style instead (R-H3). Colons only before inputs or lists. `<Form colon={false}>` by default. | `grep -rn ":</" src` and read labels. | E |
| R-M12 | Curly quotes for quoted ad text and examples. | Search for straight `"` inside rendered strings. | G |
| R-M13 | No parentheses in UI text; use " · " or a second sentence. "Ad accounts (8)" stays (Atria's own). | Search rendered text for "(". | G |
| R-M14 | Contractions are fine. | n/a | G |
| R-M15 | One stub pattern for out-of-scope parts: "In the live product, this opens `{destination}`. It's not part of this prototype." | Search for "prototype" strings: one pattern. | E |

### 4.4 Buttons and status words

| Element | Rule | IDs |
|---|---|---|
| Button | Verb + object, 1 to 3 words, about 20 characters, sentence case, no period | R-T8, R-M1, R-M2 |
| Destructive pair | Both outcomes named: "Delete variation" / "Keep it" | R-I5 |
| Credit-spending button | Cost line beside it before the click: "Uses `{n}` of `{balance}` credits" | R-AI6 |
| Status | Queued, Generating, Ready, Failed only | R-T9 |
| Freshness | "Synced 2 hours ago", "Updated 1 day ago" | R-T11, R-M10 |

### 4.5 Length and truncation (R-L)

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-L1 | Wrap by default. Truncate only user- or platform-supplied names and IDs, only in dense rows. | Find every `ellipsis` and `text-overflow`: each is on a supplied name or ID. | E |
| R-L2 | Never truncate authored copy, buttons, tabs, tags, numbers, money, dates or status lines. Rewrite or author a shorter variant. | At 375, no authored string ends in a drawn ellipsis. | E |
| R-L3 | Truncated text is reachable another way: expand control, detail view, or tooltip on a focusable trigger. Never hover-only. | Tab to a truncated name: full text is reachable. | E |
| R-L4 | Truncation behaves the same at every width. A shorter phone string is a separately authored variant. | Compare 1440 and 375. | E |
| R-L5 | Long text previews: `Typography.Paragraph ellipsis={{ rows: 2, expandable: 'collapsible' }}`. | Inspect long previews. | G |
| R-L6 | Middle truncation for IDs and file names where the end matters. | Inspect IDs. | G |
| R-L7 | Every single-line ellipsis has an explicit width or `min-width: 0` on its flex parent. | Inspect flex parents of ellipsis nodes. | E |
| R-L8 | `text-wrap: balance` on page, card, Modal, Result and Empty titles. `text-wrap: pretty` on paragraphs and Alert descriptions. | Computed style. | G |
| R-L10 | Write to the character budgets below and check each string rendered in its real component. | Render at 375 and 1440. | E |
| R-L12 | `overflow-wrap: anywhere` only on supplied strings (URLs, IDs, audience names). Never `hyphens: auto` in labels. | Search CSS. | G |

### 4.6 Character budgets

Only the antd durations and the empty-state structure are sourced. Every other number is inferred.

| Component | Budget | Source |
|---|---|---|
| Page title | 1 to 3 words | Inferred |
| Page one-liner | 90 characters or fewer, 9 to 14 words | Inferred |
| Button | 1 to 3 words, about 20 characters | Inferred (verb + object sourced) |
| Tab label | 20 characters or fewer, plus count | Inferred |
| Tag | 1 or 2 words, about 16 characters | Inferred |
| Tooltip | One sentence, about 80 characters | One sentence sourced (NN/g); length inferred |
| "How X works" popover | 2 to 5 short lines | Inferred |
| `message` | About 60 characters, 8 to 12 words | 3 s duration sourced; length inferred |
| `notification` description | One sentence, about 100 characters | 4.5 s duration sourced; length inferred |
| Modal title | About 40 characters | Inferred |
| Empty state | Title + 1 to 2 sentences + 1 to 2 word CTA | Sourced (Atlassian) |
| Status line in a phone row with a 48 px thumbnail | About 36 characters at 390; check at 375 | Inferred |

---

## 5. Intent to component mapping (antd v6)

Use `App.useApp()` for `message`, `notification` and `modal` so tokens apply; static calls ignore ConfigProvider. v6 `notification` takes `title` (not `message`) and `description`.

| ID | Intent | Component | Copy rule | Level |
|---|---|---|---|---|
| R-I1 | Confirm something the user just did, nothing left to do | `message.success` (3 s) | Fragment, 60 characters or fewer, no period ("Variation deleted") | E |
| R-I2 | Async result arrives (round ready or failed) | `notification` with `title`, one-sentence `description`, at most one button; `duration: 0` if action is needed | Title is the outcome; description names ad and account; button names the next step | E |
| R-I3 | Condition true for this page or account now | Inline `Alert` above the content it affects; `banner` only page-wide | Renders only while true, says what triggered it; every dismissible Alert has the same Dismiss control | E |
| R-I4 | Input problem | Form validation on the field | Say what to fix ("Use a PNG or JPG file.") | E |
| R-I5 | Destructive or irreversible action | `Popconfirm` for one item next to its trigger; `Modal.confirm` when a consequence needs explaining | Title asks, body states consequence, buttons name both outcomes | E |
| R-I6 | Action that spends credits | Cost beside the button before the click; `Popconfirm` only for one-click spends off the main path (More like this) | "Uses `{n}` of `{balance}` credits" | E |
| R-I7 | One-line definition of a label or metric | `Tooltip` on hover and focus | Never an instruction, cost, link, roadmap promise or pointer to a missing feature; never repeats its trigger label | E |
| R-I8 | Explanation of 2 to 5 lines | Labeled link opening `PopSheet` (Popover on desktop, bottom sheet on phones) | What it is, why it matters, what to do (R-E11) | E |
| R-I9 | No data | `Empty`, separate copy for loading, no results, filtered out, first use | Reason, how content gets here, one CTA; never "No records" while loading | E |
| R-I10 | End of a long flow, or full-page error | `Result` | Outcome as title, next step as button | G |
| R-I11 | Status or category on an element | `Tag` (neutral, `variant="filled"`) or `Badge` (count). Only Ready, Failed and grades are colored | 1 or 2 words | E |
| R-I12 | Long-running generation | Inline progress where started (sticky bar, row status) plus Tasks; no start toast when inline progress is visible | Time estimate + "You can leave this page." | E |
| R-I13 | Reversible change (period change) | `message` with Undo, only if the page also shows the new state afterward | A toast is never the only record of a state change | E |
| R-I14 | Feature changed or moved | Inline teaching card on the destination page | What moved, where, one action | E |
| R-I15 | Supplementary actions or rich content with links | `Popover` (Tooltip can't hold interactive content) | Title plus short body | G |

Accessibility rules tied to these components:

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-A3 | Hover and focus content dismisses with Esc, can be hovered, persists. Tooltips only on focusable triggers. | Keyboard: Tab to trigger, tooltip shows; Esc closes. | E |
| R-A4 | Icon-only buttons have an accessible name and a tooltip. Names follow state ("Remove from shortlist" once shortlisted). Different actions use different icons. | Devtools accessibility pane on icon buttons, before and after toggling. | E |
| R-A6 | Truncated or clamped text is fully reachable by keyboard and screen reader. | Screen reader or accessibility tree shows full text. | E |

---

## 6. Education and AI communication components

### 6.1 Education (R-E)

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-E1 | No automatic tours. Education is page lines, labeled "How X works" links and empty states. | Fresh load of every route: nothing opens by itself except allowed push items. | E |
| R-E2 | At most one unprompted (push) element per page at a time (teaching card, nudge Alert). Pull elements can be more. (Inferred.) | Count push elements per route at 1440 and 375. | E |
| R-E3 | Any future tour: 4 steps or fewer, user-started. | n/a unless a tour is added | G |
| R-E4 | Labeled trigger ("How grades work") over a bare "i" icon; opens by click and tap as well as hover. | Tap on 375 opens it. | E |
| R-E5 | Empty states say why it's empty, how content will appear, one CTA. First use differs from "nothing matches". | Trigger both states on Radar and gallery. | E |
| R-E6 | A moved feature gets one inline teaching card on the new page: what moved, where, one action. Dismissal persists, reopenable from help, expires after about 30 days. Old location gets a slim redirect line, not a second card. | Dismiss, reload: stays dismissed. | E |
| R-E7 | "New" markers only for whole new pages, 30 days. Never badges for features or tweaks. | Search for "New" tags. | G |
| R-E8 | Metric definitions follow "% of people who `{did X}`" plus the window or platform caveat, from one constant each. Constants live in data (Claude's). | Same metric tooltip reads identically on Radar and ad page. | E |
| R-E9 | Each message has one owner: status in an Alert, change in a teaching card, definition in a tooltip or popover. Nothing said twice on one screen. | Read each screen for duplicate explanations. | E |
| R-E10 | Help next to each step of a multistep flow (Create panel field helpers). | Create panel: each field has its helper. | G |
| R-E11 | Education copy in three beats: what it is, why it matters, what to do. | Read each help popover. | G |

### 6.2 Communicating AI (R-AI)

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-AI1 | Scope on the page, not in a tooltip ("Atria can make variations of image ads."). | Visible without hover. | E |
| R-AI2 | Each grade band names its benchmark ("compared with the other ads in this account, last 60 days") and implies an action (Best: keep running; Improve: fix the weak grade; Rework: try new variations). | Radar tab descriptions and grade popovers. | E |
| R-AI3 | Say what a grade or prediction is not: "An estimate from how similar ads performed in this account. Not a guarantee." | Grade help contains it. | E |
| R-AI4 | Inferred output labeled "Predicted", "Likely" or "Estimated". Letter bands over raw percentages unless the percentage has context. | Search for bare "% match". | E |
| R-AI5 | Admit low data in plain words ("Not enough data to grade"). | Ungraded ad shows the line. | E |
| R-AI6 | One cost format beside the button, before the click: "Uses 32 of 1,298 credits". Short credits: "Needs 32 credits. You have 20." + "Get credits". Never hover-only. Phone may drop "of 1,298". | Ad page, Editor, Variations at 1440 and 375. | E |
| R-AI7 | At submission, time and way out: "About 2 minutes · You can leave this page. Tasks will tell you when they're ready." | Start a round, read the bar. | E |
| R-AI8 | Failures state what happened, credits returned and next step: "Couldn't create 2 variations. 8 credits returned." + Retry. | Failed round on Radar and ad page. | E |
| R-AI9 | Disclose AI on generated items: "Variation" tag on cards; a note when Atria drew text into the image. | Variation cards and Editor. | G |
| R-AI10 | Factual reasons ("Why this might work"), never first-person "thinking". | Read reasons. | G |
| R-AI11 | Feedback controls say what they change and never end in a dead toast. | Editor "Report a wrong tag". | G |
| R-AI12 | Name the data source for inferences ("read from its image and text"). | Ad page audience line. | G |

---

## 7. Visual hierarchy, color and contrast

### 7.1 Hierarchy (R-H)

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-H1 | Type scale 12 / 14 / 16 / 20 (24 only for KPI values, and page titles if DL decides). Delete 9, 10, 11, 13, 15, 17, 18 px. Weights 400 and 600 only. | `grep -nE "font-size: ?(9|10|11|13|15|17|18)px" src/styles.css` returns nothing. | E |
| R-H2 | Text levels are antd alphas: value 0.88, label 0.65, meta 0.45 (0.55 if needed to act). No solid grey hex overrides (`#6b6b6b`, `#8c8c8c`, `#595959`). | Search CSS and theme for those hexes. | E |
| R-H4 | Group with 8 / 16 / 24 spacing before adding borders or fills. | Inspect gaps: values on the 8 grid (4 allowed inside controls). | E |
| R-H5 | At most 2 large elements per view. Squint test at 20 px blur: only grade, thumbnail and primary action survive. | Screenshot with 20 px blur at 1440 and 375. | E |
| R-H6 | One primary button per view or card. Repeated row actions use Default buttons. | Count `type="primary"` visible per screen at 375. | E |
| R-H8 | Per card: one semantic color (the grade) plus neutrals, at most 2 or 3 chips, then "+N". | Inspect cards. | G |
| R-H9 | Styling escalation ladder: seed tokens, map tokens, component tokens, nested ConfigProvider, semantic `classNames`/`styles`, then CSS with `var(--ant-*)` only for custom elements. No new hex literals or `!important`. | `grep -c "#[0-9a-fA-F]\{3,6\}" src/styles.css` and `!important` counts go down, never up. | E |
| R-H10 | Product component roles: card tabs with counts, filled borderless grade tags, `Descriptions` for key-value, `Table.Summary` for totals. | Inspect Radar tabs, ad page details, Radar totals. | G |
| R-H11 | Elevation only via `boxShadowSecondary` (popovers, cards) and `boxShadow` (modals, sheets). | Search CSS for `box-shadow` literals. | G |
| R-H12 | Popover titles 14/600, modal titles 16, card titles 16/600. | Inspect computed styles. | G |

### 7.2 Contrast numbers (antd 6.7.1, WCAG formula, unrounded)

| Pair | Ratio | Verdict |
|---|---|---|
| White text on `#F66C30` (primary button) | 2.96 | Fails AA and 3:1 |
| `#F66C30` text on white (link, selected tab) | 2.96 | Fails |
| `#F66C30` on `#FFF7F0` (orange Tag) | 2.79 | Fails |
| `#CF4E1F` (step 7) on white | 4.41 | Large text only |
| `#A83411` (step 8) on white / on `#FFF7F0` | 6.64 / 6.26 | Passes AA |
| `rgba(0,0,0,0.88)` on `#F66C30` | 6.37 | Passes AA |
| Tertiary 0.45 (`#8C8C8C`) on white | 3.36 | Fails for 12 to 14 px |
| `rgba(0,0,0,0.55)` on white / on `#F5F5F5` | 4.74 / 4.68 | Passes |
| `#6B6B6B` on white | 5.33 | Passes |
| `#D9D9D9` border on white | 1.41 | Fails 3:1 if it is the only boundary cue |
| Grade tag text on tint: A `#18B723` on `#E8F7E6` / B / C / D | 2.41 / 3.66 / 3.44 / 3.67 | Fails 4.5:1 |

Primary palette from `#F66C30`: `#fff7f0, #ffe8d6, #ffcead, #ffb185, #ff925c, #f66c30, #cf4e1f, #a83411, #821f07, #5c1204`.

### 7.3 Color rules (R-C) and contrast rules (R-A)

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-C1 | Orange marks only the primary action, progress, selection and current location. Everything else is neutral (including "Recommended" and "Created in Atria" tags). | Screenshot each route: orange appears only on those roles. | E |
| R-C2 | Orange text uses `#A83411` (`colorPrimaryText`, `colorLink`), hover `#CF4E1F`, active `#821F07`. | Computed color of any link. | E |
| R-C3 | Primary button text color is a recorded choice. Open: default until Mancini decides is white (brand, current build, 2.96:1), annotated as a known trade-off. Accessible alternative: `components.Button.primaryColor: 'rgba(0,0,0,0.88)'` (6.37:1). Same decision covers the orange-filled Segmented selected state. | Primary button text color matches the DL entry. | E |
| R-C4 | `colorLink` and `colorInfo` set deliberately; nothing falls back to `#1677FF` by accident. | Search computed colors for `rgb(22, 119, 255)` outside info states and the B grade. | E |
| R-C5 | Grade color reinforces the letter, never carries meaning alone. | Greyscale screenshot: grades still readable by letter. | E |
| R-C6 | Grade tag text reaches 4.5:1 on its tint. Open: default until Mancini decides is darken tag text one palette step per hue, fill unchanged. | Contrast check on A to D tags. | E |
| R-C7 | Warnings stay distinct from brand orange via icon plus text. | Warning Alerts have an icon and words. | E |
| R-C8 | Red only for errors, Failed and grade D. Direction colors follow the metric's direction (lower CPA is better, green). | Inspect deltas. | G |
| R-C9 | One orange family. Remove `#F5582A`, `rgba(245,88,42,.18)` and the `#FFB347` gradient; focus rings use `#FFCEAD`. | Search CSS for those values. | G |
| R-C10 | Tertiary text needed to act uses 0.55 (4.74:1). A border that is the only boundary cue reaches 3:1. | Contrast check on meta lines and input borders. | G |
| R-A1 | Text 4.5:1, large text (about 24 px, or 18.66 px bold) 3:1, non-text 3:1, measured unrounded. | Contrast tool on each changed element. | E |
| R-A8 | No information by color alone, including Ready/Failed and direction colors. | Greyscale screenshot. | E |

Grade colors: B grade is Open: default until Mancini decides is the library's blue `#1677FF` (current build). Active tab: Open: default until Mancini decides is dark semibold label on card tabs (current `itemSelectedColor`), orange only as the ink bar on line tabs.

### 7.4 Token-level fixes in `src/theme.ts`

| Change | Rule |
|---|---|
| Fix the line 3 comment: antd 6.7.1, not "stock antd 5" | R-H9 |
| `colorLink: '#a83411'`, `colorPrimaryText: '#a83411'`, `colorPrimaryTextHover: '#cf4e1f'`, `colorPrimaryTextActive: '#821f07'` | R-C2 |
| Keep `colorInfo: '#1677ff'` only as the info semantic; links no longer depend on it | R-C4 |
| Remove `colorText: '#1f1f1f'` and `colorTextSecondary: '#6b6b6b'` hex overrides (use antd 0.88 / 0.65 defaults) | R-H2 |
| `colorTextTertiary: 'rgba(0,0,0,0.55)'` | R-C10 |
| `colorPrimaryBg: '#fff7f0'`, `colorPrimaryBorder: '#ffcead'` set explicitly; `Table.rowHoverBg` and `Select.optionSelectedBg` reuse the same values | R-C9, R-H9 |
| `Tabs.itemColor` back to the secondary alpha, not `#6b6b6b` | R-H2 |
| Notification styling via `App` config and Notification component tokens; delete the `!important` block (`styles.css:473-492`) | R-H9 |
| Export `darkBarTheme` (`darkAlgorithm`, only `colorPrimary` and `colorBgContainer`) and use it at `AdDetail.tsx:564` instead of 11 hex values | R-H9 |
| Motion durations per section 10 | R-MO1 |
| `token.motion: !reduce` | R-A2 |
| Radius: Open: default until Mancini decides is the current build, 6 controls, 10 cards (`borderRadiusLG`), 14 floating surfaces (Modal, Popover, Notification, Drawer, Dropdown). Library alternative is 6/8: delete `borderRadiusLG: 10` and the five `14` overrides | R-H9 |
| Move hexes that duplicate tokens in CSS (`#1f1f1f`, `#6b6b6b`, `#f66c30`, `#fff7f0`, `#ffcead`) to `var(--ant-*)`. Confirm variable names in devtools first | R-H9 |
| Rename any v5-era props found while editing: `bodyStyle`, `destroyOnClose`, `dropdownRender`, `bordered`, Drawer `width`, `size="middle"` | R-H9 |

---

## 8. Responsive breakpoints

| antd name | Min width | Review widths that land here |
|---|---|---|
| xs | 0 (below 576) | 375 x 812 (primary phone), 390 |
| sm | 576 | none |
| md | 768 | 834 x 1112 (tablet) |
| lg | 992 | none |
| xl | 1200 | 1440 x 900 (primary desktop), 1504 |
| xxl | 1600 | none |

Phone means below 768 (`usePhone()` in `PopSheet.tsx`, which is `!Grid.useBreakpoint().md`). The phone type layer, summary cards and bottom sheets switch there.

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-R1 | Every key screen works and is screenshotted at 1440 x 900, 834 x 1112 and 375 x 812; 1504 and 390 keep passing. | Screenshots in `handoffs/screens/`. | E |
| R-R2 | Layout uses `Col` responsive props and CSS media queries. `Grid.useBreakpoint()` only to swap components. | Code review of new layout. | G |
| R-R10 | Inputs are 16 px on phones; body text stays 14 for antd components. | Computed font size of inputs at 375. | E |
| R-R11 | Facts shown on desktop stay reachable on phones (sync time, period dates), even if moved into a sheet. | Find "Synced" and the period range at 375. | G |
| R-L11 | Copy tested at the review widths, at 200% zoom, and with strings 30% longer. | Zoom 200% at 1440; temporarily lengthen a string. | E |

| Concern | Desktop (xl) | Tablet (md) | Phone (xs) |
|---|---|---|---|
| Navigation | Fixed rail + fluid work area | Collapsed icon rail | Rail in a Drawer or top bar |
| Ad list | Full Table, sticky Ad column | Fewer columns (R-K3) | Summary cards (section 9) |
| Tabs | Card tabs with counts | Same | 2 or 3 tabs that fit, else block `Segmented` or Select |
| KPIs | One row | 2 or 3 per row | Hero `xs={24}`, rest `xs={12}` |
| Detail panels | Popover or side Drawer | Side Drawer | Bottom sheet via `PopSheet`; ad detail is a page |
| Primary action | Page header | Page header | Sticky bottom bar |
| Body size | 14 | 14 | 14, inputs 16 |

---

## 9. Mobile interaction patterns

| ID | Rule (checkable) | Verify at 375 and 390 | Level |
|---|---|---|---|
| R-R3 | Two levels of disclosure at most: ad card, then ad page. Nothing expandable inside a sheet inside a page. | Open each sheet: no Collapse inside. | E |
| R-R4 | Dense tables become summary cards below 768. At md, hide lower-priority columns instead of silent horizontal scroll. | Radar, gallery at 375 and 834. | E |
| R-R5 | Phone tabs fit without scrolling (2 or 3), otherwise block `Segmented` or a select. | No horizontal scroll on tab bars. | E |
| R-R6 | Every desktop Popover with content uses `PopSheet` and becomes a bottom sheet. Sheets don't stack and have a visible close button. | Tap every help link and filter at 375. | E |
| R-R7 | One sticky primary action at the bottom, `padding-bottom: calc(12px + env(safe-area-inset-bottom))` (with `viewport-fit=cover`), same padding on the scroll container. At most two sticky layers. Bars with more than two actions become primary + More menu. | Sticky bars on ad page and Variations at 375: one row, last content not hidden. | E |
| R-R8 | Every gesture has a visible equivalent: press and hold to compare plus a "Compare" button; swipe plus arrows. | Compare without long press. | E |
| R-R9 | Sideways rows show a peek of the next item, a count ("4 of 8") and "See all". 16 px side margins (iOS edge Back). Native CSS scroll-snap, no autoplay. Last item reachable in 3 to 4 swipes. | Variations strip at 375. | G |
| R-A5 | Phone touch targets are at least 44 px (48 preferred). | Measure every tappable element at 375. | E |

### Summary card anatomy (below 768)

| Slot | Content | Rule |
|---|---|---|
| Left | Thumbnail, 48 px, fixed `aspect-ratio` | R-MO9 |
| Top line | Ad name (supplied; may wrap to 2 lines or truncate with full text reachable) | R-L1, R-L3 |
| Top right | Overall grade + one number (goal metric value; Spend if not graded) | R-K4, R-H8 |
| Meta line | One line, about 36 characters, status or next step, never truncated | R-L2, R-L10 |
| Actions | One row; Default buttons; at most one primary per screen | R-H6 |
| Secondary columns | Behind "Details" (sheet or ad page), never squeezed onto the card | R-R4, R-R3 |
| Whole card | Tappable to the ad page, 44 px minimum, press feedback per R-MO10 | R-A5 |

### Other phone patterns

| Pattern | Spec |
|---|---|
| Bottom sheet | `PopSheet` (antd Drawer, placement bottom). Title always set (`sheetTitle`). Visible close. Mask blur off |
| Press and hold to compare | Hold shows the original; release returns. Visible "Compare" button with label "Original" state. Not the only path (R-R8) |
| Suggestions list | Vertical. Top one open, rest under a labeled toggle ("Show 3 more suggestions") |
| Shortlist | Toggle in the image corner (44 px target, state-aware aria per R-A4) plus a count in the sticky bar ("3 shortlisted", "Review") |
| Period select | Hide the date range below md, show it in the sheet (K49) |
| Viewport height | Use `svh`, not `dvh` |

---

## 10. Motion

| ID | Rule (checkable) | Verify | Level |
|---|---|---|---|
| R-MO1 | One token module (`src/motion/tokens.ts`) drives antd strings, CSS variables and motion/react transitions. No literal durations anywhere else. | `grep -nE "[0-9.]+m?s( |;|,)" src/styles.css` on transition lines returns only `var(--dur-*)`; no numeric `duration:` in TSX. | E |
| R-MO2 | One duration ladder. Open: default until Mancini decides is the prototype ladder 0.1 / 0.16 / 0.24 / 0.36 s, with antd moved onto it. | `theme.ts` motion tokens equal `tokens.ts`. | E |
| R-MO3 | Enter decelerates `[0.05, 0.7, 0.1, 1]`; exit accelerates `[0.3, 0, 0.8, 0.15]` and is 20 to 30% shorter. | Read exit transitions. | E |
| R-MO4 | Springs use `visualDuration` (or `duration`) with `bounce: 0`. Never rely on defaults. No overshoot on opacity or color. | Search for `type: 'spring'` without `bounce: 0`. | E |
| R-MO5 | Animate only transform and opacity (height via the layout spring on expanders is the exception). | Search for animated `top`, `left`, `width`, `height`, `margin`. | E |
| R-MO6 | No added motion on high-frequency interactions (row hover, tab switch) beyond antd's own. | Hover rows, switch tabs. | E |
| R-MO7 | Stagger only on first load, 15 to 50 ms per item, capped (`stagger.maxItems`). Never stagger exits. | Read variants. | G |
| R-MO8 | Never block input until an animation ends. All motion interruptible. | Click during transitions. | E |
| R-MO9 | Generation progress: spinner for 2 to 10 s, then step labels or a determinate bar ("Generating 2 of 4"). Skeletons with `aspect-ratio` reserve image space. | Start a round. | E |
| R-MO10 | Phone only: press `scale: 0.97` at `instant`, `layoutId` card to detail, drag-to-dismiss sheet that closes faster than it opens. Mask blur off. | Phone at 375. | G |
| R-A2 | Reduced motion wired into both libraries: `theme.token.motion = !reduce` and `<MotionConfig reducedMotion="user">`. Shimmers become static skeletons. | Emulate `prefers-reduced-motion: reduce` in devtools. | E |

### Token table (default ladder)

| Token in `tokens.ts` | Value | antd token in `theme.ts` | Use |
|---|---|---|---|
| `duration.instant` | 0.1 s | `motionDurationFast: '0.1s'` | Press, hover, toggles |
| `duration.fast` | 0.16 s | `motionDurationMid: '0.16s'` (currently 0.2s) | Popovers, exits, fades |
| `duration.base` | 0.24 s | `motionDurationSlow: '0.24s'` (currently 0.28s) | Modals, drawers, layout |
| `duration.slow` | 0.36 s | none | Phone sheet enter, card to detail |
| `ease.standard` | `[0.2, 0, 0, 1]` | `motionEaseInOut` | On-screen moves |
| `ease.enter` | `[0.05, 0.7, 0.1, 1]` | `motionEaseOut` (set) | Entrances |
| `ease.exit` | `[0.3, 0, 0.8, 0.15]` | `motionEaseInBack` (set) | Exits |
| `spring.snappy` | bounce 0, 0.18 s | none | Selections, toggles |
| `spring.gentle` | bounce 0, 0.28 s | none | Sticky bar, sheets |
| `spring.layout` | bounce 0, 0.24 s | none | `layout`, `layoutId`; replaces the off-scale 0.42 spring at `AdDetail.tsx:551` |
| `stagger` | 0.015 list, 0.03 cards, max 8 | none | First load only |

CSS: expose `--dur-instant`, `--dur-fast`, `--dur-base`, `--dur-slow`, `--ease-standard`, `--ease-enter`, `--ease-exit` from the same values (set on `:root` from `tokens.ts` or mirrored once in `styles.css` with a comment pointing to `tokens.ts`), then replace literals at `styles.css:83, 140, 206, 371, 390, 529, 546, 600, 861, 1108, 1114, 1157`. Adding these CSS variables is allowed; any other new motion token needs a decisions log row.

---

## 11. Page one-liners (implement in JSX)

All lines follow R-P2 to R-P8. Lines marked Mancini are his wording: keep until a decisions log row changes them.

| Page | Current line | Implement | Status |
|---|---|---|---|
| Overview | "How `{account}` is doing, and where to look first." | See how this account is doing and which ads to fix first. | Implement |
| Radar | "Radar grades every ad in this account and suggests what to fix next." (Mancini, C5d-27) | Keep current. Candidates: "See how every ad grades against this account's other ads, and what to fix first." or minimal edit "next" to "first" | Open: default until Mancini decides is the current line |
| Ad page | None | See why this ad performs as it does and pick the fixes to try. | Implement |
| Variations | None. Title differs by device | Review this round, shortlist the best and test them in `{platform}`. Title "Variations of `{ad}`" at every width | Implement |
| Editor | None | Describe a change or edit the text, and every change is saved as a version. | Implement |
| Creative gallery | "`{n}` ads with variations" (a count) | Find every variation you've created, grouped by the ad it came from. Move the count to a meta line | Implement |
| Tasks panel | None | Track variations while they generate and open them when they're ready. | Implement |
| Create panel | Sub-line "For `{ad}` · `{n}` suggestions" | Keep the sub-line. Optional: "Set the brief, images and size, then create `{n}` variations." | Implement sub-line only |

In the Variations line, `{platform}` comes from data (R-T12). Showing these lines in the build at all is Open (guide decision 9): default until Mancini decides is to implement them.

Other Mancini wording to leave as is: "Next steps" column header and tooltip (C5d-21, K56), copies panel titles such as "4 copies of this ad running" (L-130), the "Recommended" tag text (L-131), Radar tab descriptions (L-105), teaching card title "Variations now live with their ad" (C5d-23, K55).

---

## 12. Known issues backlog

From the copy audit of commit `6ee0d31`. Paths relative to `src/`. Line numbers may have drifted: search for the quoted string before editing. Truncation items are inferred risks to confirm at 375 and 390.

### 12.1 Antigravity's branch

| K | Page | file:line | Rule | Fix |
|---|---|---|---|---|
| K1 | Ad page, Radar, Tasks | `screens/AdDetail.tsx:583` vs `:264`; `components/StatusCell.tsx:76`; `components/TasksPanel.tsx:39` | R-T9 | "Generating" for status everywhere, including toasts called from JSX |
| K2 | Editor | `screens/Editor.tsx:383-384` | R-T3 | "Makes a new variation next to this one" / "Adds v`{n}` to this variation" |
| K3 | Creative gallery | `screens/ImageAds.tsx:37` | R-T3 | "Every variation you create is kept here, grouped by the ad it came from." |
| K4 | Ad page | `screens/AdDetail.tsx:511` | R-T4 | "read from its image and text" |
| K5 | Editor | `screens/Editor.tsx:235-237` | R-T8, R-T13, R-AI6 | "Atria drew this text into the image." / "Changing it creates a new version." / button "Create new version" + "Uses 4 of 1,298 credits" |
| K6 | Editor | `screens/Editor.tsx:392`, `:552` vs `:425` | R-T8 | "Create new variation" everywhere |
| K7 | Radar | `screens/Radar.tsx:127`; `screens/Results.tsx:588` | R-T14, R-T1 | Render "Variation of `{parent}`" |
| K8 | Overview | `screens/Overview.tsx:180`, `:183` | R-T1, R-T2 | "Ads made from variations" |
| K9 | Variations, Editor | `screens/Results.tsx:219-220`; `screens/Editor.tsx:304` | R-T8, R-A4 | "Edit text" everywhere with an icon distinct from Refine (data part in 12.2) |
| K10 | Variations | `screens/Results.tsx:482`, `:400` | R-T1 | "Need more variations?"; "All 3 shortlisted variations fix the same issue." |
| K11 | Radar, gallery | `screens/Radar.tsx:193`; `screens/ImageAds.tsx:15` | R-T1 | Rename the gallery filter "Origin" |
| K12 | Radar | `screens/Radar.tsx:37` | R-T12 | `{platform}` from the copy's data; request the field if missing |
| K13 | Shell, Ad page, Variations | `components/Shell.tsx:161`; `screens/AdDetail.tsx:483`; `screens/Results.tsx:365` | R-T11, R-R11 | "Synced" for platform data, "Updated" for suggestions; show sync on phones |
| K14 | Overview | `screens/Overview.tsx:222` | R-T10 | "Grades cover the last 60 days." |
| K15 | Radar | `screens/Radar.tsx:403`, `:409`, `:172` | R-E9 | One owner for the $10,000 accuracy point: Alert or meter when it applies, help panel otherwise; one wording |
| K16 | Radar, Ad page | `components/StatusCell.tsx:102`; `screens/AdDetail.tsx:265` | R-AI8 | "Couldn't create variations · 32 credits returned" (request the count if the job does not expose it) |
| K17 | Ad page, Editor, Shell | `screens/AdDetail.tsx:598`; `screens/Editor.tsx:237`; `components/Shell.tsx:164` | R-AI6 | "Uses `{n}` of `{balance}` credits" |
| K18 | Ad page | `screens/AdDetail.tsx:598` | R-M8 | `toLocaleString('en-US')` on the balance |
| K19 | Ad page | `screens/AdDetail.tsx:56` | R-M9 | "about $2,141 spent so far" (round in JSX) |
| K20a | Radar | `components/StatusCell.tsx:70`, `:82` | R-M11 | Use `plural()` for counts |
| K21 | Several | `screens/AdDetail.tsx:401`, `screens/Overview.tsx:242`; `components/CreateDialog.tsx:205` | R-M3 | Sentences get periods, fragments don't ("Up to 4. PNG or JPG, under 5 MB each." or rewrite as one fragment) |
| K22 | Several | `screens/AdDetail.tsx:485`; `screens/Results.tsx:517`, `:456` | R-M3, R-I1 | Toast fragments without a period |
| K23 | Ad page, Variations | `components/Goal.tsx:30`; `screens/Results.tsx:547`; `screens/AdDetail.tsx:492` | R-M7 | Drop colons; label + value styling; "Improves `{metric}`" in the compare modal |
| K24 | Editor, Ad page | `screens/Editor.tsx:124`, `:237`; `screens/AdDetail.tsx:585` | R-M6, R-M13 | Lowercase after " · "; "· sample image, live images used up today" |
| K25a | Ad page | `screens/AdDetail.tsx:393` | R-M12 | Curly quotes |
| K26 | Radar | `screens/Radar.tsx:497` | R-V2 | "No Best ads in the last 60 days" |
| K27 | Ad page | `screens/AdDetail.tsx:592` | R-M3, R-V2 | "Select more suggestions to create more variations." |
| K28 | Ad page | `screens/AdDetail.tsx:476` | R-I7, R-V6 | Visible line "You can still apply these suggestions yourself."; drop "coming" |
| K30 | Variations | `screens/Results.tsx:230` | R-I7, R-AI6 | Tooltip "Create 4 new variations close to this one." (cost stays in the Popconfirm) |
| K31 | Ad page | `components/Goal.tsx:26` | R-I7, R-E9 | Move the ordering sentence to the Suggestions helper |
| K32 | Radar | `components/StatusCell.tsx:82` | R-I7 | Drop the tooltip or say what opens |
| K33 | Variations | `screens/Results.tsx:384` | R-I13 | Show the "Try `{angle}`" choice on the nudge or in the Create panel (request state if not available) |
| K34a | Radar | `screens/Radar.tsx:313-326` | R-I13 | Render a marker on moved rows or a line under the tabs (data part in 12.2) |
| K35 | Radar | `screens/Radar.tsx:496-503` | R-I9, R-E5 | Separate empty copy for "no ads in this tab" vs "no ads match these filters" |
| K36 | Variations | `screens/Results.tsx:397-405` vs `:387` | R-I3 | Same Dismiss on both Alerts |
| K37 | Ad page | `screens/AdDetail.tsx:137-138`, `:387` | R-I11, R-C1 | Neutral tags. Open: wording stays Mancini's (L-131); neutral color is the default until he decides |
| K38 | Ad page, gallery | `screens/AdDetail.tsx:137`, `:473`; `screens/ImageAds.tsx:37`, `:185` | R-E9, R-T7 | Keep one "top 2" explanation and one round definition per screen |
| K41 | Gallery | `screens/ImageAds.tsx:106` | R-R6 | Use `PopSheet` |
| K42 | Variations | `screens/Results.tsx:215-216` | R-A4 | aria "Remove from shortlist" when shortlisted |
| K43 | Variations | `screens/Results.tsx:332-335` | R-P1 | "Variations of `{ad}`" at every width |
| K44 | Overview, Radar | `screens/Overview.tsx:112`; `screens/Radar.tsx:387` | R-P3, R-P4, R-P7 | Section 11 table (Radar stays Open) |
| K45 | Tasks | `components/TasksPanel.tsx:42`, `styles.css:983` | R-L2, R-L10 | "6 ready · 2 failed" with credits on the meta line, or allow a 2-line wrap |
| K46 | Shell | `components/Shell.tsx:83`, `styles.css:482` | R-L2 | Let notification descriptions wrap |
| K47 | Radar | `components/StatusCell.tsx:22`, `:70`, `:102`, `styles.css:84` | R-L2 | Shorter strings ("Not enough data") or a wider column |
| K48 | Ad page | `components/Goal.tsx:30` | R-L10, R-I11 | Goal name in the pill, plain phrase as meta text |
| K49 | Radar (phone) | `screens/Radar.tsx:434`, `styles.css:751-754` | R-L4, R-R11 | Hide the range below md, show it in the sheet |
| K50 | Variations (phone) | `screens/Results.tsx:508-523` | R-R7 | Primary "Test in `{platform}`" + More menu |
| K51 | Ad page (phone) | `screens/AdDetail.tsx:583-586` | R-L4, R-AI7 | Authored phone line "8 variations · about 2 minutes left" |
| K52 | Tasks | `components/TasksPanel.tsx:141-153` | R-L9 | One text node for link + period, or drop the period after a link-only fragment |
| K53 | Ad page (phone) | `styles.css:799` vs `:931` | R-L4 | Delete the dead breadcrumb rule |
| K54 | Editor | `screens/Editor.tsx:453` | R-AI11 | Say what the report does, or remove the control (no handler changes; removal of a JSX control only) |
| K55 | Gallery | `components/TeachingCard.tsx:52` | R-V2 | Open: default until Mancini decides is keep "Variations now live with their ad" |
| K56 | Radar | `screens/Radar.tsx:368` | R-I7 | Open: default until Mancini decides is keep "Next steps" (his wording) |

### 12.2 Claude's branch (do not edit; list for awareness)

| K | file:line | Rule | Fix |
|---|---|---|---|
| K9b | `data/variations.ts:40` | R-T8 | "Edit text" in data strings |
| K16b | job data | R-AI8 | Expose credits returned per failed job if missing |
| K20b | `data/store.tsx:419` | R-M11 | "1 days ago": plural in the relative-time helper |
| K25b | `data/mock.ts:424` | R-M12 | Curly quotes in data strings |
| K29 | `data/mock.ts:35` | R-I7, R-V6 | Drop the "Radar settings" clause |
| K34b | store | R-I13 | Expose which ads changed tabs after a period change |
| K39 | `data/variations.ts:154`, `:78-80` | R-E8 | One angle definition constant |
| K40 | `data/mock.ts:540-543`, `:420-487` | R-AI3 | Delete unused quartile strings |
| Dates | `data/mock.ts:12-13`, `:655-668`; `data/store.tsx` dates | R-M10 | Date strings change only if the date-format decision changes the default |

---

## 13. Verification checklist per change

Run for every page touched, before `npm run build` and commit.

| # | Check | How | Widths |
|---|---|---|---|
| 1 | No horizontal overflow | `document.documentElement.scrollWidth <= innerWidth` | 1440, 834, 375, 1504, 390 |
| 2 | No text cut mid-word, no label wrapping to a lone word, no authored string truncated | Visual | 375, 390, 834 |
| 3 | Title and one-liner present and identical across widths | R-P1, R-P2 | 1440, 375 |
| 4 | Glossary and banned words grep clean | Section 4.2 grep | n/a |
| 5 | No em dashes, ellipses, "&", "!", "please", "click" | R-M4, R-V5 grep | n/a |
| 6 | Sentences end with a period; fragments, buttons, titles don't | R-M2, R-M3 | n/a |
| 7 | Numbers: commas, decimals per section 3, tabular figures, NBSP before units and " · " | R-M8, R-M9, R-H7, R-L9 | 1440, 375 |
| 8 | KPI order and phone card anatomy | R-K1 to R-K5 | 1440, 834, 375 |
| 9 | One primary button per view; orange only on allowed roles | R-H6, R-C1 | 1440, 375 |
| 10 | Contrast on changed elements | R-A1, section 7.2 | n/a |
| 11 | Tap targets at least 44 px; inputs 16 px | R-A5, R-R10 | 375 |
| 12 | Popovers become sheets with a close button; no stacked sheets | R-R6 | 375 |
| 13 | Sticky bar one row, safe-area padding, last content visible | R-R7 | 375 |
| 14 | No new hex literals, `!important` or literal durations | R-H9, R-MO1 | n/a |
| 15 | Reduced motion emulated: no transforms, shimmers static | R-A2 | 1440 |
| 16 | Keyboard: tooltips reachable by focus, Esc closes | R-A3 | 1440 |
| 17 | No console errors | Devtools | all |
| 18 | Before and after screenshots saved to `handoffs/screens/` and listed in the commit | GEMINI.md | 1440, 834, 375 |
| 19 | No edits outside the boundary (section 0) | `git diff --stat` | n/a |
| 20 | `npm run build` passes | Terminal | n/a |

---

## 14. Decisions log

New decisions go here, newest last. A row here overrides any "Open" default above. Owner is who implements it.

Open items waiting for Mancini (defaults are in force until a row is added): "copy" collision (R-T4), suggestion vs recommendation (R-T5), period rule (R-M3), radius 6/8 vs 10/14 (7.4), B grade color (7.3), active tab color (7.3), white text on orange (R-C3), grade tag text darkening (R-C6), motion ladder (R-MO2), page title size 20 or 24 (section 1), Radar one-liner (11), page subtitles in build (11), "Recommended" tag color (K37), teaching card title (K55), "Next steps" header (K56).

| ID | Date | Question | Decision | Rules | Owner (Claude / Antigravity) | Status |
|---|---|---|---|---|---|---|
| DL-01 | 21 Nov | Item 14: replace "Grades" with health tiers? | Keep "grade", A to D with plus and minus, and the plain-word bands (Top, Above average, Below average, Lowest). Tiers go in the roadmap as a question to test. | R-T | Both | Decided |
| DL-02 | 21 Nov | Item 13: rename the switch to "My Brand Performance" and "Market Radar"? | Keep "Overview" and "Radar". Radar grades the account's own ads; it is not market data. Sliding pill polish only. | R-T, R-MO | Antigravity | Decided |
| DL-03 | 21 Nov | Date format (R-M10) | Align with Atria's product: month first. "Sep 21 to Nov 19", "Nov 19, 13:43", year only when not the current year ("Oct 21, 2025"). Ranges still use "to". This replaces the R-M10 default. Date strings in data are Claude's; dates built in JSX are Antigravity's. | R-M10 | Both | Decided |
| DL-04 | 21 Nov | Items 16, 17: lineage scope | Build the full lineage now: chain per ad (original, variation ads, versions), a change summary and reason on each step, grade change vs parent, and a repeat warning when a step goes back to something already tried. Claude ships data and logic (`src/data/lineage.ts`); Antigravity builds the timeline or tree UI. | R-H, R-R | Both | In progress |
| DL-05 | 21 Nov | Item 12: "D.CTR" banner | There is no metric called D.CTR. The banner shows the metric and its grade ("CTR" with a D tag), then the full issue line with no truncation. | R-L, R-T | Antigravity | Decided |
| DL-06 | 21 Nov | Items 1, 18: Creation sends people to Analytics | Gallery tiles open inside Creation and stay there. "View in Radar" is an explicit link. Claude owns routes and the gallery's account scoping. | R-P | Both | In progress |
| DL-07 | 21 Nov | Revision vs Iteration (glossary) | The UI keeps "version" (an edit of the same creative) and "variation" (a new creative testing a new idea). Figma's glossary card maps them: Revision (修订) = version, Iteration (迭代) = a round of variations. "Iterate", "revision" and "iteration" do not appear in the UI. | R-T | Both | Decided |
| DL-08 | 21 Nov | Radar one-liner | Radar is framed as something that finds things, not as a grading tool. The line under the title: "Find out how each ad is performing and what to do next." It hands on from Overview ("which ads to fix first") and leads into the "Next steps" column. Grades are how Radar shows it, so "How Radar grades your ads" stays as the help link. Replaces the Radar row in section 11. | R-P, R-V | Antigravity | Decided |
| DL-09 | 21 Nov | Text on orange buttons and the active switch pill (R-C3) | Stays white on `#F66C30`, as in Atria's product. Annotate in Figma as a known contrast trade-off (2.96:1). | R-C3 | Antigravity | Decided |
| DL-10 | 21 Nov | Grade tag text (R-C6) | Keep the darker letters (`#137333`, `#0958d9`, `#9a4e00`, `#cf1322`) on the same tints. | R-C6 | Antigravity | Decided |
| DL-11 | 21 Nov | "Recommended" and "Created in Atria" tags (K37) | Neutral grey. Orange is for primary actions, progress, selection and current location. | R-C1 | Antigravity | Decided |
| DL-12 | 21 Nov | Page title size | 20 px semibold on every page. | R-H | Antigravity | Decided |
| DL-13 | 21 Nov | Gallery teaching card | Title stays "Variations now live with their ad". Body: "Each round is saved with the ad it came from. Find them all here, grouped by ad." One button: "Got it". No "Open Radar" button (it pulled people out of Creation, DL-06). | R-E, DL-06 | Antigravity | Decided |
| DL-14 | 21 Nov | What is each page for? (every page has one distinct purpose) | Analytics has two views of the same data at two zoom levels. **Overview** = the account: a briefing of what is happening, what changed and where to look first. **Radar** = each ad: every ad in a list to scan, compare, sort and filter, and what to do next for each. **Ad page** = one ad: why it performs as it does and which fixes to try. **Creation** makes creative assets that can be used in ads later. **Creative gallery** = every creative made in Atria, whether or not it is tied to an ad. **Round page** = review one batch. **Editor** = refine one creative. One-liners: Overview "See how this account is doing and where to look first."; Radar (DL-08); Creative gallery "Every creative you've made in Atria, ready to refine or use in an ad." | R-P | Both | Decided |
| DL-15 | 21 Nov | Creative gallery: what it shows and how it groups | The unit is a creative (one image), not an ad. A creative may be tied to an ad (made from its suggestions), to a campaign (added to Meta), or to nothing yet (cloned, made from scratch in the gallery). Default view: all creatives, newest first, as a grid. A "Group by" control offers No grouping, Group by ad, Group by campaign, Group by origin. With a grouping on, creatives that have no value for it sit in one last group ("Not made from an ad", "Not in a campaign yet"), so nothing disappears. The gallery has its own primary action, "New creative" (from scratch or from an upload), so Creation is a place to make things, not only a list of rounds. Each creative opens the editor inside Creation; its source ad is shown as a chip, and "View in Radar" is the only way out. Data: `src/data/gallery.ts` (`galleryItems`, `groupGallery`, `GROUP_OPTIONS`, `UNGROUPED_LABEL`, `gallerySummary`). Supersedes C5d-31 (All and Shortlisted tabs): Shortlisted becomes a filter. | R-P, R-H, R-R, DL-06 | Both | Decided (data done; UI to build) |

## 15. Sprint tasks for Antigravity (prioritized)

Work top to bottom. Tick a box in the same commit that finishes the task. Data for every item is listed in `handoffs/data-for-ui.md`. Plan numbers refer to `handoffs/execution-plan.md`; the decisions log above overrides the plan.

### P0: desktop, verify at 1440 x 900
- [x] Item 15: Overview in four sections from `overviewBriefing()` (titles and helps come from `titles`). Each change shows an arrow and a percent, never color alone. (R-H, R-P)
- [x] Item 13: Overview and Radar switch as a sliding pill; labels unchanged. (DL-02, R-MO)
- [x] Item 12: CTR banner on the editor: metric with its grade tag, full issue line, no truncation. (DL-05, R-L)
- [x] Item 7: grade popover in three levels (grade and band, numbers, muted footer). (R-H)
- [x] Item 8: ad summary card in three zones. (R-H)
- [x] Item 10: thumbs up and down next to the image; Download and Delete in the toolbar. (R-I)
- [x] Item 4: suggestion card in four parts from `suggestionParts()`. (R-H, R-I)
- [x] Item 9: lay out the three brief starts, including "Start from the suggestions" (`.brief-prefill`). (R-E)
- [x] Items 1, 18: "View in Radar" link on Creation round and editor pages (`ws.radarPath`), plus a mode cue in the breadcrumb. (DL-06)
- [x] Item 11: style `.ad-copy.stylized`; "No preview yet" note in the editor when there is no ready-made render. (R-AI)

### P0: lineage
- [x] Items 16, 17: History drawer from `lineageOf()`: tree on desktop, opened from a "History" button on the ad page and on round pages. Each step: letter, date, placement, grade, summary, reason, result vs parent, repeat warning. Demo: `mm-1090245-v3`. (DL-04)

### P1: phones, verify at 375 x 812
- [x] Item 6: every dense table becomes summary cards below 768 px (section 9 anatomy); no sideways scrolling tables.
- [x] Item 5: compact date and goal tags; extra tags fold into "+2"; nothing breaks mid-phrase. Dates month first. (DL-03)
- [x] Items 16, 17: History as a single-column timeline in a bottom sheet.
- [x] Sticky action bars use safe-area padding; one primary action per view; 44 px targets.
- [x] Filters open as a sheet with a count on the trigger (already built: check it at 375).
- [x] Recheck the Tasks status line: relative times are longer now ("2 hours ago").

### P0: Creative gallery rebuild (DL-14, DL-15)
- [ ] Gallery shows creatives, not ads: a grid of images from `galleryItems()`, newest first; 4 or 5 columns at 1440, 2 at 375. Each card: image, name (angle), source chip (ad name, "Cloned" or "From scratch"), small state marks (shortlisted, in Meta, versions).
- [ ] "Group by" control from `GROUP_OPTIONS` (Select on desktop, sheet on phones). Render `groupGallery(items, by)`: group title, meta line, then its grid. The group with `ungrouped: true` is always last and uses its title as given.
- [ ] Filters: account, origin, campaign, plus "Shortlisted". Keep the filter row to one line at 1440; a sheet at 375.
- [ ] Primary action "New creative" in the page header (opens the Create panel with no ad attached; if that needs logic, ask in `requests-for-claude.md`).
- [ ] Page one-liners per DL-14 (Overview, Radar, Creative gallery).
- [ ] Teaching card per DL-13, shown inline above the grid on phones.

### P2
- [x] Section 12.1 known issues, Essential first.
- [x] Section 11 page one-liners under every title.
- [x] Item 3: reference strip on the round page (thumbnail plus two-line note) from each angle's reason.

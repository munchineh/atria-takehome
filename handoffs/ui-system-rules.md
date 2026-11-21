# UI system rules (overhaul, 21 Nov)

The short, binding rule set for the rebuild. It overrides `ui-research-spec.md` wherever the two disagree, and every page is rebuilt from it. Rule IDs are `S-…` so commits and Figma annotations can cite them.

Checked on 21 Nov against the brief's Figma file (`RzwU4dPm55NcDcTFZrW7ry`): frames FG1 Radar, FG2 AI recommendation, FG3 Ad context, FG5 Image ads generated, FG6 Project list, and the asset library audit in `claude/atria-5c-library-and-enhancements.md`.

## 0. Sources of truth

| Order | Source | Use it for | Limits |
|---|---|---|---|
| 1 | Figma frames in the brief (6 frames, "Radar key interfaces") | Layout, hierarchy, how components are combined, colour | Desktop only, 1504 wide |
| 2 | Asset library in the same file (13 pages, antd 5 with primary `#F66C30`) | Every control's look, sizes, states, text styles | No Table, Tag, Drawer, Progress, Badge, Alert, Empty, Card |
| 3 | Loom walkthroughs | Flow, what each screen is for, the image editor (not in Figma) | Low resolution |
| 4 | Our decisions log (DL, L) and Mancini's notes | Anything we changed on purpose | Must be annotated as a deviation |
| 5 | Stock antd | Components the library lacks | Style them with library tokens |
| 6 | Live Atria (dark, magenta) | Questions about a missing page, an icon or an interaction only | Never for colour, type or component styling |

S-00: if a component exists in the library, use it as drawn. Don't restyle it. A restyle is a deviation and needs a row in section 12.

## 1. Tokens

### Colour

| Token | Value | Job (one job each) |
|---|---|---|
| Primary | `#F66C30` | Primary buttons, selected state, active tab, links, focus |
| Primary tint / border | `#FFF7F0` / `#FFCEAD` | Selected rows and cards, hover on primary-tinted things |
| Text | black 0.88 | Titles, values, body |
| Text secondary | black 0.65 | Labels, page one-liners, table sub-lines |
| Text tertiary | black 0.45 | Meta, help, timestamps |
| Disabled / placeholder | black 0.25 | Only those two |
| Border | `#D9D9D9` | Control outlines |
| Border secondary | `#F0F0F0` | Card outlines, dividers, table rules |
| Layout background | `#F5F5F5` | Page background on pages made of cards (ad page, gallery, creative page, Overview, editor) |
| Container | `#FFFFFF` | Cards, top bar, table pages (Radar) |
| Fill | black 0.04 | Segmented track, table header, read-only boxes |
| Success / Warning / Error / Info | `#18B723` / `#F38D05` / `#ED383B` / `#1677FF` | Status only. Also grades A / C / D / B |

S-01: no other greys, no lavender, no hand-mixed tints. A new colour needs a row in section 12.
S-02: colour never carries meaning alone. Pair it with a letter, icon or word.
S-03: orange means "primary action", "selected" or "link". It is not decoration.

### Type (Inter)

| Style | Size / line | Weight | Used for |
|---|---|---|---|
| Page title | 24 / 32 | 700 | One per page (FG1 "Radar", FG6 "Image Ads") |
| Section title | 16 / 24 | 600 | Card and section headings, modal titles |
| Strong | 14 / 22 | 600 | Table headers, row names, popover titles, emphasised values |
| Body | 14 / 22 | 400 | Everything else |
| Small | 12 / 20 | 400 (600 in tags) | Meta, help, tags, table sub-lines |
| Figure | 20 / 28 | 600 | Stat tile numbers only |

S-04: these six styles only. No 11, 13, 15, 17 or 18 px. No weight 500.
S-05: one page title, then one line under it (Body, text secondary) that says what the page is for.

### Space, radius, elevation

| Token | Value |
|---|---|
| Spacing steps | 4, 8, 12, 16, 24, 32. Nothing in between |
| Between blocks on a page | 16 (12 on phones) |
| Card padding | 16 (FG2, FG6) |
| Page padding | 24 desktop, 16 phones |
| Radius | Tags 4 · controls 6 · cards, popovers, modals, sheets 8 |
| Control heights | 24 small, 32 default, 40 large. Phones: 44 tap area |
| Shadow | None on cards (1 px border secondary instead). antd `boxShadowSecondary` on floating things only |

S-06: cards are white with a 1 px border and no shadow. Nested cards are not allowed; inside a card use a divider or a fill box.

## 2. What each component is for

The page must let someone tell these apart without reading.

| Component | Looks like (library) | Means | Rules |
|---|---|---|---|
| **Primary button** | Orange fill, white text | The one main action of a page, modal or card | S-10: at most one per view. Never two side by side |
| **Default button** | White, 1 px `#D9D9D9` border, dark text (FG1 "Dimension filter", "Iterate") | Any other action | S-11: same height as its neighbours. Icon on the left, caret on the right when it opens a menu |
| **Text button** | No border, dark text, grey hover fill | Low-emphasis action in a toolbar or card footer (FG1 "Radar settings") | S-12: always with an icon or inside a row of actions, so it doesn't read as a label |
| **Link** | Orange text; underlined when inside a sentence (FG3 "import a brief") | Goes somewhere | S-13: navigation only. If it changes data, it is a button |
| **Icon button** | 32 square, default button style (FG2 eye and open icons) | A repeat action in a dense row | S-14: tooltip and aria-label always |
| **Tag** | 12 / 600 or 400, radius 4, tinted fill + 1 px border in the same hue, or neutral fill | A state or a category. Read-only | S-15: never clickable. If it needs a click, it's not a tag |
| **Grade tag** | Tag in a status hue, 12 / 600, fixed 30 × 22 (FG1: tinted fill, coloured border and letter) | A grade | S-16: the only tag that opens something (its grade popover). Dashed border = predicted |
| **Chip** | Default-button look at 24 or 32 high, radius 6; selected = primary tint + primary border | A choice among several (filters, quick prompts, "Simplify the layout") | S-17: has a selected state or performs its named prompt. Not used for showing values |
| **Segmented** | Grey track (fill), white selected item with soft shadow (FG2 Performance / AI Recommendation) | 2 to 4 views of the same thing | S-18: the top bar Overview / Radar switch is the one exception: orange selected item, as drawn in FG1 |
| **Tabs** | Line tabs, selected label orange 600 with orange ink bar (FG2) | Sections of one page | S-19: counts are small neutral tags after the label |
| **Switch** | Library Switch, label on its left (FG1 "Show ad status") | An on/off setting that applies at once | S-20: never for an action |
| **Checkbox** | Library Checkbox | Picking several items to act on | S-21: selecting a card also tints the card (primary tint + border) |
| **Select / Input** | White, 1 px border, radius 6 (FG3, FG6) | Entering or choosing a value | S-22: outlined, not filled. Label above or to the left, required mark in error red |

S-23: plain text is the default. A value shown once, with a label, is text ("Angle  Choice"), not a tag or a chip.
S-24: two things that look alike must behave alike. If a row has a grade tag and an action, the action is a default button (white, 32 high, dark text) so it can't be mistaken for a grade.

## 3. Page anatomy

Top to bottom, every page:

| Slot | Content | Rules |
|---|---|---|
| Top bar | Account name · Overview / Radar switch (Analytics only) · quiet meta (attribution, sync) · credits · bell | S-30: meta is Small, text tertiary, icon + text, no boxes |
| Breadcrumb (child pages) | Plain links, Small | S-31: no chips or tags in a breadcrumb |
| Title row | Page title · at most one status tag · actions on the right | S-32: actions are one primary plus default buttons at the same height; overflow goes in a "more" menu; destructive actions live in that menu |
| One-liner | What the page is for | S-05 |
| Controls row | Period, Filter, Display | S-33: default buttons, left-aligned; active filters shown as removable chips below |
| Content | Table page: white page, table straight on it. Card page: grey layout background, white cards | S-34: one focal point per page: the table (Radar), the headline (Overview), the preview (creative page), the suggestions (ad page) |

## 4. Card and section anatomy

| Part | Rule |
|---|---|
| Section title | S-40: Section title style. A 3 px orange bar to its left marks a top-level section inside a long card (FG2 "Performance", "Persona"). Not used on small cards |
| Help line | S-41: optional, one line, Small, text tertiary, directly under the title |
| Action | S-42: at most one, right-aligned on the title row: a link ("Open Radar") or one default button |
| Body | S-43: one kind of content per card: a table, a list, key-value rows, stat tiles or prose |
| Footer | S-44: only for a secondary action or a rating. No help text in footers |
| Section made of cards | S-45: title sits above the cards, never around them |

### Content blocks (the only ones allowed)

| Block | Shape | Use |
|---|---|---|
| Stat tile | Label (Small, secondary) · Figure · optional delta tag · optional sub-line (Small, tertiary) | Key metrics |
| Key-value row | Label left (Body, secondary, fixed 120 column) · value right (Body, text) · divider between rows | Facts about one thing |
| List row | Thumb 40 · name (Strong) + sub-line (Small) · trailing value or tag · chevron if it navigates | Rounds, ads, copies |
| Bar row | Label + count · bar · percent + amount | Shares of a total |
| Prose | Body, max 72 characters wide | Summaries and explanations |

S-46: each fact appears once per page. If the grade is in the header, it isn't repeated in the body; if the count is in the title, it isn't a tag as well.

## 5. Tables (Radar)

| Rule | |
|---|---|
| S-50 | Header: Strong, fill background, no column dividers. Row height 64. Row rules in border secondary |
| S-51 | First column: thumb 40, name (Strong, one line, ellipsis), one sub-line (Small, tertiary). Nothing else in the cell |
| S-52 | Text left, numbers right with tabular figures, grades centred in a fixed-width column |
| S-53 | One action per row, a default button, in its own column (FG1 "Iterate") |
| S-54 | Missing value is "N/A" in text disabled, never an empty cell |
| S-55 | Footer row "Total" in Strong; pagination only above one page |

## 6. Overlays

| Need | Use | Rules |
|---|---|---|
| Name a control or define a term | Tooltip | S-60: one sentence, ends with a full stop, no actions |
| One small task or one answer, tied to its trigger | Popover (bottom sheet on phones) | S-61: title in Strong, never scrolls, at most one action, 12 padding, width 280 to 340 |
| A form or a decision that needs focus | Modal, radius 8 (bottom sheet on phones) | S-62: title in Section title, one primary button bottom right (FG3) |
| A list that stays open while you work | Drawer (Tasks) | S-63 |
| Confirmation of something done | Message toast | S-64: one line, past tense, no "successfully" |

## 7. Forms (FG3)

| Rule | |
|---|---|
| S-70 | Group label on the left (Strong), fields on the right; on phones the group label sits above |
| S-71 | Field label Body, required mark in error red before it; help under the field in Small, tertiary |
| S-72 | Fields are outlined white. Read-only values are a fill box, not a disabled field |
| S-73 | The footer has the summary of what will happen (count, cost) on the left and one primary button on the right |
| S-74 | Demo-only limits use the "Demo" banner and never look like product UI |

## 8. States

| State | Rule |
|---|---|
| Selected | S-80: primary tint fill + primary border, text stays dark |
| Hover | S-81: rows and list items get the primary tint; buttons follow the library |
| Focus | S-82: 2 px primary outline, 2 px offset, on every interactive element |
| Disabled | S-83: library disabled style plus a tooltip that says why |
| Loading | S-84: skeleton in the shape of the content; spinners only inside buttons |
| Empty | S-85: one line that says what will appear here and one action to make it appear |
| Locked (creative in an ad) | S-86: info-blue tag with a lock icon; the primary action changes to Iterate |

## 9. Icons

S-90: the library's icon set (antd outlined, plus the Atria icons on the library's Icon page), 16 px beside Body text, 14 px beside Small, 12 px for chevrons.
S-91: an icon accompanies a label; it replaces the label only on an icon button with a tooltip.
S-92: at most one icon per label, and no icon on a button whose label already says it ("Improve CPA").

## 10. Motion and phones

Unchanged: `src/motion/tokens.ts` and sections 8 to 10 of `ui-research-spec.md`. Transform and opacity only, no overshoot, reduced motion respected. Phones: popovers become bottom sheets, 44 px tap areas, 16 px page padding.

## 11. Content

Unchanged: glossary and copy rules in `ui-research-spec.md` section 4 and `claude/atria-content-design-guide.md`. Added by S-46: say each thing once.

## 12. Deviations from the Figma file and library

Every row needs Mancini's yes and a Figma annotation. "Rule says" is what sections 1 to 9 require.

| ID | Today's build | Rule says | Recommendation |
|---|---|---|---|
| V-01 | Lucide icons (changed 21 Nov 11:05) | antd outlined icons (S-90) | **Revert.** Icon is one of the library's pages and the brief's benchmark is "matches the Ant Design system at a glance". The fussy look came from using icons at 12 to 14 px and too many of them; S-90 to S-92 fix that. One-file change (`AppIcons.tsx`) |
| V-02 | Tonal grey buttons and fields, radius 8 (21 Nov 11:05) | White outlined buttons and fields, radius 6 (S-11, S-22) | **Revert.** FG1, FG3 and FG6 all show white outlined controls. Containers get their contrast from the grey layout background, which is in the library |
| V-03 | Ink text links with orange hover (21 Nov 11:05) | Orange links (S-13) | **Change to library orange** `#F66C30`, underlined inside sentences. Not brown |
| V-04 | Page title 20 / 600 (DL-12) | 24 / 700 (FG1, FG6) | **Change to 24.** |
| V-05 | Radius 10 cards, 14 floating (L-030, L-152 open) | 6 controls, 8 cards and floating | **Change.** Closes L-152 |
| V-06 | Weight 500 in many places; sizes 11, 13, 15 | 400 / 600; six styles (S-04) | **Change.** |
| V-07 | Lavender idea pills (D3) | Chip (S-17) in neutral style | **Change to neutral chips** with a copy icon on hover. Lavender is outside the palette |
| V-08 | Grade tags in antd preset colours | Library status hues (LP-07) | **Change.** |
| V-09 | Radar tabs | FG1 uses card tabs with icons, info buttons and an All tab | **Follow FG1** (Mancini 12:40): card tabs, icons, ⓘ, All. Refinement: Chrome-style selected tab joined to the content, other tabs recessed. Our names stay |
| V-10 | Overview / Radar switch as a pill | FG1: rectangular, radius 6, orange selected | **Change shape to radius 6.** Keep the motion |
| V-11 | Dark floating action bar that morphs into the form | FG2 has a large primary "Iterate ads" button in the Recommendations header; FG3 is a modal | **Keep** (approved, core to the flow). Annotate |
| V-12 | Creative page before the editor, starred-only gallery, archive (D11) | FG6 lists projects; the editor opens directly | **Keep** (Mancini 11:00). Annotate |
| V-13 | Overview page contents (D7, D8) | No Overview frame in Figma | **Keep**; built from live Atria's sections with library styling |
| V-14 | Section titles without the orange bar | FG2 marks sections with a 3 px orange bar | **Add on the ad page's long card sections only** (S-40) |

## 13. Rebuild checklist (run per page)

1. List every fact on the page and where it appears. Cut repeats (S-46).
2. Name the page's focal point and its one primary action (S-10, S-34).
3. Rebuild using only the components in section 2 and the blocks in section 4.
4. Grep the page's CSS for colours, sizes and radii that aren't tokens. Zero allowed.
5. Screenshot at 1504, 834 and 390, beside the matching Figma frame where one exists.
6. Add one row per change to `design-rationale.md`, citing S-rules.

Page order: Radar → ad page → create form → variations page → creative gallery → creative page → editor → Overview.

## 14. Amendments from the Figma consistency pass (21 Nov, 14:40)

Measured values replace the earlier wording where they differ. Detail and sources: `design-rationale.md`, "Figma consistency pass".

| Rule | Was | Now |
|---|---|---|
| Tokens | One fill (0.04) | Two fills: `--c-fill` 0.04 and `--c-fill-2` 0.02. Grade tints are tokens |
| Type | Six styles | Adds 20/28 Semi Bold for overlay titles and the account name |
| Radius | Controls 6 | 40 px buttons 8 |
| S-16 | Grade tag fixed 30 x 22 | Hugs its letter, 22 high |
| S-18 | Orange pill switch | Unchanged: the pill stays (Mancini 13:36, confirmed 14:14) |
| S-19, V-09 | Line tabs on Radar | Rounded tab bar with a Chrome-style active tab (Mancini 12:39, 13:46, confirmed 14:14); line tabs elsewhere |
| S-50 | Header fill 0.04, no column dividers, rows 64 | Fill 0.02, split lines, header 48, rows 66, cells 12 / 8 |
| S-51 | Name Strong, sub-line tertiary | Name Body Regular, sub-line Small at 0.65 |
| S-81 | Rows hover in the primary tint | Rows hover in `--c-fill-2` |

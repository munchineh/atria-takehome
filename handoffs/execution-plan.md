# Atria Radar Redesign — UX Audit, Agent Split & 24-Hour Execution Plan

> **Rule on Order:** Items `1–18` strictly preserve original screenshot mapping order. Do not renumber.
> **Target Timeline:**
> - **Milestone 1 (Midday Sat, Nov 21):** Working desktop (`1440px`) + mobile (`375px`) prototype complete in code.
> - **Milestone 2 (Sat Afternoon):** Live screens imported to Figma (`html.to.design`), old vs. new user flows mapped, and bilingual annotations (**English + Simplified Chinese / 简体中文**) applied.
> - **Milestone 3 (Sun Morning, Nov 22):** Final submission ready.

---

## Part 1: Screenshot-Mapped UX Audit & Decision Matrix (Items 1–18)

### A. Information Architecture, Navigation & Core Flows (`1, 2, 14, 15, 18`)
* **1. Creation → Analytics Back-Routing Bug & IA Split (`Assets` vs. `Creation` vs. `Analytics/Radar`)**
  * *Issue:* Clicking a creative under `Creation` routes back to the ad detail view inside `Analytics`, breaking user context.
  * *Direction:* Decouple `Creation` (active studio/workspace for generating, editing, and comparing ad iterations) from `Analytics/Radar` (live performance diagnostics & market intelligence). Clicking a tile in `Creation` must open a **Creation Detail / Studio Workspace** inside `Creation`, with an explicit secondary action (`View Live Metrics in Analytics ↗`) only when the user intentionally wants performance data.
  * *Owner:* **Claude** (routing/state separation) + **AG** (navigation tabs & workspace layout).
* **2. Performance vs. Recommendations Split**
  * *Issue:* Old version separated `Performance` and `Recommendations`; evaluate whether keeping them separate or unifying them is superior.
  * *Direction:* Unify **diagnostic metrics + contextual AI recommendations** at the ad-detail level (so users see *why* a metric dropped right next to the fix), while preserving distinct top-level tabs for **Overview** (triage), **Analytics** (deep diagnostics), and **Creation** (execution). Document this rationale explicitly in Figma to justify why contextual pairing beats tab-switching.
  * *Owner:* **Claude** (rationale copy for Figma) + **AG** (unified detail layout).
* **14. Terminology Audit: Is "Grades" the Best Term?**
  * *Issue:* "Grades" (A/B/C/F) feels academic/punitive and ambiguous for ad performance vs. creative health.
  * *Direction:* Replace or pair "Grades" with clearer performance-oriented terminology—e.g., **Creative Health Score / Performance Tier** (`Top Performer`, `Strong`, `Needs Iteration`, `Fatigued`) or **Iteration Status** (`Revision` vs. `Iteration` — see Figma glossary). Keep visual tier badges (`S / A / B / C` or color-coded status pills) scannable while clarifying what the score measures (e.g., hook rate + conversion efficiency).
  * *Owner:* **Claude** (data schema & label mapping) + **AG** (badge UI).
* **15. Overview Section Titles & Mental Model**
  * *Issue:* Current Overview section headings are unclear and lack user-intent framing.
  * *Direction:* Restructure Overview around the 4 core user questions:
    1. **What do I need to know now?** → *Active Signals & Creative Health Summary*
    2. **What should I do next?** → *Priority Actions & Recommended Iterations*
    3. **What did I do previously?** → *Recent Iterations & Shipped Variants*
    4. **What changed?** → *Performance Deltas & Fatigue Alerts (vs. Last Period)*
  * *Owner:* **Claude** (section copy & mock delta data) + **AG** (Overview layout hierarchy).
* **18. End-to-End User Journey (`Overview` ↔ `Analytics` ↔ `Creation`)**
  * *Issue:* Clicking any tile in `Creation` ejects the user back to `Analytics`.
  * *Direction:* Enforce sticky mode context:
    * `Overview` = Triage & daily briefing (routes to either `Analytics` for diagnosis or `Creation` to act).
    * `Analytics` = Deep performance inspection & competitor Radar (has a `Create Iteration →` CTA that hands off into `Creation`).
    * `Creation` = Self-contained creative workbench (briefs, variations, lineage tree). Users stay inside `Creation` across clicks until they explicitly navigate away.
  * *Owner:* **Claude** (navigation state machine) + **AG** (breadcrumb & mode indicators).

---

### B. Ad Detail, Content Structure & Visual Hierarchy (`3, 4, 7, 8, 9, 10, 11, 12, 13`)
* **3. Reference Gallery with Write-Ups**
  * *Issue:* Old version displayed curated references with write-ups in a gallery; current version removed it.
  * *Direction:* Restore a compact **Reference & Inspiration Strip / Gallery** inside `Creation` and recommendation drawers, pairing visual thumbnails with concise 2-line strategic takeaways (*Why this hook/format works*) so creative strategists have concrete visual anchors rather than text-only prompts.
  * *Owner:* **Claude** (mock reference items + write-ups) + **AG** (responsive gallery cards).
* **4. AI Recommendation Section Content Structure**
  * *Issue:* Lost the clear structured sub-sections from the old AI recommendation panel.
  * *Direction:* Restore structured, scannable cards inside AI Recommendations: **(1) Diagnosis (What's happening)** → **(2) Evidence (Metric/Signal)** → **(3) Recommended Action (What to change)** → **(4) One-Click Apply to Brief**.
  * *Owner:* **Claude** (structured recommendation schema) + **AG** (structured card UI).
* **7. Grade / Score Tooltip & Popover Hierarchy**
  * *Issue:* Tooltip/popover has flat visual hierarchy, especially the final two lines which carry different priority and information levels.
  * *Direction:* Restructure popover into 3 clear visual tiers:
    1. **Header:** Score/Tier + primary takeaway (bold, high contrast).
    2. **Breakdown:** 2–3 key contributing metrics (`tabular-nums`).
    3. **Footer Metadata (Last 2 lines):** Visually separate calculation window/confidence note (muted caption `text-xs text-muted-foreground` above a subtle divider) from the actionable CTA link (`View scoring methodology` or `How to improve`).
  * *Owner:* **AG** (popover typography, spacing, and visual verification).
* **8. Ad Summary Card Layout**
  * *Issue:* Content layout inside the Ad Summary card is cluttered and lacks scanning hierarchy.
  * *Direction:* Enforce a strict 3-zone grid: **Left:** Thumbnail + format/aspect badge; **Center:** Truncated title (`truncate`), clean single-row status/goal pills, and top 3 KPIs (`tabular-nums`); **Right:** Primary action button (`Iterate` / `View`).
  * *Owner:* **AG** (card layout & spacing).
* **9. Ad Generations — Missing Pre-Filled Brief Option**
  * *Issue:* Creating a variation no longer offers a pre-filled brief option.
  * *Direction:* Restore a **"Pre-fill Brief from AI Diagnosis / Winning Hook"** toggle/button at the top of the variation generator modal/panel, populating target audience, hook angle, and visual adjustments automatically while keeping fields editable.
  * *Owner:* **Claude** (pre-fill state & mock brief templates) + **AG** (brief form UI).
* **10. Good / Bad Result Icons Placement on Revision Page**
  * *Issue:* Thumbs-up/down (good/bad result) icons sit awkwardly next to the Download button.
  * *Direction:* Separate **Utility Actions** (`Download`, `Share`, `Duplicate`) from **Outcome / Feedback Evaluation** (`Mark as Winning Variant` / `Flag Underperforming` or AI feedback rating). Place outcome/result tags in the variant header/status bar, and keep Download in the top-right utility toolbar.
  * *Owner:* **AG** (toolbar & header action grouping).
* **11. Missing Stylized Text Version**
  * *Issue:* Stylized text overlay / creative copy formatting is missing from the ad view.
  * *Direction:* Verify whether the stylized text layer belongs to the active variant data model; restore a **Creative Copy & Stylized Hook Preview** block (showing exact headline styling/emphasis alongside raw body copy) inside the Ad Detail / Creation view.
  * *Owner:* **Claude** (restore stylized copy field in mock data) + **AG** (render stylized preview).
* **12. `D.CTR Nothing stops the scroll...` Single-Line Squeeze**
  * *Issue:* Critical diagnostic insight (`D.CTR` + hook critique) is crammed into one truncated/easy-to-miss line.
  * *Direction:* Promote this diagnostic callout out of inline metadata into a dedicated **Hook & Scroll-Stop Diagnostic Banner** with bold metric pill (`D.CTR 1.4% · Below Benchmark`), full readable 2-line explanation (no truncation), and direct link to hook variations.
  * *Owner:* **AG** (callout banner layout & typography).
* **13. Overview Radar Switch Design**
  * *Issue:* Evaluate whether the Overview Radar toggle should be a switch, and upgrade its visual polish to a sliding pill control.
  * *Direction:* Keep it as a segmented **2-option sliding pill switch** (e.g., `My Brand Performance` vs. `Market Radar`) with smooth `transform` pill animation (`framer-motion` or CSS transition), clear active contrast, and distinct visual framing so users immediately understand they are switching lens scope.
  * *Owner:* **AG** (animated sliding pill component).

---

### C. Responsive Mobile Experience (`5, 6`)
* **5. Long Date & Goal Tags on Mobile**
  * *Issue:* Verbose date range and campaign goal tags wrap awkwardly or overflow on narrow screens.
  * *Direction:* Use responsive compact formatting below `768px` (e.g., `Nov 1–21` instead of `November 1, 2026 – November 21, 2026`; concise goal pills like `ROAS · 3.2x` or `Conversions` with `whitespace-nowrap`), collapsing secondary tags into a `+2` overflow chip.
  * *Owner:* **AG** (responsive tag formatting & overflow chips).
* **6. Dedicated Mobile UX Strategy (Mobile vs. Desktop User Intent)**
  * *Issue:* Mobile layout cannot just shrink desktop tables; mobile and desktop serve different user behaviors.
  * *Direction:* Design mobile (`375px`) around **On-the-Go Triage & Quick Approval**, while Desktop (`1440px`) serves **Deep Analysis & Multi-Variant Creation**:
    * **Mobile (`375px`):** Stacked KPI summary cards (no horizontal scroll tables), sticky bottom action bar for quick approve/iterate, slide-over filter drawer with active count badge, and simplified single-column lineage timeline.
    * **Desktop (`1440px`):** Multi-column comparison tables (`tabular-nums`), side-by-side creative preview + AI diagnostics, and full horizontal/tree lineage exploration.
  * *Owner:* **AG** (mobile-specific layouts + `/browser` verification at `375px` and `1440px`).

---

### D. Ad Iteration Lineage / Version Tree (`16, 17`)
* **16 & 17. Long-Chain Ad Lineage (`A > B > C > D`) & Dedicated Iteration History View**
  * *Issue:* Users need to trace multi-step creative chains (`A > B > C > D`) with context on *why* each change occurred to prevent flip-flopping or repeating past mistakes.
  * *Direction:* Build a dedicated **Iteration History & Lineage Drawer / Page** accessible from any ad in `Creation` or `Analytics`, displaying a connected node chain (`v1 A → v2 B → v3 C → v4 D`) where each node shows:
    1. **Date & Placement** (e.g., `Nov 14 · IG Reels / Feed`)
    2. **Performance Score / Tier** (with delta badge vs. parent, e.g., `+24% D.CTR`)
    3. **AI Change Summary & Rationale** (concise bullet diff of what changed—e.g., *"Swapped static opener for 2s UGC hook to fix 3-second drop-off"*—plus a `⚠️ Repeat Pattern Alert` badge if a change reverts an earlier test).
  * *Owner:* **Claude** (tree/chain data structure `parentId`, AI diff summaries, flip-flop detection logic) + **AG** (interactive lineage timeline/tree UI).

---

## Part 2: Strategic Alignment (Brief, PM Roadmap & Figma Deliverables)

### 1. Brief Audit Checklist (Verify Before Midday Saturday)
* [ ] **Direct Coverage:** Every prompt requirement from the take-home brief is explicitly answered and visible in the prototype.
* [ ] **Problem Resolution:** All 18 identified UX/flow friction points above are addressed in either the live prototype (P0/P1) or the phased PM roadmap (P2).
* [ ] **Screen-by-Screen Superiority:** Every redesigned screen demonstrably improves scannability, task completion speed, and mobile usability compared to the legacy Atria Radar UI.

### 2. PM-Style Phased Product Roadmap (Include in Figma & Summary Doc)
Organize recommendations into a clear 3-horizon roadmap showing **Impact vs. Effort** and **Phase Graduation Criteria**:
* **Phase 1 — Quick Wins (Shipped in Prototype Today):**
  * Fix `Creation` → `Analytics` navigation trap; unify contextual AI recommendations with metrics; upgrade Overview section titles (`What to know / do next / did previously / changed`); fix tooltip hierarchy, sliding pill switch, `D.CTR` banner, pre-filled brief toggle, and mobile responsive card/tag layouts.
  * *Graduation to Phase 2:* Core navigation confusion eliminated; users complete triage-to-iteration loop in under 3 clicks.
* **Phase 2 — Core Feature Builds (Weeks 2–4):**
  * Full **Iteration Lineage Tree (`A > B > C > D`)** with AI diff summaries and flip-flop/repeat-mistake warnings; curated **Reference Gallery** with strategic write-ups; stylized creative copy layer sync.
  * *Graduation to Phase 3:* Teams track multi-generation creative ROI and cut duplicate creative testing by >25%.
* **Phase 3 — Long-Term Stretch Goals (Quarter 2+):**
  * Predictive creative fatigue alerts before ROAS drops; automated cross-channel variant generation with live ad-account publishing; collaborative team approval workflows on mobile.

### 3. Figma Presentation & Bilingual Annotation Blueprint (Sat Afternoon → Sun Morning)
* **Old vs. New User Flows:** Place side-by-side flow diagrams at the top of the Figma canvas contrasting the **Legacy Fragmented Loop** (tab-hopping between Performance, Recommendations, and dead-end Creation tiles) against the **Redesigned Intent-Driven Loop** (`Overview Triage` → `Analytics Diagnosis` → `Self-Contained Creation Studio & Lineage`).
* **Terminology Glossary Frame:** Dedicate a clean callout card defining key nomenclature shifts:
  * **Revision (修订)** = Tactical asset tweak (copy fix, aspect ratio crop, visual polish within the same concept).
  * **Iteration (迭代)** = Hypothesis-driven creative evolution (`A → B → C`) targeting a specific metric bottleneck (e.g., hook rate or CTR).
  * **Creative Health Tier (创意健康度等级)** = Replaces ambiguous "Grades" with actionable performance status.
* **Bilingual Design Annotations (English + Simplified Chinese / 简体中文):**
  * Every screen frame in Figma must use numbered pins (`01`, `02`, `03`...) linked to a structured annotation card on the right rail containing:
    * **[EN] Problem & Design Decision:** Concise rationale tied to user intent and ad-tech workflow efficiency.
    * **[简体中文] 问题与设计决策:** Accurate, natural Simplified Chinese product/UX translation covering the exact same rationale.

---

## Part 3: Next 24-Hour Execution Schedule (Claude + Antigravity)

* **01:15 – 04:00 (Tonight — Parallel Build Sprint 1):**
  * **Claude (`feat/architecture-and-data`):** Update data schemas for `Creation` isolation, structured AI recommendations, pre-filled briefs, stylized copy text, and `A > B > C > D` lineage chains with AI diff summaries.
  * **Antigravity (`feat/ui-and-mobile`):** Implement Overview 4-question sections, sliding pill Radar switch, `D.CTR` diagnostic banner, tooltip hierarchy, Ad Summary card cleanup, and action icon regrouping. Verify at `1440px`.
* **04:00 – 09:00 (Rest / Overnight Checkpoint):**
  * Commit both branches cleanly before resting.
* **09:00 – 12:00 (Sat Morning — Lineage UI, Mobile Optimization & Merge):**
  * **Antigravity:** Build the `A > B > C > D` Iteration Lineage panel/drawer and execute the dedicated `375px` mobile optimization pass (compact date/goal pills, stacked KPI cards, mobile filter drawer).
  * **Claude:** Generate the bilingual (**EN + 简体中文**) Figma annotation copy bank, Old vs. New flow specs, and PM 3-phase roadmap table in `/handoffs/figma-annotations-bilingual.md`.
  * **11:45 Merge Gate:** Merge `feat/architecture-and-data` + `feat/ui-and-mobile` into `main` and run final smoke test.
* **12:00 – 20:00 (Sat Afternoon/Evening — Figma Assembly):**
  * Import live desktop (`1440px`) and mobile (`375px`) screens into Figma via `html.to.design`.
  * Lay out Old vs. New User Flows, Terminology Glossary, Phased PM Roadmap, and numbered bilingual (`EN` + `简体中文`) screen annotations.
* **Sun Morning (Before Submission):**
  * Final visual QA pass across all Figma frames, prototype links, and brief checklist items.

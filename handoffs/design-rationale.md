# Design rationale log

One row per change made after the overnight build, newest at the bottom. Feeds the Figma annotation cards (problem, decision, why, trade-off). Rule IDs (R-…) and decision IDs (DL-…) point to `handoffs/ui-research-spec.md`. Items 01 to 18 of the plan have their rationale in `handoffs/figma-annotations-bilingual.md`.

| # | Time (KST) | Screen | Problem | Decision | Why | Trade-off | Commit |
|---|---|---|---|---|---|---|---|
| 1 | Nov 21, 08:50 | Radar | The line under the title said "Radar grades every ad", which makes Radar a grading tool and repeats its own name | "Find out how each ad is performing and what to do next." | A radar finds things; grades are how it shows them. "Each ad" sets the zoom level against Overview (the account); "what to do next" leads into the Next steps column (DL-08, DL-14, R-P) | Drops the word "grade" from the first line, so the help link "How Radar grades your ads" carries it | see log |
| 2 | Nov 21, 08:50 | Overview | "which ads to fix first" overlapped with Radar's job | "See how this account is doing and where to look first." | Overview is the briefing; choosing what to do per ad belongs to Radar (DL-14) | Slightly less concrete | see log |
| 3 | Nov 21, 08:50 | Creative gallery | The line described variations grouped by ad, which made the gallery read as a second Radar | "Every creative you've made in Atria, ready to refine or use in an ad." | The gallery's unit is a creative that may or may not be tied to an ad (DL-15) | The page still lists by ad until the rebuild lands | see log |
| 4 | Nov 21, 08:50 | Creative gallery, teaching card | The card told people to open Radar and made "Open Radar" its main button, pulling them out of Creation | Body "Each round is saved with the ad it came from. Find them all here, grouped by ad." One button, "Got it" | Each area keeps people in it until they choose to leave (DL-06, DL-13, R-E) | One fewer shortcut to Radar | see log |

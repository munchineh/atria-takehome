# Atria Radar: iteration redesign (prototype)

Take-home prototype. React + Ant Design 6 + Motion, deployed as a static-assets Cloudflare Worker (unlisted).

- `npm run dev` · `npm run build` · `npm run deploy` (needs `wrangler login`)
- Motion tokens: `src/motion/tokens.ts` (every animation uses them; reduced motion respected)
- Mock data: `src/data/mock.ts`; shared job state: `src/data/store.tsx`
- Screens: `src/screens/` (1 Radar, 2 Ad detail; more to come)

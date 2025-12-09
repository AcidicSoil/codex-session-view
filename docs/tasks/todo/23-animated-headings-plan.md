Context
- All headings currently render as static text while logo uses TextGif; want cohesive animated texture for every title
- Need reusable approach so repeated headings can rely on a wrapper component and maintain existing styling/accessibility
- Updates must honor AGENTS rules (no hacks, long-term maintainable, respect file-size/responsibility constraints)

Success criteria
- Every heading that previously used plain <h1>/<h2>/etc now renders via TextGif (directly or via AnimatedHeader) with original styling preserved
- TypeScript build, eslint, and app runtime report no missing imports or runtime regressions related to heading changes
- Semantic structure (screen readers/SEO) matches current hierarchy; no headings downgraded or removed

Deliverables
- New reusable component at src/components/ui/animated-header.tsx wrapping TextGif with fixed GIF/fallback styling
- Updated page/component files replacing heading elements with AnimatedHeader/TextGif per spec
- Notes in PR/commit message summarizing scope (if applicable)

Approach
1) Inventory headings: use rg/ast-grep to list JSX files containing <h1>-<h6>; categorize shared layouts vs unique cases
2) Implement AnimatedHeader wrapper (typed props, cn helper) ensuring it composes TextGif and keeps semantic wrappers easy to apply
3) Update each heading site-wide: for simple headings swap <hX> children to AnimatedHeader inside same semantic tag; for repeated patterns replace with AnimatedHeader component import; keep classes via className prop
4) Verify imports/exports resolve (tsc --noEmit or pnpm test typecheck) and run targeted lint/tests if configured
5) Manually inspect key pages (home/dashboard/docs) to confirm headings animate, maintain spacing, and align with accessibility expectations

Risks / unknowns
- Some headings may rely on pseudo-elements or nested spans for decoration; replacing with TextGif might disrupt layout
- SEO/ARIA implications if we remove actual <h*> tags entirely; may need to wrap AnimatedHeader inside heading tags rather than replace them
- Performance: multiple animated GIFs could impact load; need to ensure TextGif handles multiple instances efficiently

Testing & validation
- Run pnpm lint (or project-equivalent) and pnpm test:typecheck if available
- Launch pnpm dev and visually inspect major routes (landing, viewer, docs) in both light/dark themes
- Optionally run existing playwright/vitest suites touching UI rendering if they exist

Rollback / escape hatch
- Keep changes scoped per file; if regressions appear, revert updated heading components or wrapper while leaving other areas untouched

Owner/Date
- Codex / 2024-08-30

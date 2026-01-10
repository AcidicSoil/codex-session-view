## You asked:

Auto-update demo GIF.md

File

src.md

File

can we have it just do screenshots instead?

---

## ChatGPT Replied:

Thought for 47s

Yes. Replace the “record video → ffmpeg → demo.gif” pipeline with “scripted walkthrough → save step screenshots → commit PNGs.” This keeps the same deterministic Playwright navigation flow you already outlined.

Auto-update demo GIF

Playwright spec: capture screenshots at each milestone
------------------------------------------------------

    // path: tests/demo.screens.spec.ts
    import { test, expect } from '@playwright/test'
    import fs from 'node:fs'
    import path from 'node:path'
    
    const OUT_DIR = path.join(process.cwd(), 'public', 'demos')
    
    function disableAnimationsCss() {
      return `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
          caret-color: transparent !important;
        }
      `
    }
    
    test('demo walkthrough (screenshots)', async ({ page }) => {
      fs.mkdirSync(OUT_DIR, { recursive: true })
    
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.addStyleTag({ content: disableAnimationsCss() })
    
      const shot = async (name: string) => {
        await page.screenshot({
          path: path.join(OUT_DIR, `${name}.png`),
          animations: 'disabled',
        })
      }
    
      await page.goto('/')
    
      // deterministic data load (pick your actual testid)
      await page.getByTestId('load-demo-session').click()
      await expect(page.getByTestId('timeline')).toBeVisible()
      await shot('demo-01-loaded')
    
      // explorer -> open a session
      await page.getByTestId('session-explorer').getByTestId('group-row').first().click()
      await page.getByTestId('session-explorer').getByTestId('session-row').first().click()
      await expect(page.getByTestId('viewer')).toBeVisible()
      await shot('demo-02-viewer')
    
      // timeline filtering + search
      await page.getByTestId('timeline-filter').click()
      await page.getByTestId('filter-action').check()
      await page.getByTestId('filter-mutation').check()
      await shot('demo-03-filters')
    
      await page.getByTestId('timeline-search').fill('stream')
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('timeline-row')).toHaveCountGreaterThan(0)
      await shot('demo-04-search')
    
      // event details
      await page.getByTestId('timeline-row').nth(2).click()
      await expect(page.getByTestId('event-details')).toBeVisible()
      await shot('demo-05-details')
    
      // chat dock + popouts
      await page.getByTestId('chat-dock-tab').click()
      await expect(page.getByTestId('chat-dock')).toBeVisible()
      await shot('demo-06-chat')
    
      await page.getByTestId('chat-popout-summary').click()
      await expect(page.getByTestId('summary-popout')).toBeVisible()
      await shot('demo-07-summary')
      await page.getByTestId('summary-popout-close').click()
    
      await page.getByTestId('chat-popout-commits').click()
      await expect(page.getByTestId('commits-popout')).toBeVisible()
      await shot('demo-08-commits')
    })
    

This is the same “feature tour” click path you already described; it just emits PNGs instead of a video/GIF.

Auto-update demo GIF

GitHub Action: regenerate screenshots on every push
---------------------------------------------------

    # path: .github/workflows/update-demo-screens.yml
    name: Update demo screenshots
    on:
      push:
        branches: [main]
    
    permissions:
      contents: write
    
    jobs:
      demo-screens:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
    
          - uses: pnpm/action-setup@v4
            with:
              version: 9
    
          - uses: actions/setup-node@v4
            with:
              node-version: 20
              cache: pnpm
    
          - run: pnpm install --frozen-lockfile
          - run: npx playwright install --with-deps chromium
    
          - run: pnpm build
          - run: |
              pnpm start -- --port 3000 &
              npx wait-on http://127.0.0.1:3000
    
          - run: pnpm playwright test tests/demo.screens.spec.ts --project=chromium
    
          - uses: stefanzweifel/git-auto-commit-action@v5
            with:
              commit_message: "chore(demo): update screenshots"
              file_pattern: public/demos/demo-*.png
    

This mirrors your existing “overwrite a known path and commit on main” approach, just for `public/demos/demo-*.png` instead of `public/demos/demo.gif`.

Auto-update demo GIF

README: show the screenshots + cache-bust
-----------------------------------------

Embed one “hero” screenshot or a small grid. If GitHub image caching bites, add `?v=${GITHUB_SHA}` the same way you planned for the GIF.

Auto-update demo GIF

Example (hero + two secondary):

    <img src="https://github.com/AcidicSoil/codex-session-view/raw/HEAD/public/demos/demo-01-loaded.png?v=0000000" />
    <img src="https://github.com/AcidicSoil/codex-session-view/raw/HEAD/public/demos/demo-05-details.png?v=0000000" />
    <img src="https://github.com/AcidicSoil/codex-session-view/raw/HEAD/public/demos/demo-08-commits.png?v=0000000" />
    

If you want automatic cache-busting, apply the same `sed` rewrite pattern you already outlined (swap `demo.gif` for `demo-01-loaded.png`, etc.).

Auto-update demo GIF

---


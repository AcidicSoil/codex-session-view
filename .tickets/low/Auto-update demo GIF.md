## You asked:

README.md

File

is there a way to update my gif on my readme.md on new ui changes so it always shows my latest ui changes ?

---

## ChatGPT Replied:

Thought for 1m 28s

README rendering is static. The only way it “always shows latest UI” is: regenerate the media file automatically, commit it, and (if needed) bust GitHub’s image caching.

Your README already points at the moving target (`raw/HEAD/public/demos/demo.gif`).

README

  
So the missing piece is an automated workflow that overwrites `public/demos/demo.gif` on every push to `main`.

### 1) Keep the README URL, just auto-regenerate `public/demos/demo.gif`

Create `.github/workflows/update-demo-gif.yml`:

    name: Update demo GIF
    on:
      push:
        branches: [main]
    
    permissions:
      contents: write
    
    jobs:
      demo-gif:
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
    
          # Build + run app (adjust command/port to your project)
          - run: pnpm build
          - run: |
              pnpm start -- --port 3000 &
              npx wait-on http://127.0.0.1:3000
    
          # Run a single Playwright “demo” test that records video
          - run: pnpm playwright test tests/demo.spec.ts --project=chromium
    
          # Convert recorded video to GIF (uses first found video)
          - run: |
              sudo apt-get update
              sudo apt-get install -y ffmpeg
              VIDEO="$(ls -1 test-results/**/video.webm test-results/**/video.mp4 2>/dev/null | head -n 1)"
              test -n "$VIDEO"
              ffmpeg -y -i "$VIDEO" -vf "fps=12,scale=960:-1:flags=lanczos" -loop 0 public/demos/demo.gif
    
          - uses: stefanzweifel/git-auto-commit-action@v5
            with:
              commit_message: "chore(demo): update demo.gif"
              file_pattern: public/demos/demo.gif
    

Add a Playwright test at `tests/demo.spec.ts` that navigates to your app and performs the minimal interactions you want captured, with video recording enabled in Playwright config.

### 2) If GitHub keeps showing an old cached GIF, force cache-busting

Update the README image URL to include a `?v=` parameter that your workflow rewrites each run, e.g.:

    <img src="https://github.com/acidicsoil/codex-session-view/raw/HEAD/public/demos/demo.gif?v=0000000" alt="session preview" />
    

Then add this step before the auto-commit:

          - run: |
              sed -i "s#demo.gif?v=[^\" ]*#demo.gif?v=${GITHUB_SHA}#g" README.md
    

And include `README.md` in `file_pattern` so the URL changes every update (new URL = new cache entry).

---

## You asked:

I will need it to show the other features within so the playwright run will need to navigate and click on stuff within the app to showcase the app

---

## ChatGPT Replied:

Thought for 1m 44s

Write a dedicated “demo walkthrough” Playwright spec that performs a deterministic sequence of clicks across your major features, with stable selectors (`data-testid`). That spec becomes the single source for `public/demos/demo.gif`, which your workflow regenerates on every `main` push. Your README already points at `public/demos/demo.gif` via `raw/HEAD`, so updating that file updates the README preview.

README

### 1) Add stable selectors in the UI

Put `data-testid` on every element you need for the showcase:

*   navigation items, primary CTAs
    
*   timeline list + first row + details panel
    
*   filter controls + search input
    
*   chat dock tabs + Summary/Commits pop-outs (if you want them in the demo)
    

Example pattern:

    <button data-testid="nav-viewer">Viewer</button>
    <div data-testid="timeline" />
    <button data-testid="timeline-filter">Filter</button>
    

### 2) Create a deterministic fixture entrypoint

Make the demo reproducible without external dependencies:

*   Add a “Load demo session” control that loads a bundled fixture (`/public/demos/demo-session.json`), or
    
*   Use a file input upload and have Playwright set the file.
    

This avoids flaky “empty state” recordings.

### 3) Record the walkthrough in one spec

`tests/demo.spec.ts` (template; replace testids with yours):

    import { test, expect } from '@playwright/test'
    import path from 'node:path'
    import { fileURLToPath } from 'node:url'
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    
    test('demo walkthrough (recorded)', async ({ page }) => {
      // consistent capture
      await page.setViewportSize({ width: 1280, height: 720 })
    
      await page.goto('/')
    
      // Load deterministic data (pick ONE approach)
    
      // Approach A: click a built-in demo loader
      await page.getByTestId('load-demo-session').click()
    
      // Approach B: upload a fixture file
      // const fixture = path.join(__dirname, 'fixtures', 'demo-session.json')
      // await page.setInputFiles('input[type="file"]', fixture)
    
      await expect(page.getByTestId('timeline')).toBeVisible()
    
      // 1) Session explorer group expand + open session
      await page.getByTestId('session-explorer').getByTestId('group-row').first().click()
      await page.getByTestId('session-explorer').getByTestId('session-row').first().click()
      await expect(page.getByTestId('viewer')).toBeVisible()
    
      // 2) Timeline filtering + search
      await page.getByTestId('timeline-filter').click()
      await page.getByTestId('filter-action').check()
      await page.getByTestId('filter-mutation').check()
      await page.getByTestId('timeline-search').fill('stream')
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('timeline-row')).toHaveCountGreaterThan(0)
    
      // 3) Inspect an event (details panel)
      await page.getByTestId('timeline-row').nth(2).click()
      await expect(page.getByTestId('event-details')).toBeVisible()
    
      // 4) Chat dock + pop-outs (summary/commits)
      await page.getByTestId('chat-dock-tab').click()
      await expect(page.getByTestId('chat-dock')).toBeVisible()
    
      await page.getByTestId('chat-popout-summary').click()
      await expect(page.getByTestId('summary-popout')).toBeVisible()
      await page.getByTestId('summary-popout-close').click()
    
      await page.getByTestId('chat-popout-commits').click()
      await expect(page.getByTestId('commits-popout')).toBeVisible()
      await page.getByTestId('commits-popout-close').click()
    
      // pacing for GIF readability (keep small; avoid long fixed sleeps)
      await page.waitForTimeout(300)
    })
    

### 4) Force Playwright to always emit a video for this spec

In `playwright.config.ts`, set video to `on` and keep a single chromium project for the demo run:

    import { defineConfig } from '@playwright/test'
    
    export default defineConfig({
      use: {
        baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000',
        video: { mode: 'on', size: { width: 1280, height: 720 } },
        trace: 'off',
      },
      projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
      outputDir: 'artifacts/playwright',
    })
    

### 5) Convert the recorded video to `public/demos/demo.gif`

Use ffmpeg palette mode for quality:

    VIDEO="$(ls -1 artifacts/playwright/**/video.webm artifacts/playwright/**/video.mp4 2>/dev/null | head -n 1)"
    ffmpeg -y -i "$VIDEO" -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 public/demos/demo.gif
    

This produces a single GIF that reflects your current UI and the scripted “feature tour” clicks on every push.

---


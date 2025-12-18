import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionFixture = path.resolve(__dirname, './fixtures/sample-session.jsonl');

test.describe('codex session viewer', () => {
  test('home page renders hero and API controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /TanStack Start React boilerplate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Test GET/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Todos/i })).toBeVisible();
  });

  test('viewer route loads discovery data and handles uploads', async ({ page }) => {
    await page.goto('/viewer');
    await expect(page.getByRole('heading', { name: /Workspace Discovery/i })).toBeVisible();
    await expect(page.getByText(/Upload session log/i)).toBeVisible();
    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.first().setInputFiles(sessionFixture);
    await expect(page.getByText(/Loaded/, { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/finish up the users work/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/example\/session-viewer-fixture • main/i)).toBeVisible({ timeout: 10_000 });
  });

  test('viewer discovery filters respond to interaction', async ({ page }) => {
    await page.goto('/viewer');
    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.first().setInputFiles(sessionFixture);
    const repoButton = page.getByRole('button', { name: /Toggle example\/session-viewer-fixture • main repository/i });
    await expect(repoButton).toBeVisible({ timeout: 20_000 });
    await repoButton.click();
    await expect(page.getByText(/sample-session\.jsonl/i)).toBeVisible();
    await repoButton.click();
    await expect(page.getByText(/Showing 1 of 1 sessions/i)).toBeVisible();

    const searchInput = page.getByPlaceholder('Search repo, branch, filename, or tag');
    await searchInput.fill('session-viewer');
    await expect(page.getByText(/example\/session-viewer-fixture/i)).toBeVisible();
    await searchInput.fill('');

    await page.getByRole('button', { name: /Size: any/i }).click();
    await page.getByRole('menuitemcheckbox', { name: /> 512 KB/i }).click();
    await page.keyboard.press('Escape');
    // Type a manual max to ensure the dropdown does not refetch data
    await page.getByLabel('Maximum size').fill('5');
    await page.getByLabel('Minimum size').fill('0');
    await expect(page.getByText(/example\/session-viewer-fixture/i)).toBeVisible();
    await expect(page.getByText(/No session logs discovered yet/i)).toHaveCount(0);
  });

  test('session explorer loads uploaded session into timeline', async ({ page }) => {
    await page.goto('/viewer');
    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.first().setInputFiles(sessionFixture);
    const repoToggle = page.getByRole('button', { name: /Toggle example\/session-viewer-fixture • main repository/i });
    await expect(repoToggle).toBeVisible({ timeout: 20_000 });
    await repoToggle.click();
    const loadButton = page.getByRole('button', { name: /Load session/i }).first();
    await loadButton.click();
    await expect(page.getByText(/Explorer session uploaded via test harness/i)).toBeVisible({ timeout: 20_000 });
  });

  test('logs route records client-side runtime errors', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'Playwright synthetic error',
          filename: 'e2e',
          lineno: 1,
          colno: 1,
        }),
      );
    });
    await page.waitForTimeout(500);
    await page.goto('/logs');
    await expect(page.getByRole('heading', { name: /Client Logs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh logs/i })).toBeVisible();
    await expect(page.locator('pre')).toContainText(/Playwright synthetic error/, { timeout: 10_000 });
  });

  test('timeline layout keeps dropzone, tracing beam, navbar, and chat dock aligned', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto('/viewer');
    const dropzone = page.getByTestId('session-upload-dropzone');
    await expect(dropzone).toBeVisible();
    await expect(dropzone).toHaveAttribute('aria-busy', 'false');
    const dropzoneBox = await dropzone.boundingBox();
    expect(dropzoneBox?.y ?? Infinity).toBeLessThan(400);

    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.first().setInputFiles(sessionFixture);

    const beam = page.getByTestId('timeline-tracing-beam');
    await expect(beam).toBeVisible({ timeout: 20_000 });
    const initialHeight = await beam.evaluate((node) => node.getBoundingClientRect().height);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    const scrolledHeight = await beam.evaluate((node) => node.getBoundingClientRect().height);
    expect(scrolledHeight).toBeGreaterThan(initialHeight + 5);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(300);
    const restoredHeight = await beam.evaluate((node) => node.getBoundingClientRect().height);
    expect(restoredHeight).toBeLessThan(scrolledHeight - 5);

    await page.mouse.wheel(0, 800);
    const floatingNavbar = page.getByTestId('viewer-floating-navbar');
    await expect(floatingNavbar).toBeVisible();
    const navBox = await floatingNavbar.boundingBox();
    expect(navBox?.y ?? Infinity).toBeLessThan(100);

    const chatBox = await page.locator('#viewer-chat').boundingBox();
    const timelineBox = await page.locator('#viewer-tabs').boundingBox();
    expect(chatBox).toBeTruthy();
    expect(timelineBox).toBeTruthy();
    const horizontalGap = (chatBox!.x ?? 0) - ((timelineBox!.x ?? 0) + (timelineBox!.width ?? 0));
    expect(horizontalGap).toBeGreaterThan(20);
    expect(horizontalGap).toBeLessThan(200);
    expect(chatBox!.x ?? 0).toBeGreaterThan(40);
  });

  test.describe('chatbot flows', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/viewer')
      await page.route('**/api/chatbot/stream', async (route) => {
        const body = route.request().postData() ?? '{}'
        let mode = 'session'
        try {
          mode = JSON.parse(body).mode ?? 'session'
        } catch {
          // ignore parse errors
        }
        const reply =
          mode === 'general' ? 'General reply from mocked provider.' : 'Session coach reply from mocked provider.'
        await route.fulfill({ status: 200, body: reply, headers: { 'content-type': 'text/plain' } })
      })
      await page.route('**/api/chatbot/analyze', async (route) => {
        const body = route.request().postData() ?? '{}'
        let analysisType: string | undefined
        try {
          analysisType = JSON.parse(body).analysisType
        } catch {
          analysisType = undefined
        }
        if (analysisType === 'commits') {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ commitMessages: ['feat: add scrolling fix', 'chore: sync analysis tests'] }),
            headers: { 'content-type': 'application/json' },
          })
          return
        }
        const summaryMarkdown =
          analysisType === 'hook-discovery'
            ? [
                '## Hookify Analysis Results',
                '',
                '### Issue 1: Clipped panel height',
                '**Severity**: Medium',
                '**Tool**: UI layout',
                '**Pattern**: `.coach-scroll-region` not bounded',
                '',
                '### Issue 2: Missing viewport fit',
                '**Severity**: Medium',
                '**Tool**: Dialog layout',
                '**Pattern**: `h-[85vh]` without min-h-0 children',
                '',
                '### Issue 3: Scroll container focus',
                '**Severity**: Low',
                '**Tool**: Keyboard',
                '**Pattern**: Regions fail to announce',
                '',
                '---',
                '',
                '## Summary',
                'Found 3 behaviors worth preventing: 2 medium, 1 low.',
                'Recommend creating rules to cap analysis panel heights.',
              ].join('\n')
            : ['## Session Intelligence Summary', '', '- Analysis placeholder content'].join('\n')
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ summaryMarkdown }),
          headers: { 'content-type': 'application/json' },
        })
      })
    })

    test('session coach can send and reset chats', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Summarize this session/i)
      await textarea.fill('Provide a quick summary')
      await page.keyboard.press('Enter')
      await expect(page.getByText(/Provide a quick summary/)).toBeVisible()
      await expect(page.getByText(/Session coach reply from mocked provider/)).toBeVisible()
      await page.getByRole('button', { name: /New chat/i }).click()
      await expect(page.getByText(/Provide a quick summary/)).toHaveCount(0)
    })

    test('general chat toggle hides misalignment UI and streams responses', async ({ page }) => {
      await page.getByRole('button', { name: /^General$/i }).click()
      await expect(page.getByText(/AGENTS issues detected/i)).toHaveCount(0)
      const textarea = page.getByPlaceholder(/Ask anything about the viewer/i)
      await textarea.fill('Say hello in general mode')
      await page.getByRole('button', { name: /^Send$/ }).click()
      await expect(page.getByText(/General reply from mocked provider/)).toBeVisible()
    })

    test('session coach scroll regions isolate wheel input', async ({ page }) => {
      await page.setViewportSize({ width: 1500, height: 900 })
      await page.goto('/viewer')
      const chatRegion = page.getByTestId('coach-scroll-chat')
      await expect(chatRegion).toBeVisible({ timeout: 20_000 })
      const chatViewport = page.locator('[data-testid="coach-scroll-chat"] [data-slot="scroll-area-viewport"]')
      await expect(chatViewport).toBeVisible()

      await page.evaluate(() => {
        const viewport = document.querySelector('[data-testid="coach-scroll-chat"] [data-slot="scroll-area-viewport"]') as HTMLElement | null
        if (viewport) {
          const filler = document.createElement('div')
          filler.style.height = '2000px'
          filler.setAttribute('data-testid', 'coach-scroll-test-filler')
          viewport.appendChild(filler)
        }
        window.scrollTo({ top: 0 })
      })

      const composer = page.getByPlaceholder(/Summarize this session/i)
      await expect(composer).toBeVisible()
      const composerBoxBefore = await composer.boundingBox()
      expect(composerBoxBefore).not.toBeNull()

      await chatViewport.evaluate((node) => {
        node.scrollTop = 0
        node.scrollTop = 800
      })
      await page.waitForTimeout(100)

      const composerBoxAfter = await composer.boundingBox()
      expect(composerBoxAfter).not.toBeNull()
      expect(Math.abs((composerBoxAfter!.y ?? 0) - (composerBoxBefore!.y ?? 0))).toBeLessThan(2)

      const pageScroll = await page.evaluate(() => window.scrollY)
      expect(pageScroll).toBeLessThan(1)
    })

    test('hook discovery analysis panel fits within viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 780 })
      await page.waitForLoadState('networkidle')
      await page.goto('/viewer/chat', { waitUntil: 'load' })
      await page.waitForLoadState('networkidle')
      await expect(page.getByPlaceholder(/Summarize this session/i)).toBeVisible({ timeout: 20_000 })
      const analysisButton = page.getByRole('button', { name: /AI Analysis/i })
      await expect(analysisButton).toBeVisible({ timeout: 20_000 })
      await analysisButton.click()

      const hookTab = page.getByRole('tab', { name: /Hook Discovery/i })
      await hookTab.click()
      await page.getByRole('button', { name: /Run Conversation Analyzer/i }).click()
      await expect(page.getByText(/Hookify Analysis Results/)).toBeVisible()

      const scrollMetrics = await page.evaluate(() => {
        const viewport = document.querySelector(
          '[data-testid="coach-scroll-analysis-hooks"] [data-slot="scroll-area-viewport"]',
        ) as HTMLElement | null
        if (!viewport) return null
        const rect = viewport.getBoundingClientRect()
        return {
          bottom: rect.bottom,
          height: rect.height,
          viewportHeight: window.innerHeight,
        }
      })
      expect(scrollMetrics).not.toBeNull()
      expect(scrollMetrics!.bottom).toBeLessThan(scrollMetrics!.viewportHeight - 8)

      const hooksViewport = page.locator(
        '[data-testid="coach-scroll-analysis-hooks"] [data-slot="scroll-area-viewport"]',
      )
      await hooksViewport.evaluate((node) => {
        node.scrollTop = node.scrollHeight
      })
      await expect(
        page
          .locator('[data-testid="coach-scroll-analysis-hooks"]')
          .getByText(/Found 3 behaviors worth preventing:/),
      ).toBeVisible()
    })
  })
})

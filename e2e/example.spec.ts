import { test, expect } from '@playwright/test'

const viewerHeroTestId = 'viewer-hero-title'
const viewerTitleTestId = 'viewer-title'

test('home page renders hero content', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId(viewerHeroTestId)).toContainText('Codex session viewer')
})

test('viewer workspace loads shell', async ({ page }) => {
  await page.goto('/viewer')
  await expect(page.getByTestId(viewerTitleTestId)).toContainText('Session Intelligence Viewer')
})

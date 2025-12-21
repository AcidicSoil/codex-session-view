import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_TEST_IDS } from '~/lib/testIds';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionFixture = path.resolve(__dirname, './fixtures/sample-session.jsonl');

test.describe('codex session viewer', () => {
  test('uploads a session and opens the timeline', async ({ page }) => {
    await page.goto('/viewer');
    await expect(page.getByTestId(DATA_TEST_IDS.viewerTitle)).toBeVisible();

    await page.getByRole('button', { name: /Upload session/i }).click();
    const fileInput = page.getByTestId(DATA_TEST_IDS.sessionUploadInput);
    await fileInput.setInputFiles(sessionFixture);
    await page.keyboard.press('Escape');

    const repoToggle = page.getByTestId(DATA_TEST_IDS.sessionRepoToggle).first();
    await expect(repoToggle).toBeVisible({ timeout: 5000 });
    await repoToggle.click();

    const loadButton = page.getByTestId(DATA_TEST_IDS.sessionLoadButton).first();
    await expect(loadButton).toBeEnabled({ timeout: 5000 });
    await loadButton.click();

    await page.getByRole('link', { name: /^Inspector/i }).click();
    await expect(page.getByText(/Timeline/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Load a session to see its timeline here/i)).toHaveCount(0, { timeout: 5000 });
  });
});

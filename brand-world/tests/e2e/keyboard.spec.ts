import { expect, test } from '@playwright/test';
import { passAgeGate, waitForScene, waitUntilStill } from './helpers.ts';

// Full keyboard play: walk with WASD, use things with E, close with E/Escape.
test('play the slice with only the keyboard', async ({ page }) => {
  await page.goto('./');
  await passAgeGate(page);
  await waitForScene(page, 'plaza');
  const prompt = page.locator('button.prompt');

  // W walks away from the camera; the kiosk is on that line from spawn.
  await page.keyboard.down('w');
  await expect(prompt).toContainText('Info kiosk', { timeout: 15_000 });
  await page.keyboard.up('w');

  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toContainText('Rolled Fresh');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // To the factory door, around the fountain: W+D heads north until the
  // building wall stops us (navmesh clamp), then S+D slides east to the door.
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(1000);
  await waitUntilStill(page);
  await page.keyboard.up('w');
  await page.keyboard.down('s');
  await expect(prompt).toContainText('Enter the factory', { timeout: 15_000 });
  await page.keyboard.up('s');
  await page.keyboard.up('d');
  await page.keyboard.press('Enter');
  await waitForScene(page, 'factory_interior');

  // Escape also closes panels.
  await page.keyboard.down('w');
  await expect(prompt).toContainText('Production line', { timeout: 15_000 });
  await page.keyboard.up('w');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

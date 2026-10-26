import { expect, test } from '@playwright/test';
import { passAgeGate, trackVideos, useInteractable, waitForScene } from './helpers.ts';

test('plaza and factory render', async ({ page }) => {
  await trackVideos(page, { freeze: true });
  await page.goto('./');
  await passAgeGate(page);
  await waitForScene(page, 'plaza');
  await expect(page).toHaveScreenshot('plaza.png');

  await useInteractable(page, 'Enter the factory');
  await waitForScene(page, 'factory_interior');
  await expect(page).toHaveScreenshot('factory.png');
});

test('walk, panel, door, video, return', async ({ page }) => {
  await trackVideos(page, { freeze: false });
  await page.goto('./');
  await passAgeGate(page);
  await waitForScene(page, 'plaza');

  // Tap the ground: the camera follows the player, so the view shifts.
  const before = await page.locator('canvas').screenshot();
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.width * 0.35, box.height * 0.65);
  await page.waitForTimeout(1500);
  expect(Buffer.compare(before, await page.locator('canvas').screenshot())).not.toBe(0);

  await useInteractable(page, 'Info kiosk');
  await expect(page.getByRole('dialog')).toContainText('Rolled Fresh');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await useInteractable(page, 'Enter the factory');
  await waitForScene(page, 'factory_interior');

  await useInteractable(page, 'Factory screen');
  await expect.poll(() => page.evaluate(() => {
    const v = (window as unknown as { __videos: HTMLMediaElement[] }).__videos;
    return v.some((x) => !x.paused && !x.muted && x.currentTime > 0);
  })).toBe(true);

  await useInteractable(page, 'Collect the badge');
  await expect(page.getByRole('complementary')).toContainText('Factory badge');

  await useInteractable(page, 'Back to the plaza');
  await waitForScene(page, 'plaza');
});

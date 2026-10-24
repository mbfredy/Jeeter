import { expect, test } from '@playwright/test';
import { passAgeGate, trackVideos, waitForScene } from './helpers.ts';

// First-person street view: toggle in, walk to the kiosk, use it, toggle out.
test('street view: walk and interact in first person', async ({ page, isMobile }) => {
  await trackVideos(page, { freeze: true });
  await page.goto('./');
  await passAgeGate(page);
  await waitForScene(page, 'plaza');
  const prompt = page.locator('button.prompt');

  await page.getByRole('button', { name: 'Street view' }).click();
  await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('street.png');

  if (isMobile) {
    // Push the joystick straight up (forward); the kiosk is dead ahead.
    const box = (await page.locator('.joystick').boundingBox())!;
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 60, { steps: 4 });
    await expect(prompt).toContainText('Info kiosk', { timeout: 15_000 });
    await page.mouse.up();
    await prompt.click();
  } else {
    await page.keyboard.down('w');
    await expect(prompt).toContainText('Info kiosk', { timeout: 15_000 });
    await page.keyboard.up('w');
    await page.keyboard.press('e');
  }
  await expect(page.getByRole('dialog')).toContainText('Rolled Fresh');
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Overview' }).click();
  await expect(page.getByRole('button', { name: 'Street view' })).toBeVisible();
});

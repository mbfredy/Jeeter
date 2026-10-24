import { expect, type Page } from '@playwright/test';

export async function passAgeGate(page: Page, year = '1990') {
  await page.getByLabel('Month').fill('01');
  await page.getByLabel('Day').fill('15');
  await page.getByLabel('Year').fill(year);
  await page.getByRole('button', { name: 'Enter' }).click();
}

export async function waitForScene(page: Page, id: string) {
  await expect(page.locator(`body[data-scene="${id}"][data-scene-ready="true"]`)).toBeAttached({ timeout: 30_000 });
  // Let the follow camera settle before screenshots.
  await page.waitForTimeout(1200);
}

export async function useInteractable(page: Page, label: string) {
  const menu = page.getByRole('button', { name: 'Places nearby' });
  if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
  await page.getByRole('button', { name: label }).click();
}

// Records every video the app starts; optionally freezes them for stable screenshots.
export async function trackVideos(page: Page, { freeze }: { freeze: boolean }) {
  await page.addInitScript((freeze) => {
    const w = window as unknown as { __videos: HTMLMediaElement[] };
    w.__videos = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!w.__videos.includes(this)) w.__videos.push(this);
      return freeze ? Promise.resolve() : play.call(this);
    };
  }, freeze);
}

// Waits until the canvas stops changing (player blocked or arrived, camera settled).
export async function waitUntilStill(page: Page, timeout = 20_000) {
  const canvas = page.locator('canvas');
  const end = Date.now() + timeout;
  let prev = await canvas.screenshot();
  while (Date.now() < end) {
    await page.waitForTimeout(400);
    const next = await canvas.screenshot();
    if (prev.equals(next)) return;
    prev = next;
  }
  throw new Error('canvas never settled');
}

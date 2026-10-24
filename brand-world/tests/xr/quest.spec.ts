import { expect, test, type Page } from '@playwright/test';

// Runs against the dev server with the Meta Quest 3 emulator (IWER). The
// window.__* handles exist only in that dev mode.
type Handles = {
  __xrStore: { getState(): { emulator?: { controllers: Record<'left' | 'right', { updateAxes(id: string, x: number, y: number): void; updateButtonValue(id: string, v: number): void }> } } };
  __world: { getState(): { xrMode: string; nearby: string | null; panel: string | null; set(p: object): void } };
  __player: { position: { x: number; z: number } };
};

const world = (page: Page) => page.evaluate(() => {
  const w = window as unknown as Handles;
  const s = w.__world.getState();
  return { mode: s.xrMode, nearby: s.nearby, panel: s.panel, x: w.__player.position.x, z: w.__player.position.z };
});

async function stick(page: Page, hand: 'left' | 'right', x: number, y: number) {
  await page.evaluate(([hand, x, y]) => {
    (window as unknown as Handles).__xrStore.getState().emulator!.controllers[hand as 'left'].updateAxes('thumbstick', x as number, y as number);
  }, [hand, x, y] as const);
}

test('Quest: tabletop, walk in, thumbstick walk, interact with A', async ({ page }) => {
  // Remove the browser's native (device-less) WebXR so the emulator installs.
  await page.addInitScript(() => delete (Navigator.prototype as { xr?: unknown }).xr);
  await page.goto('./?skipAgeGate');
  await expect(page.locator('body[data-scene="plaza"][data-scene-ready="true"]')).toBeAttached({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Enter VR' }).click();
  await expect.poll(async () => (await world(page)).mode, { timeout: 15_000 }).toBe('tabletop');

  await page.evaluate(() => (window as unknown as Handles).__world.getState().set({ xrMode: 'walkin' }));

  // Left stick forward-left: from spawn this heads straight for the kiosk.
  await pushUntil(page, -0.707, -0.707, 'nearby', 'hotspot_info_kiosk');

  // A uses what is in reach.
  await button(page, 'a-button', 1);
  await expect.poll(async () => (await world(page)).panel).toBe('plaza_welcome');
  await page.waitForTimeout(500);
  await test.info().attach('walk-in-panel', { body: await page.screenshot(), contentType: 'image/png' });
  await button(page, 'a-button', 0);
  await page.evaluate(() => (window as unknown as Handles).__world.getState().set({ panel: null }));

  // Straight ahead (-Z) until the factory wall stops us: the navmesh clamps.
  await pushUntil(page, 0, -1, 'zBelow', -15);
  await stick(page, 'left', 0, -1);
  await page.waitForTimeout(2000);
  await stick(page, 'left', 0, 0);
  const atWall = await world(page);
  expect(atWall.z).toBeGreaterThan(-20.5); // factory wall face at -20

  // Snap turn right 30 degrees; pushing forward now slides east along the wall.
  await stick(page, 'right', 1, 0);
  await page.waitForTimeout(300);
  await stick(page, 'right', 0, 0);
  await pushUntil(page, 0, -1, 'xAbove', atWall.x + 1);
});

async function button(page: Page, id: string, value: number) {
  await page.evaluate(([id, value]) => {
    (window as unknown as Handles).__xrStore.getState().emulator!.controllers.right.updateButtonValue(id as string, value as number);
  }, [id, value] as const);
}

// Holds the left stick and releases it in the same frame the condition is
// met, so slow frame rates cannot carry the player past the target.
async function pushUntil(page: Page, x: number, y: number, kind: 'nearby' | 'zBelow' | 'xAbove', value: string | number) {
  await stick(page, 'left', x, y);
  await page.waitForFunction(([kind, value]) => {
    const w = window as unknown as Handles;
    const s = w.__world.getState();
    const p = w.__player.position;
    const done = kind === 'nearby' ? s.nearby === value : kind === 'zBelow' ? p.z < (value as number) : p.x > (value as number);
    if (done) w.__xrStore.getState().emulator!.controllers.left.updateAxes('thumbstick', 0, 0);
    return done;
  }, [kind, value] as const, { polling: 'raf', timeout: 30_000 });
}

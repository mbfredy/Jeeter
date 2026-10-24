import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { passAgeGate } from './helpers.ts';

test('under-21 is refused and stays refused on reload', async ({ page }) => {
  await page.goto('./');
  await passAgeGate(page, String(new Date().getFullYear() - 20));
  await expect(page.getByRole('alert')).toContainText('21 or older');
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('21 or older');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('invalid birthdate is rejected', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Month').fill('02');
  await page.getByLabel('Day').fill('31');
  await page.getByLabel('Year').fill('1990');
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByRole('alert')).toContainText('valid date');
});

test('dev-only bypasses and test handles are not in the production build', async ({ page }) => {
  await page.goto('./?skipAgeGate');
  await expect(page.getByLabel('Year')).toBeVisible();
  const dir = path.resolve('dist/assets');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const js = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const needle of ['skipAgeGate', '__xrStore', '__world', 'VITE_XR_EMULATE']) expect(js, `${f}: ${needle}`).not.toContain(needle);
  }
});

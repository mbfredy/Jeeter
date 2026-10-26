import { appConfig } from '../../config/app.config.ts';

export type AgeResult = 'pass' | 'fail' | 'invalid';

export function checkBirthdate(year: number, month: number, day: number, now = new Date()): AgeResult {
  const birth = new Date(year, month - 1, day);
  const valid =
    Number.isInteger(year) && year > 1900 &&
    birth.getFullYear() === year && birth.getMonth() === month - 1 && birth.getDate() === day &&
    birth <= now;
  if (!valid) return 'invalid';
  let age = now.getFullYear() - year;
  if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age--;
  return age >= appConfig.minimumAge ? 'pass' : 'fail';
}

// Dev-only skip. import.meta.env.DEV is replaced with false in production
// builds, so this check and its query string are removed from the bundle;
// tests/e2e/compliance.spec.ts asserts that.
export function devSkipAgeGate(): boolean {
  return import.meta.env.DEV && new URLSearchParams(location.search).has('skipAgeGate');
}

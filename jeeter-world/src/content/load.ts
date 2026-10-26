import { appConfig } from '../../config/app.config.ts';
import type { CopyFile, District } from './types.ts';

export function contentUrl(path: string): string {
  return `${import.meta.env.BASE_URL}content/${appConfig.activeDrop}/${path}`;
}

async function json<T>(path: string): Promise<T> {
  const res = await fetch(contentUrl(path));
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

export async function loadContent(): Promise<{ district: District; copy: CopyFile }> {
  const [district, copy] = await Promise.all([json<District>('district.json'), json<CopyFile>('copy.json')]);
  return { district, copy };
}

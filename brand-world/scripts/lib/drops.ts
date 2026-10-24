import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_SRC } from './paths.ts';
import type { CopyFile, District } from '../../src/content/types.ts';

export interface Drop {
  id: string;
  dir: string;
  district: District;
  copy: CopyFile;
}

export function listDrops(): Drop[] {
  return fs
    .readdirSync(CONTENT_SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = path.join(CONTENT_SRC, d.name);
      return {
        id: d.name,
        dir,
        district: JSON.parse(fs.readFileSync(path.join(dir, 'district.json'), 'utf8')),
        copy: JSON.parse(fs.readFileSync(path.join(dir, 'copy.json'), 'utf8')),
      };
    });
}

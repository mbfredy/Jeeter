import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// CONTENT_DIR lets tests point the scripts at fixture drops.
export const CONTENT_SRC = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(ROOT, 'content');
export const CONTENT_OUT = path.join(ROOT, 'public', 'content');
export const ACTIONS_DIR = path.join(ROOT, 'src', 'interactions', 'actions');

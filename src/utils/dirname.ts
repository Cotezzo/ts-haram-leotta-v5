import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export function getDirname(meta: ImportMeta): string {
  return dirname(fileURLToPath(meta.url));
}
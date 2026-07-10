import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const duplicatedRxjs = resolve(process.cwd(), 'apps/web/node_modules/rxjs');

rmSync(duplicatedRxjs, { recursive: true, force: true });

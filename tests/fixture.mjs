import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { database } from '../lib/store.mjs';

export function makeTestDatabase() {
  const path = process.env.PC_E2E_DB || resolve('.data/qa-' + randomUUID() + '.sqlite');
  database(path).close();
  return path;
}

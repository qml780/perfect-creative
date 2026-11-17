import { loadEnvFile } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Writable } from 'node:stream';
import { database, enabled, passwordHash, audit } from '../lib/store.mjs';

try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!enabled()) throw new Error('Demo commands only run in local development.');

if (process.argv[2] === 'migrate') {
  database().close();
  console.log('Local SQLite schema is ready.');
} else if (process.argv[2] === 'admin') {
  const muted = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const reader = createInterface({ input: stdin, output: muted, terminal: true });
  let email, password;
  try {
    stdout.write('Local owner email: ');
    email = (await reader.question('')).trim().toLowerCase();
    stdout.write('\nLocal password (at least 12 characters, hidden): ');
    password = await reader.question('');
    stdout.write('\n');
  } finally {
    reader.close();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 256) throw new Error('Invalid email or password length.');
  const db = database();
  try {
    db.prepare("INSERT INTO employees VALUES (?, ?, 'owner') ON CONFLICT(email) DO UPDATE SET secret=excluded.secret").run(email, passwordHash(password));
    db.prepare('DELETE FROM sessions WHERE email=?').run(email);
    audit(db, email, 'owner:initialize', email);
  } finally { db.close(); }
  console.log('Owner ready at /admin/login.');
} else {
  throw new Error('Use migrate or admin.');
}

import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { products } from './catalog.mjs';

export const enabled = () => process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false';
export function database(path = process.env.DEMO_DB_PATH || '.data/demo.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(resolve(/* turbopackIgnore: true */ path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA busy_timeout = 4000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS products (slug TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE COLLATE NOCASE, status TEXT NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS employees (email TEXT PRIMARY KEY COLLATE NOCASE, secret TEXT NOT NULL, role TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES employees(email), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, status TEXT NOT NULL, payload TEXT NOT NULL, assignee TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, employee TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiry_files (inquiry TEXT PRIMARY KEY REFERENCES inquiries(id), name TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS support_rooms (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, language TEXT NOT NULL, consent INTEGER NOT NULL, updated INTEGER NOT NULL, expires INTEGER NOT NULL, staff_read INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS support_messages (id INTEGER PRIMARY KEY, room TEXT NOT NULL REFERENCES support_rooms(id), sender TEXT NOT NULL, original TEXT NOT NULL, source TEXT NOT NULL, translated TEXT NOT NULL DEFAULT '', target TEXT NOT NULL DEFAULT '', translation_status TEXT NOT NULL DEFAULT 'none', engine TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS support_message_room ON support_messages(room, id);
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!db.prepare("SELECT value FROM settings WHERE key = 'seeded'").get()) {
      const insert = db.prepare('INSERT INTO products VALUES (?, ?, ?, ?)');
      for (const product of products) insert.run(product.slug, product.sku, 'published', JSON.stringify(product));
      db.prepare("INSERT INTO settings VALUES ('seeded', '1')").run();
    }
    db.exec('COMMIT');
    return db;
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }
}

/**
 * @template T
 * @param {(db: DatabaseSync) => T} work
 * @returns {T}
 */
export function withDb(work) {
  if (!enabled()) throw new Error('Local demo storage is disabled');
  const db = database();
  try { return work(db); } finally { db.close(); }
}

export const catalog = () => enabled() ? withDb(db => readProducts(db, true)) : [];
export function readProducts(db, published = false) {
  const rows = db.prepare(`SELECT * FROM products ${published ? "WHERE status = 'published'" : ''} ORDER BY rowid`).all();
  return rows.map(({ body, status }) => ({ ...JSON.parse(body), status }));
}

export function settings() {
  const fallback = { brand: process.env.BRAND_NAME || 'Perfect Creative', heroEn: '', heroZh: '' };
  return enabled() ? { ...fallback, ...withDb(db => Object.fromEntries(db.prepare("SELECT key, value FROM settings WHERE key != 'seeded'").all().map(row => [row.key, row.value]))) } : fallback;
}

export function saveProduct(db, input, originalSlug, actor) {
  const { status, sku, slug, category, en, zh, materialEn, materialZh, descEn, descZh, photo, photos, ...specs } = input;
  const gallery = [photo, ...photos.split(',').map(item => item.trim())].filter(Boolean);
  const product = {
    slug, sku, category, names: [en, zh], material: [materialEn, materialZh],
    desc: [descEn, descZh], photos: [...new Set(gallery)], specs
  };
  db.exec('BEGIN IMMEDIATE');
  try {
    if (originalSlug) {
      const result = db.prepare('UPDATE products SET slug=?, sku=?, status=?, body=? WHERE slug=?').run(slug, sku, status, JSON.stringify(product), originalSlug);
      if (!result.changes) throw new Error('Product no longer exists');
    } else {
      db.prepare('INSERT INTO products VALUES (?, ?, ?, ?)').run(slug, sku, status, JSON.stringify(product));
    }
    audit(db, actor, 'product:' + status, sku);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function audit(db, actor, action, target) {
  db.prepare('INSERT INTO audit(employee,action,target) VALUES (?,?,?)').run(actor, action, target);
}

const hash = (input) => createHash('sha256').update(input).digest('hex');
export function passwordHash(password) {
  const salt = randomBytes(24).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(secret, password) {
  const [salt, digest] = secret.split(':');
  return timingSafeEqual(Buffer.from(digest, 'hex'), scryptSync(password, salt, 64));
}

export function createSession(db, email) {
  const token = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(token), email, Date.now() + 8 * 3600000);
  return token;
}

export const sessionCookie = 'pc_demo_session';
export function getEmployee(token) {
  if (!enabled() || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return withDb(db => db.prepare('SELECT e.email,e.role FROM sessions s JOIN employees e ON e.email=s.email WHERE s.id=? AND s.expires>?').get(hash(token), Date.now()) || null);
}

export function revokeSession(db, token) {
  db.prepare('DELETE FROM sessions WHERE id=?').run(hash(token || ''));
}

export function recordInquiry(db, data) {
  const id = 'RFQ-' + randomBytes(15).toString('base64url');
  db.prepare('INSERT INTO inquiries(id,status,payload,created) VALUES (?, ?, ?, ?)').run(id, 'NEW', JSON.stringify(data), new Date().toISOString());
  return id;
}

export function allowAttempt(db, key, limit, windowMs) {
  const now = Date.now();
  const { count } = db.prepare(`INSERT INTO rate_limits VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires <= ? THEN 1 ELSE count + 1 END,
    expires = CASE WHEN expires <= ? THEN excluded.expires ELSE expires END RETURNING count`).get(key, now + windowMs, now, now);
  return Number(count) <= limit;
}

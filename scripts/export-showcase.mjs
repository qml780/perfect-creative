import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { products } from '../lib/catalog.mjs';
import './build-viewer.mjs';

const prefix = process.env.SHOWCASE_BASE_PATH ?? '/perfect-creative';
if (!/^\/[a-z0-9][a-z0-9-]*$/.test(prefix)) throw new Error('Invalid showcase base path');

const dataDir = resolve('.data');
await mkdir(dataDir, { recursive: true });
const output = await mkdtemp(resolve(dataDir, 'showcase-'));
const port = 3138;
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, PC_TEST_BUILD: '1', DEMO_DB_PATH: ':memory:', DEMO_MODE: 'true', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'ignore', 'inherit']
});
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Showcase rendering server stopped');
    try {
      const response = await fetch(origin + '/en', { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // Next.js may still be starting or compiling.
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 300));
  }
  throw new Error('Showcase rendering server did not start');
}

function documentHTML({ title, description, markup, locale }) {
  return `<!doctype html>
<html lang="${locale === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="${escape(description)}">
<title>${escape(title)}</title>
<link rel="icon" href="${prefix}/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${prefix}/showcase.css">
<script src="${prefix}/site.js" defer></script>
</head>
<body>${markup}</body>
</html>`;
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: process.env.SHOWCASE_BROWSER || 'msedge' });
  const page = await browser.newPage({ javaScriptEnabled: false });
  const css = await Promise.all(['site.css', 'design.css'].map(file => readFile(resolve('app', file), 'utf8')));
  await Promise.all([
    cp('public', output, { recursive: true }),
    cp('app/icon.svg', resolve(output, 'icon.svg')),
    writeFile(resolve(output, '.nojekyll'), ''),
    writeFile(resolve(output, 'showcase.css'), css.join('\n').replaceAll('url("/fonts/', 'url("' + prefix + '/fonts/'))
  ]);
  const routes = ['', 'products', ...products.map(product => 'products/' + product.slug), 'applications', 'customization', 'wholesale', 'about', 'contact', 'faq', 'privacy', 'quote'];
  for (const locale of ['en', 'zh']) {
    for (const route of routes) {
      const urlPath = '/' + [locale, route].filter(Boolean).join('/');
      const response = await page.goto(origin + urlPath, { waitUntil: 'domcontentloaded' });
      if (!response?.ok()) throw new Error(`Could not render ${urlPath}: ${response?.status()}`);
      const snapshot = await page.evaluate(({ prefix, locale, route }) => {
        const zh = locale === 'zh';
        const root = document.querySelector('.storefront');
        const main = root?.querySelector('main');
        if (!main) throw new Error('Missing storefront');
        root.querySelectorAll('script, .support-launch, .support-dialog, .quote-demo, .filters').forEach(node => node.remove());
        if (route === 'privacy') {
          main.querySelector('.page-intro h1').textContent = zh ? '预览隐私说明' : 'Showcase privacy notice';
          main.querySelector('.page-intro [data-enter-body]').textContent = zh ? '此展示版不包含询价表单或在线客服，不接收访客输入。' : 'This showcase has no inquiry form or live chat and does not receive visitor submissions.';
        }
        if (route === 'quote') {
          const form = main.querySelector('form');
          const notice = document.createElement('p');
          notice.className = 'notice';
          notice.textContent = zh ? '这是网站展示版。在线询价和客服将在正式站点启用。' : 'This is a website showcase. Enquiries and live chat will be available on the full site.';
          form.replaceWith(notice);
        }
        for (const node of root.querySelectorAll('[src], [href], [data-photo]')) {
          for (const attr of ['src', 'href', 'data-photo']) {
            const value = node.getAttribute(attr);
            if (!value?.startsWith('/')) continue;
            const url = new URL(value, location.origin);
            const media = url.pathname.match(/^\/_next\/static\/media\/([^/]+)\.[^.]+\.(webp|jpe?g)$/);
            if (media) url.pathname = '/media/' + media[1] + '.' + media[2];
            if (/^\/(en|zh)(\/|$)/.test(url.pathname)) url.pathname += '/';
            node.setAttribute(attr, prefix + url.pathname + url.search + url.hash);
          }
        }
        if (root.querySelector('form, script, [href^="/api/"], [src^="/api/"]')) throw new Error('Unexpected dynamic content in showcase');
        return {
          title: document.title,
          description: document.querySelector('meta[name=description]')?.content ?? '',
          markup: root.outerHTML,
          locale
        };
      }, { prefix, locale, route });
      const target = resolve(output, urlPath.slice(1), 'index.html');
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, documentHTML(snapshot));
    }
  }
  const enHome = await readFile(resolve(output, 'en/index.html'), 'utf8');
  await writeFile(resolve(output, 'index.html'), enHome);
  console.log(output);
} finally {
  await browser?.close();
  if (server.pid && process.platform === 'win32') {
    await new Promise(resolveExit => {
      const stop = spawn('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
      stop.once('exit', resolveExit);
      stop.once('error', resolveExit);
    });
  } else {
    server.kill();
  }
}

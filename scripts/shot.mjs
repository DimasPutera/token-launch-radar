// Screenshot the Token Radar dashboard (out1 build) at 1440x900.
// Serves out1/ over loopback with node:http and drives a system Chromium
// via puppeteer-core (no Chromium download). Writes 3 JPEGs to screenshots/:
//   board.jpg    - full board, no filter
//   detail.jpg   - rank-1 detail dialog (Steakhouse Financial)
//   filtered.jpg - board filtered to the Dexs category
// Each shot is retaken at lower JPEG quality until it fits the 512 KiB cap.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..');
const outDir = join(repo, 'out1');
const shotsDir = join(repo, 'screenshots');
const MAX_BYTES = 524288;

const CHROMES = [
  '/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell',
  '/opt/meta-chromium/chrome',
  '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.78/chrome-linux64/chrome',
];
const executablePath = CHROMES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('shot: no Chromium binary found');
  process.exit(2);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = join(outDir, rel === '' ? 'dashboard/index.html' : rel);
  if (!file.startsWith(outDir) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/dashboard/index.html`;

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

async function shoot(url, name, readySelector) {
  // about:blank first: a goto that differs only by #hash would not reload
  // the page, and the dashboard reads its state from the hash on load.
  await page.goto('about:blank');
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector(readySelector, { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 400));
  const out = join(shotsDir, name);
  for (const quality of [78, 65, 50, 35]) {
    await page.screenshot({ path: out, type: 'jpeg', quality });
    const bytes = statSync(out).size;
    if (bytes <= MAX_BYTES) return { name, bytes, quality };
  }
  throw new Error(`${name} still over ${MAX_BYTES} bytes at quality 35`);
}

mkdirSync(shotsDir, { recursive: true });
const results = [];
try {
  results.push(await shoot(base, 'board.jpg', '#board table tbody tr'));
  results.push(await shoot(base + '#p=steakhouse-financial', 'detail.jpg', '#detail[open]'));
  results.push(await shoot(base + '#category=Dexs', 'filtered.jpg', '#board table tbody tr'));
} finally {
  await browser.close();
  server.close();
}
for (const r of results) console.log(`shot: ${r.name} ${r.bytes} bytes quality=${r.quality} 1440x900`);

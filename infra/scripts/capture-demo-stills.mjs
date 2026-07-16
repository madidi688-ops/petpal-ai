/**
 * Demo stills via system Chrome + puppeteer-core
 * npm run demo:stills
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const require = createRequire(join(root, 'package.json'));
const puppeteer = require('puppeteer-core');

const stillsDir = join(root, 'docs', 'demo', 'stills');
const base = process.env.PETPAL_DEMO_URL || 'http://localhost:3000';
const api = process.env.PETPAL_API_URL || 'http://localhost:4001';

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
  'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
  'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
  'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
].filter(Boolean);

mkdirSync(stillsDir, { recursive: true });

async function loginToken() {
  const res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@petpal.ai', password: 'demo1234' }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(`login failed: ${JSON.stringify(body)}`);
  return body.data.accessToken;
}

async function main() {
  const executablePath = chromeCandidates.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome/Edge not found');

  await fetch(`${api}/health`);
  const token = await loginToken();

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--window-size=1280,720', '--no-sandbox'],
    defaultViewport: { width: 1280, height: 720 },
  });
  const page = await browser.newPage();

  await page.goto(`${base}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.screenshot({ path: join(stillsDir, '01-login.png') });

  await page.evaluate((t) => localStorage.setItem('petpal_token', t), token);
  await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: join(stillsDir, '02-dashboard.png') });

  const petsRes = await fetch(`${api}/pets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const petsBody = await petsRes.json();
  const petId = petsBody?.data?.[0]?.id;

  if (petId) {
    await page.goto(`${base}/chat/${petId}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: join(stillsDir, '03-chat.png') });

    await page.goto(`${base}/pets/${petId}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: join(stillsDir, '04-diary.png') });
  }

  await page.goto(`${base}/case`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: join(stillsDir, '05-case.png') });

  await browser.close();

  const evalReport = join(root, 'ai-agents', 'evals', 'out', 'latest.json');
  if (existsSync(evalReport)) {
    writeFileSync(join(stillsDir, 'eval-report.json'), readFileSync(evalReport, 'utf8'));
  }

  console.log('Demo stills →', stillsDir);
  for (const f of ['01-login.png', '02-dashboard.png', '03-chat.png', '04-diary.png', '05-case.png']) {
    console.log(existsSync(join(stillsDir, f)) ? `  ✓ ${f}` : `  ✗ ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

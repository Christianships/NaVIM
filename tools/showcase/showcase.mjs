// Drives NaVIM on real websites in headless Helium/Chrome with real key events
// (AltRight taps and holds go through src/keys.js like a person's would).
//
//   bun showcase.mjs stills [site...]   hint screenshots -> docs/showcase/<site>.png
//   bun showcase.mjs demo               screen recording -> out/demo.webm
import puppeteer from 'puppeteer-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BROWSER = process.env.BROWSER ?? '/Applications/Helium.app/Contents/MacOS/Helium';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const NAVIM = manifest.content_scripts[0].js.map(f => readFileSync(join(ROOT, f), 'utf8')).join('\n;\n');

export const SITES = {
  wikipedia: 'https://en.wikipedia.org/wiki/Vim_(text_editor)',
  hackernews: 'https://news.ycombinator.com/',
  github: 'https://github.com/vim/vim',
  youtube: 'https://www.youtube.com/results?search_query=vim+tutorial',
  reddit: 'https://www.reddit.com/r/vim/',
  mdn: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  bbc: 'https://www.bbc.com/news',
  amazon: 'https://www.amazon.com/',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch({ width = 1280, height = 800, scale = 2 } = {}) {
  const browser = await puppeteer.launch({
    executablePath: BROWSER,
    headless: 'new',
    args: [`--window-size=${width},${height}`, '--hide-scrollbars', '--lang=en-US'],
    defaultViewport: { width, height, deviceScaleFactor: scale },
  });
  return browser;
}

export async function open(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  // Re-inject on every navigation, like a content script would be.
  page.on('framenavigated', f => f === page.mainFrame() && inject(page).catch(() => {}));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(1500);
  await inject(page);
  return page;
}

// Runtime.evaluate isn't subject to page CSP, so this works on GitHub & co.
export async function inject(page) {
  await page.evaluate(src => {
    if (!globalThis.NaVIM?.hints) (0, eval)(src);
  }, NAVIM);
}

// A caption in the corner so a viewer can see which keys are pressed.
export async function caption(page, text) {
  await page.evaluate(text => {
    let el = document.getElementById('navim-keycast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'navim-keycast';
      el.style.cssText = 'all:initial;position:fixed;left:16px;bottom:16px;z-index:2147483646;padding:8px 12px;border-radius:8px;background:#000;color:#fff;font:600 15px/1 -apple-system,system-ui,sans-serif;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25),0 4px 14px rgba(0,0,0,.5);transition:opacity .15s;pointer-events:none';
      document.documentElement.append(el);
    }
    el.textContent = text;
    el.style.opacity = text ? '1' : '0';
  }, text);
}

export async function tapRightOption(page) {
  await page.keyboard.down('AltRight');
  await sleep(80);
  await page.keyboard.up('AltRight');
}

export async function holdRightOption(page, key, times = 1, gap = 120) {
  await page.keyboard.down('AltRight');
  await sleep(120);
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await sleep(gap);
  }
  await page.keyboard.up('AltRight');
}

// Hold right ⌥ and keep `key` down for `ms` (throttle scrolling).
export async function throttle(page, key, ms) {
  await page.keyboard.down('AltRight');
  await sleep(120);
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await page.keyboard.up('AltRight');
}

// The label NaVIM gave the first on-screen target matching `pick`.
export async function labelFor(page, pick) {
  return page.evaluate(src => {
    const fn = new Function('el', `return (${src})(el)`);
    return globalThis.NaVIM.hints.targets().find(t => fn(t.el))?.label ?? null;
  }, pick.toString());
}

async function stills(names) {
  mkdirSync(join(ROOT, 'docs', 'showcase'), { recursive: true });
  const browser = await launch();
  for (const name of names) {
    const page = await open(browser, SITES[name]);
    await tapRightOption(page);
    await sleep(400);
    const count = await page.evaluate(() => {
      const ls = globalThis.NaVIM.hints.targets().map(t => t.label.length);
      return `${ls.length} (1 key: ${ls.filter(n => n === 1).length}, 2: ${ls.filter(n => n === 2).length}, 3+: ${ls.filter(n => n > 2).length})`;
    });
    const file = join(ROOT, 'docs', 'showcase', `${name}.png`);
    await page.screenshot({ path: file });
    console.log(`${name}: ${count} targets, title "${await page.title()}" -> ${file}`);
    await page.close();
  }
  await browser.close();
}

async function typeLabel(page, pick) {
  const label = await labelFor(page, pick);
  if (!label) throw new Error(`no target matched ${pick}`);
  await caption(page, `type  ${label.toUpperCase()}`);
  for (const ch of label) {
    await sleep(380);
    await page.keyboard.press(ch);
  }
  return label;
}

async function showHints(page) {
  await caption(page, 'tap  right ⌥');
  await sleep(700);
  await tapRightOption(page);
  await sleep(1300);
}

// Each scene: open a site, act out a few NaVIM moves with captions.
const SCENES = {
  async hackernews(page) {
    await showHints(page);
    await typeLabel(page, el => /comments?$/.test(el.textContent.trim()) && el.href?.includes('item?id'));
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await sleep(900);
    await caption(page, 'hold right ⌥ + j   (throttle: keeps speeding up)');
    await throttle(page, 'j', 1700);
    await sleep(500);
    await caption(page, 'hold right ⌥ + h   (back)');
    await sleep(400);
    await holdRightOption(page, 'h');
    await sleep(1600);
  },
  async github(page) {
    await showHints(page);
    await typeLabel(page, el => el.id === 'issues-tab' || /^Issues/.test(el.textContent.trim()));
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await sleep(1200);
    await caption(page, 'hold right ⌥ + d   (half page down)');
    await holdRightOption(page, 'd', 2, 700);
    await sleep(500);
    await caption(page, 'hold right ⌥ + g   (top)');
    await holdRightOption(page, 'g');
    await sleep(1400);
  },
  async youtube(page) {
    await caption(page, 'hold right ⌥ + i   (jump to search)');
    await sleep(500);
    await holdRightOption(page, 'i');
    await sleep(500);
    await caption(page, 'just type: no insert mode');
    await page.keyboard.type('neovim setup', { delay: 90 });
    await page.keyboard.press('Enter');
    // YouTube swaps pages in place, so wait for results rather than a load
    await page.waitForSelector('ytd-video-renderer', { timeout: 15000 }).catch(() => {});
    await sleep(1800);
    await showHints(page);
    await caption(page, 'Esc   (cancel)');
    await sleep(600);
    await page.keyboard.press('Escape');
    await sleep(900);
  },
  async wikipedia(page) {
    await caption(page, 'hold right ⌥ + ]   (next heading)');
    await sleep(500);
    for (let i = 0; i < 3; i++) {
      await holdRightOption(page, ']');
      await sleep(1100);
    }
    await caption(page, 'hold right ⌥ + [   (previous heading)');
    await holdRightOption(page, '[');
    await sleep(1300);
    await showHints(page);
    await typeLabel(page, el => el.textContent.trim() === 'Bram Moolenaar');
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await sleep(1600);
  },
  async mdn(page) {
    await caption(page, 'hold right ⌥ + j   (throttle)');
    await throttle(page, 'j', 1200);
    await sleep(400);
    await caption(page, 'hold right ⌥ + d   (half page down)');
    await holdRightOption(page, 'd', 2, 650);
    await sleep(500);
    await caption(page, 'hold right ⌥ + g   (top)');
    await holdRightOption(page, 'g');
    await sleep(1000);
    await showHints(page);
    await caption(page, 'tap right ⌥ again   (cancel)');
    await sleep(500);
    await tapRightOption(page);
    await sleep(900);
  },
};

async function demo(names) {
  const dir = join(ROOT, 'tools', 'showcase', 'out');
  mkdirSync(dir, { recursive: true });
  const browser = await launch({ scale: 1 });
  for (const name of names) {
    const page = await open(browser, SITES[name]);
    await caption(page, '');
    const rec = await page.screencast({ path: join(dir, `${name}.webm`) });
    await sleep(500);
    try {
      await SCENES[name](page);
    } catch (e) {
      console.log(`${name}: ${e.message}`);
    }
    await caption(page, '');
    await sleep(300);
    await rec.stop();
    console.log(`${name}: recorded`);
    await page.close();
  }
  await browser.close();
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === 'stills') await stills(rest.length ? rest : Object.keys(SITES));
if (mode === 'demo') await demo(rest.length ? rest : Object.keys(SCENES));

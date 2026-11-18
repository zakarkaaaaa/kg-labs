import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.APP_URL ?? 'http://127.0.0.1:4174/';
const OUT = 'shots';

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--font-render-hinting=none'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready.then(() => true));
await sleep(700);

const clickByText = async (text) =>
  page.evaluate((needle) => {
    const target = [...document.querySelectorAll('button')].find((element) =>
      element.textContent?.trim().includes(needle),
    );
    target?.click();
    return Boolean(target);
  }, text);

await page.screenshot({ path: `${OUT}/01-explorer-bresenham.png` });

await clickByText('Окружность');
await sleep(500);
await page.screenshot({ path: `${OUT}/02-explorer-circle.png` });

await clickByText('Ву');
await sleep(500);
await page.screenshot({ path: `${OUT}/03-explorer-wu.png` });

await clickByText('Брезенхем');
await sleep(300);
await page.evaluate(() => document.querySelector('.play-btn')?.click());
await sleep(1300);
await page.evaluate(() => document.querySelector('.play-btn')?.click());
await sleep(300);
await page.screenshot({ path: `${OUT}/04-animation.png` });

await clickByText('Бенчмарк');
await sleep(3200);
await page.screenshot({ path: `${OUT}/05-benchmark.png` });

await clickByText('Теория');
await sleep(500);
await page.screenshot({ path: `${OUT}/06-theory.png` });

await page.evaluate(() => {
  const heading = [...document.querySelectorAll('h2')].find((element) =>
    element.textContent?.includes('Сравнение на одном отрезке'),
  );
  heading?.scrollIntoView({ block: 'start' });
});
await sleep(600);
await page.screenshot({ path: `${OUT}/07-theory-compare.png` });

const mobile = await browser.newPage();
await mobile.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await mobile.goto(URL, { waitUntil: 'networkidle0' });
await mobile.evaluate(() => document.fonts.ready.then(() => true));
await sleep(800);
await mobile.screenshot({ path: `${OUT}/08-mobile.png`, fullPage: true });

await browser.close();
console.log('Screenshots saved to', OUT);

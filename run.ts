import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const BASE_URL = 'https://www.human-anatomy-for-artist.com/photos/showSet/id/';
const START_ID = 1;
const END_ID = 1 //6658;
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

async function downloadImage(url: string, filename: string): Promise<null | undefined> {
  const filePath = path.join(DOWNLOAD_DIR, filename);
  const file = fs.createWriteStream(filePath);

  return new Promise<null | undefined>((resolve, reject) => {
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => file.close(e => e ? reject(e) : resolve(null)));
    }).on('error', (err) => {
      fs.unlink(filePath, () => reject(err));
    });
  });
}

async function run() {
  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  for (let setId = START_ID; setId <= END_ID; setId++) {
    const url = `${BASE_URL}${setId}`;
    console.log(`Fetching set ${setId}...`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const photoLinks = await page.$$eval('div.mosaic-gallery__item a', anchors =>
        anchors.map(a => (a as HTMLAnchorElement).href)
      );

      for (const photoUrl of photoLinks) {
        console.log(`  Visiting photo: ${photoUrl}`);
        await page.goto(photoUrl, { waitUntil: 'domcontentloaded' });

        const imgUrl = await page.$eval('#mainImage', img => (img as HTMLImageElement).src);
        const photoIdMatch = photoUrl.match(/id\/(\d+)/);
        const photoId = photoIdMatch ? photoIdMatch[1] : 'unknown';
        const filename = `set${setId}_photo${photoId}.jpg`;

        console.log(`    Downloading: ${filename}`);
        await downloadImage(imgUrl, filename);
      }

    } catch (err) {
      console.warn(`  Failed to process set ${setId}: ${err}`);
      continue;
    }
  }

  await browser.close();
}

run();

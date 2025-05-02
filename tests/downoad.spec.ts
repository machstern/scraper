import { test } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_URL = process.env.SITE_URL + '/photos/showSet/id/';
const START_ID = 2;
const END_ID = 2; // Lower range for testing
const DOWNLOAD_DIR = path.resolve(__dirname, '../downloads');

function downloadImage(url: string, filename: string): Promise<void> {
  const filePath = path.join(DOWNLOAD_DIR, filename);
  const file = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(d => d ? reject(d) : resolve));
    }).on('error', (err) => {
      fs.unlink(filePath, () => reject(err));
    });
  });
}

test('Download images from sets', async ({ page }) => {
  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

  for (let setId = START_ID; setId <= END_ID; setId++) {
    const setUrl = `${BASE_URL}${setId}`;
    await test.step(`Opening set page ${setUrl}`, async () => {
        try {
            await page.goto(setUrl, { waitUntil: 'domcontentloaded' });
      
            const photoLinks = await page.$$eval('div.mosaic-gallery__item a', anchors =>
              anchors.map(a => (a as HTMLAnchorElement).href)
            );
      
            for (let i = 0; i < photoLinks.length; i++) {
                const photoUrl = photoLinks[i];
                await test.step(`Opening photo page ${photoUrl}`, async () =>{

                    await page.goto(photoUrl, { waitUntil: 'domcontentloaded' });
          
                    const imgUrl = await page.$eval('#mainImage', img => (img as HTMLImageElement).src);
                    const filename = `set${setId}_photo${i}.jpg`;
            
                    test.step(`Downloading image to ${filename}`, async () => {
                        await downloadImage(imgUrl, filename);
                    });
                  });
            } 
          } catch (err) {
            console.warn(`Failed to process set ${setId}:`, err);
          }
    });    
  }
});

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const BULLETIN_URL = 'https://bulletin.du.edu/undergraduate/coursedescriptions/comp/';

async function scrapeBulletin() {
  const resultsDir = path.join(__dirname, 'results');
  await fs.ensureDir(resultsDir);

  try {
    const response = await axios.get(BULLETIN_URL, { timeout: 20000 });
    const $ = cheerio.load(response.data);

    const courses = [];

    $('.courseblock').each((_, el) => {
      const titleEl = $(el).find('.courseblocktitle');
      const extraEl = $(el).find('.courseblockextra');

      const titleText = titleEl.text().replace(/\s+/g, ' ').trim();
      if (!titleText) return;

      const codeMatch = titleText.match(/(COMP)\s+(\d{4})/i);
      if (!codeMatch) return;

      const number = parseInt(codeMatch[2], 10);
      if (Number.isNaN(number) || number < 3000) return;

      const hasPrereq =
        extraEl.text().toLowerCase().includes('prerequisite') ||
        titleText.toLowerCase().includes('prerequisite');
      if (hasPrereq) return;

      const courseCode = `${codeMatch[1].toUpperCase()}-${codeMatch[2]}`;
      let title = titleText;
      const dashIndex = titleText.indexOf(' - ');
      if (dashIndex >= 0) {
        title = titleText.slice(dashIndex + 3).trim();
      }

      courses.push({
        course: courseCode,
        title
      });
    });

    const outputPath = path.join(resultsDir, 'bulletin.json');
    await fs.writeJson(outputPath, { courses }, { spaces: 4 });

    console.log(`Saved ${courses.length} courses to ${outputPath}`);
  } catch (err) {
    console.error('Error scraping bulletin:', err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  scrapeBulletin();
}

module.exports = { scrapeBulletin };


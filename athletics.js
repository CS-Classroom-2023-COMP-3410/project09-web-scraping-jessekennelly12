const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const ATHLETICS_URL = 'https://denverpioneers.com/sports/mens-ice-hockey/schedule';

async function scrapeAthletics() {
  const resultsDir = path.join(__dirname, 'results');
  await fs.ensureDir(resultsDir);

  try {
    const response = await axios.get(ATHLETICS_URL, { timeout: 20000 });
    const $ = cheerio.load(response.data);

    const events = [];

    const games = $('.sidearm-schedule-game, .schedule_game').toArray();

    games.forEach((el) => {
      const root = $(el);

      const duTeam = 'Denver';

      const opponentText =
        root.find('.sidearm-schedule-game-opponent-name a, .sidearm-schedule-game-opponent-name')
          .first()
          .text()
          .replace(/\s+/g, ' ')
          .trim();

      const dateText =
        root
          .find(
            '.sidearm-schedule-game-opponent-date, .sidearm-schedule-game-date, .date, .sidearm-schedule-game-start-time'
          )
          .first()
          .text()
          .replace(/\s+/g, ' ')
          .trim();

      if (!opponentText && !dateText) return;

      events.push({
        duTeam,
        opponent: opponentText || '',
        date: dateText || ''
      });
    });

    const outputPath = path.join(resultsDir, 'athletic_events.json');
    await fs.writeJson(outputPath, { events }, { spaces: 4 });

    console.log(`Saved ${events.length} events to ${outputPath}`);
  } catch (err) {
    console.error('Error scraping athletics site:', err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  scrapeAthletics();
}

module.exports = { scrapeAthletics };


const { scrapeBulletin } = require('./bulletin');
const { scrapeAthletics } = require('./athletics');
const { scrapeCalendar } = require('./calendar');

async function main() {
  await scrapeBulletin();
  await scrapeAthletics();
  await scrapeCalendar();
}

main().catch((err) => {
  console.error('Unexpected error running all scrapers:', err);
  process.exitCode = 1;
});


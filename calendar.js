const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const BASE_URL = 'https://www.du.edu';
const CALENDAR_URL = `${BASE_URL}/calendar`;

function normalize(text) {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function monthRange(year, monthIndex) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  const toYMD = (d) => d.toISOString().slice(0, 10);

  return {
    start: toYMD(start),
    end: toYMD(end)
  };
}

function buildMonthUrl(year, monthIndex) {
  const { start, end } = monthRange(year, monthIndex);
  return `${CALENDAR_URL}?start_date=${start}&end_date=${end}&search=`;
}

function parseListingText(text) {
  const cleaned = normalize(text);

  
  const m = cleaned.match(
    /^([A-Za-z]+ \d{1,2})\s+(.+?)(?:\s+(\d{1,2}:\d{2}(?:am|pm)\s*-\s*\d{1,2}:\d{2}(?:am|pm)))?(?:\s+.*)?\s+View Details$/i
  );

  if (!m) return null;

  return {
    date: m[1],
    title: normalize(m[2]),
    time: m[3] ? normalize(m[3]) : undefined
  };
}

async function fetchEventDescription(url) {
  try {
    const res = await axios.get(url, { timeout: 20000 });
    const $ = cheerio.load(res.data);

    // Try common content containers first.
    const candidates = [
      $('.page-content p').map((_, el) => normalize($(el).text())).get(),
      $('main p').map((_, el) => normalize($(el).text())).get(),
      $('.content p').map((_, el) => normalize($(el).text())).get()
    ].flat();

    const description = candidates.find((p) => {
      if (!p) return false;
      if (p.length < 25) return false;
      if (/request info|apply to du|visit du|privacy policy|copyright/i.test(p)) return false;
      return true;
    });

    return description || undefined;
  } catch {
    return undefined;
  }
}

async function scrapeCalendar() {
  const resultsDir = path.join(__dirname, 'results');
  await fs.ensureDir(resultsDir);

  try {
    const events = [];
    const seen = new Set();

    for (let month = 0; month < 12; month++) {
      const url = buildMonthUrl(2025, month);
      const response = await axios.get(url, { timeout: 20000 });
      const $ = cheerio.load(response.data);

      const links = $('a[href*="/events/"]').toArray();

      for (const el of links) {
        const a = $(el);
        const href = a.attr('href');
        const text = normalize(a.text());

        if (!href || !/View Details$/i.test(text)) continue;

        const parsed = parseListingText(text);
        if (!parsed) continue;

        const fullUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).toString();
        const key = `${parsed.date}::${parsed.title}::${fullUrl}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const event = {
          title: parsed.title,
          date: parsed.date
        };

        if (parsed.time) {
          event.time = parsed.time;
        }

        const description = await fetchEventDescription(fullUrl);
        if (description) {
          event.description = description;
        }

        events.push(event);
      }
    }

    const outputPath = path.join(resultsDir, 'calendar_events.json');
    await fs.writeJson(outputPath, { events }, { spaces: 4 });

    console.log(`Saved ${events.length} events to ${outputPath}`);
  } catch (err) {
    console.error('Error scraping calendar:', err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  scrapeCalendar();
}

module.exports = { scrapeCalendar };
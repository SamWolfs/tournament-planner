const fs = require('fs');
const path = require('path');
const { normalizeCity } = require('./locationConfig');
const { loadYaml } = require('./utils');

function transformEvent(event) {
  return {
    id: event.eventId,
    name: event.eventName,
    url: event.eventUrl,
    club: event.club,
    city: event.city,
    start: event.startDate,
    end: event.endDate,
    series: event.series ? event.series.map((s) => s.name) : [],
    // Include FTM series names for filtering
    ftmSeries: event.series
      ? event.series.filter((s) => s.signupType === 'FTM').map((s) => s.name)
      : [],
  };
}

/**
 * Group events by their city/location
 * Normalizes city names using locationConfig before grouping.
 * Events with locations that normalize to null are skipped.
 *
 * @param {Array} events - array of events
 * @returns {{grouped: Object, skipped: number}} - object with location as key and array of events as value, plus count of skipped events
 */
function groupEventsByLocation(events) {
  const grouped = {};
  let skipped = 0;

  for (const event of events) {
    const originalCity = event.city || 'Unknown';
    const normalizedCity = normalizeCity(originalCity);

    if (normalizedCity === null) {
      skipped++;
      continue;
    }

    if (!grouped[normalizedCity]) {
      grouped[normalizedCity] = [];
    }

    const transformed = transformEvent(event);
    transformed.city = normalizedCity;
    grouped[normalizedCity].push(transformed);
  }

  return { grouped, skipped };
}

function sanitizeFilename(name) {
  return name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_');
}

/**
 * Save grouped events to JSON files by location
 * @param {Object} groupedEvents - events grouped by location
 * @param {string} outputDir - directory to write files to
 */
function saveToJsonFiles(groupedEvents, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const locations = Object.keys(groupedEvents);
  console.log(`Writing ${locations.length} location files to ${outputDir}...`);

  for (const location of locations) {
    const events = groupedEvents[location];
    const filename = `${sanitizeFilename(location)}.json`;
    const filepath = path.join(outputDir, filename);

    const jsonContent = JSON.stringify(events, null, 2);
    fs.writeFileSync(filepath, jsonContent, 'utf8');

    console.log(`  ${filename}: ${events.length} events`);
  }

  console.log(`Done! Wrote ${locations.length} files.`);
}

function aggregateByLocation(
  inputPath = path.join(__dirname, '..', 'data', 'events.yaml'),
  outputDir = path.join(__dirname, '..', 'data', 'locations')
) {
  console.log(`Loading events from ${inputPath}...`);
  const data = loadYaml(inputPath);

  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid events data: expected an array of events');
  }

  console.log(`Loaded ${data.events.length} events.`);

  const { grouped: groupedEvents, skipped } = groupEventsByLocation(data.events);

  if (skipped > 0) {
    console.log(`Skipped ${skipped} events with filtered locations.`);
  }

  saveToJsonFiles(groupedEvents, outputDir);

  return groupedEvents;
}

// Run if called directly
if (require.main === module) {
  try {
    aggregateByLocation();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  transformEvent,
  groupEventsByLocation,
  sanitizeFilename,
  saveToJsonFiles,
  aggregateByLocation,
};

const fs = require('fs');
const path = require('path');
const { loadYaml } = require('./utils');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WEB_DIR = path.join(__dirname, '..', 'web');
const WEB_DATA_DIR = path.join(WEB_DIR, 'data');

function extractUniqueCategories(series) {
  const categoriesSet = new Set();
  series.forEach((s) => {
    if (s.category) {
      categoriesSet.add(s.category);
    }
  });
  return [...categoriesSet].sort();
}

function extractUniqueRankings(series) {
  const rankingsSet = new Set();
  series.forEach((s) => {
    if (s.ranking) {
      rankingsSet.add(s.ranking);
    }
  });
  return [...rankingsSet].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10);
    const numB = parseInt(b.replace(/\D/g, ''), 10);
    return numA - numB;
  });
}

function buildLocationsData(locationsYaml) {
  const locations = {};
  for (const [name, coords] of Object.entries(locationsYaml.locations)) {
    locations[name] = {
      lat: coords.lat,
      lon: coords.lon,
    };
  }
  return locations;
}

function buildWebData() {
  console.log('Building web data files...');

  if (!fs.existsSync(WEB_DIR)) {
    fs.mkdirSync(WEB_DIR, { recursive: true });
  }
  if (!fs.existsSync(WEB_DATA_DIR)) {
    fs.mkdirSync(WEB_DATA_DIR, { recursive: true });
  }

  const eventsData = loadYaml(path.join(DATA_DIR, 'events.yaml'));
  const locationsData = loadYaml(path.join(DATA_DIR, 'locations.yaml'));

  const series = eventsData.series || [];
  const categories = extractUniqueCategories(series);
  const rankings = extractUniqueRankings(series);

  const locations = buildLocationsData(locationsData);

  const config = {
    locations,
    categories,
    rankings,
  };

  fs.writeFileSync(path.join(WEB_DATA_DIR, 'config.json'), JSON.stringify(config, null, 2));
  console.log(`  config.json:`);
  console.log(`    - ${Object.keys(locations).length} locations`);
  console.log(`    - ${categories.length} categories`);
  console.log(`    - ${rankings.length} rankings`);

  const locationsDir = path.join(DATA_DIR, 'locations');
  const files = fs.readdirSync(locationsDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      fs.copyFileSync(path.join(locationsDir, file), path.join(WEB_DATA_DIR, file));
    }
  }
  console.log(`  Copied ${files.length} event files`);

  console.log('Done!');
}

if (require.main === module) {
  buildWebData();
}

module.exports = {
  buildWebData,
  extractUniqueCategories,
  extractUniqueRankings,
  buildLocationsData,
};

const fs = require('fs');
const path = require('path');
const { delay, loadYaml, saveToYaml } = require('./utils');

/**
 * Geocode a city name using Nominatim (OpenStreetMap)
 * @param {string} city - city name
 * @param {string} country - country code (default: Denmark)
 * @returns {Promise<{lat: number, lon: number}|null>}
 */
async function geocodeCity(city, country = 'Denmark') {
  const query = encodeURIComponent(`${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PadelTournamentPlanner/1.0 (https://github.com/SamWolfs/tournament-planner)',
      },
    });

    if (!response.ok) {
      console.error(`  HTTP error for ${city}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error(`  Error geocoding ${city}: ${error.message}`);
    return null;
  }
}

function loadExistingLocations(inputPath) {
  try {
    if (fs.existsSync(inputPath)) {
      return loadYaml(inputPath);
    }
  } catch {
    console.log('No existing locations file found, starting fresh.');
  }
  return {};
}

function extractUniqueCities(events) {
  const cities = new Set();
  for (const event of events) {
    if (event.city) {
      cities.add(event.city);
    }
  }
  return Array.from(cities).sort();
}

/**
 * Main function to fetch locations for all cities
 * @param {string} eventsPath - path to events.yaml
 * @param {string} locationsPath - path to output locations.yaml
 */
async function main(
  eventsPath = path.join(__dirname, '..', 'data', 'events.yaml'),
  locationsPath = path.join(__dirname, '..', 'data', 'locations.yaml')
) {
  try {
    console.log('Loading events...');
    const eventsData = loadYaml(eventsPath);
    const cities = extractUniqueCities(eventsData.events);
    console.log(`Found ${cities.length} unique cities.\n`);

    const existingData = loadExistingLocations(locationsPath);
    const existingLocations = existingData.locations || {};

    const locations = { ...existingLocations };
    let newCount = 0;
    let failedCount = 0;
    const failed = [];

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];

      if (locations[city]) {
        console.log(`[${i + 1}/${cities.length}] ${city} - already cached`);
        continue;
      }

      console.log(`[${i + 1}/${cities.length}] Geocoding ${city}...`);

      const result = await geocodeCity(city);

      if (result) {
        locations[city] = {
          lat: result.lat,
          lon: result.lon,
        };
        console.log(`  → ${result.lat}, ${result.lon}`);
        newCount++;
      } else {
        console.log(`  → Failed to geocode`);
        failed.push(city);
        failedCount++;
      }

      // Rate limit: 1 request per second (Nominatim policy)
      if (i < cities.length - 1) {
        await delay(1100);
      }
    }

    const outputData = {
      generatedAt: new Date().toISOString(),
      totalCities: Object.keys(locations).length,
      locations,
    };

    saveToYaml(outputData, locationsPath);

    console.log('\n=== Summary ===');
    console.log(`Total cities: ${cities.length}`);
    console.log(`Already cached: ${cities.length - newCount - failedCount}`);
    console.log(`Newly geocoded: ${newCount}`);
    console.log(`Failed: ${failedCount}`);

    if (failed.length > 0) {
      console.log('\nFailed cities:');
      for (const city of failed) {
        console.log(`  - ${city}`);
      }
    }

    return outputData;
  } catch (error) {
    console.error('Error fetching locations:', error.message);
    throw error;
  }
}

if (require.main === module) {
  main().catch((_error) => {
    process.exit(1);
  });
}

module.exports = {
  geocodeCity,
  loadExistingLocations,
  extractUniqueCities,
  main,
};

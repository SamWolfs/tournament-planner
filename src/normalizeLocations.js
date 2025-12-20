const path = require('path');
const { normalizeCity, getCanonicalMappings, getFilteredLocations } = require('./locationConfig');
const { saveToYaml, loadYaml } = require('./utils');

function normalizeLocationsData(locationsData) {
  const originalLocations = locationsData.locations || {};
  const normalizedLocations = {};
  const mergedFrom = {};

  for (const [originalName, coords] of Object.entries(originalLocations)) {
    const canonicalName = normalizeCity(originalName);

    if (canonicalName === null) {
      console.log(`  Filtering out: ${originalName}`);
      continue;
    }

    if (originalName !== canonicalName) {
      if (!mergedFrom[canonicalName]) {
        mergedFrom[canonicalName] = [];
      }
      mergedFrom[canonicalName].push(originalName);
    }

    if (!normalizedLocations[canonicalName]) {
      normalizedLocations[canonicalName] = coords;
    }
  }

  const sortedLocations = {};
  for (const key of Object.keys(normalizedLocations).sort((a, b) => a.localeCompare(b, 'da'))) {
    sortedLocations[key] = normalizedLocations[key];
  }

  return {
    normalizedLocations: sortedLocations,
    mergedFrom,
  };
}

function main(
  inputPath = path.join(__dirname, '..', 'data', 'locations.yaml'),
  outputPath = path.join(__dirname, '..', 'data', 'locations.yaml')
) {
  console.log('=== Location Normalization ===\n');

  const filteredLocations = getFilteredLocations();

  console.log('\nFiltered out locations:');
  for (const loc of filteredLocations) {
    console.log(`  ${loc}`);
  }

  console.log('\n---\n');

  console.log(`Loading locations from ${inputPath}...`);
  const locationsData = loadYaml(inputPath);
  const originalCount = Object.keys(locationsData.locations || {}).length;

  console.log(`Found ${originalCount} locations.\n`);

  console.log('Normalizing...');
  const { normalizedLocations, mergedFrom } = normalizeLocationsData(locationsData);
  const normalizedCount = Object.keys(normalizedLocations).length;

  if (Object.keys(mergedFrom).length > 0) {
    console.log('\nMerged locations:');
    for (const [canonical, aliases] of Object.entries(mergedFrom)) {
      console.log(`  ${canonical} ← ${aliases.join(', ')}`);
    }
  }

  const outputData = {
    generatedAt: new Date().toISOString(),
    totalCities: normalizedCount,
    locations: normalizedLocations,
  };

  console.log('');
  saveToYaml(outputData, outputPath);

  console.log('\n=== Summary ===');
  console.log(`Original locations: ${originalCount}`);
  console.log(`Normalized locations: ${normalizedCount}`);
  console.log(`Removed/merged: ${originalCount - normalizedCount}`);

  return outputData;
}

// Run if called directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  normalizeLocationsData,
  main,
};

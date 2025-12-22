const path = require('path');
const { saveToYaml, loadYaml } = require('./utils');

const DPF_LEVELS = ['10', '25', '35', '50', '60', '100', '200', '500', '1000', '2000'];

const GENDER_PATTERNS = [
  { pattern: /\b(herrer|herre)\b/i, normalized: 'Herrer' },
  { pattern: /\b(damer|dame|dames|damespeed|kvinder|kvinde)\b/i, normalized: 'Damer' },
  { pattern: /\bmix\b/i, normalized: 'Mix' },
  { pattern: /\bdrenge\b/i, normalized: 'Drenge' },
  { pattern: /\bpiger\b/i, normalized: 'Piger' },
];

const CONCATENATED_GENDER_LEVEL_PATTERN = /\b(herrer?|damer?|kvinder?|mix)(\d+)\b/gi;
const YOUTH_AGE_PATTERN = /\bU(12|14|16|18)\b/i;
const DPF_PATTERN = /\bDPF\s*(\d+(?:[/-]\d+)*)/gi;
const DASH_LEVELS_PATTERN = /\((\d+(?:-\d+)+)\)/gi;
const STANDALONE_LEVEL_PATTERN = /\b(10|25|35|50|60|100|200|500|1000|2000)\b/g;
const WAITING_LIST_PATTERNS = [/venteliste/i, /waiting\s*list/i];

function isWaitingList(name) {
  return WAITING_LIST_PATTERNS.some((pattern) => pattern.test(name));
}

function extractGender(name) {
  for (const { pattern, normalized } of GENDER_PATTERNS) {
    if (pattern.test(name)) {
      return normalized;
    }
  }
  return null;
}

function extractYouthAge(name) {
  const match = name.match(YOUTH_AGE_PATTERN);
  if (match) {
    return `U${match[1]}`;
  }
  return null;
}

/**
 * Extract all DPF levels from a class name
 * @param {string} name - the class name
 * @returns {string[]} - array of DPF levels (e.g., ["DPF50", "DPF35"]) or empty array if not found
 */
function extractDpfLevels(name) {
  const levels = [];
  // Reset regex lastIndex
  DPF_PATTERN.lastIndex = 0;

  let match;
  while ((match = DPF_PATTERN.exec(name)) !== null) {
    // match[1] could be "50" or "100/60" or "25/35/50" or "100-60"
    const levelNumbers = match[1].split(/[/-]/);
    for (const num of levelNumbers) {
      if (DPF_LEVELS.includes(num)) {
        levels.push(`DPF${num}`);
      }
    }
  }

  return levels;
}

/**
 * Extract dash-separated levels from parentheses (e.g., "(200-100)")
 * @param {string} name - the class name
 * @returns {string[]} - array of DPF levels or empty array
 */
function extractDashLevels(name) {
  const levels = [];
  // Reset regex lastIndex
  DASH_LEVELS_PATTERN.lastIndex = 0;

  let match;
  while ((match = DASH_LEVELS_PATTERN.exec(name)) !== null) {
    const levelNumbers = match[1].split('-');
    for (const num of levelNumbers) {
      if (DPF_LEVELS.includes(num)) {
        levels.push(`DPF${num}`);
      }
    }
  }

  return levels;
}

/**
 * Extract concatenated gender+level (e.g., Herre50, Dame35)
 * @param {string} name - the class name
 * @returns {{gender: string, levels: string[]}|null} - extracted gender and levels or null
 */
function extractConcatenatedGenderLevel(name) {
  CONCATENATED_GENDER_LEVEL_PATTERN.lastIndex = 0;
  const match = CONCATENATED_GENDER_LEVEL_PATTERN.exec(name);

  if (match) {
    const genderPart = match[1].toLowerCase();
    const level = match[2];

    let normalizedGender = null;
    if (genderPart.startsWith('herre')) {
      normalizedGender = 'Herrer';
    } else if (genderPart.startsWith('dame') || genderPart.startsWith('kvinde')) {
      normalizedGender = 'Damer';
    } else if (genderPart === 'mix') {
      normalizedGender = 'Mix';
    }

    if (normalizedGender && DPF_LEVELS.includes(level)) {
      return { gender: normalizedGender, levels: [`DPF${level}`] };
    }
  }

  return null;
}

/**
 * Extract the first DPF level from a class name (for backward compatibility)
 * Falls back to standalone levels if no explicit DPF pattern found
 * @param {string} name - the class name
 * @returns {string|null} - normalized DPF level (e.g., "DPF50") or null if not found
 */
function extractDpfLevel(name) {
  const levels = extractDpfLevels(name);
  if (levels.length > 0) {
    return levels[0];
  }
  // Fallback to standalone levels
  const standaloneLevels = extractStandaloneLevels(name);
  return standaloneLevels.length > 0 ? standaloneLevels[0] : null;
}

/**
 * Extract standalone level numbers (without DPF prefix) from a class name
 * Only used when no DPF levels are found
 * @param {string} name - the class name
 * @returns {string[]} - array of DPF levels (e.g., ["DPF100", "DPF60"]) or empty array
 */
function extractStandaloneLevels(name) {
  // First check if there are any DPF levels - if so, don't extract standalone
  const dpfLevels = extractDpfLevels(name);
  if (dpfLevels.length > 0) {
    return [];
  }

  const levels = [];
  let match;
  // Reset regex lastIndex
  STANDALONE_LEVEL_PATTERN.lastIndex = 0;

  while ((match = STANDALONE_LEVEL_PATTERN.exec(name)) !== null) {
    levels.push(`DPF${match[1]}`);
  }

  // Only return if we found exactly one standalone level (to avoid false positives)
  // Multiple numbers might be dates or other things
  return levels.length === 1 ? levels : [];
}

/**
 * Normalize a class name to a standard format
 * @param {string} name - the original class name
 * @returns {{isWaitingList: boolean, series: Array<{name: string, level: string, gender: string}>}}
 */
function normalizeClassName(name) {
  const waitingList = isWaitingList(name);

  if (waitingList) {
    return { isWaitingList: true, series: [] };
  }

  let gender = extractGender(name);
  const youthAge = extractYouthAge(name);

  // Try multiple level extraction methods in order of specificity
  let allLevels = extractDpfLevels(name);

  // Try concatenated gender+level pattern (e.g., Herre50, Dame35)
  if (allLevels.length === 0) {
    const concatenated = extractConcatenatedGenderLevel(name);
    if (concatenated) {
      gender = gender || concatenated.gender;
      allLevels = concatenated.levels;
    }
  }

  // Try dash-separated levels in parentheses (e.g., "(200-100)")
  if (allLevels.length === 0) {
    allLevels = extractDashLevels(name);
  }

  // Try standalone levels (e.g., "HERRE 100")
  if (allLevels.length === 0) {
    allLevels = extractStandaloneLevels(name);
  }

  // If we have levels but no gender, default to Herrer
  if (allLevels.length > 0 && !gender) {
    gender = 'Herrer';
  }

  const series = [];

  if (gender) {
    // Build the category field (gender + optional youth age)
    const categoryField = youthAge ? `${gender} ${youthAge}` : gender;

    if (allLevels.length > 0) {
      // Create a series entry for each level
      for (const level of allLevels) {
        series.push({
          name: `${categoryField} ${level}`,
          ranking: level,
          category: categoryField,
        });
      }
    } else if (youthAge) {
      // Youth division without explicit DPF level
      series.push({
        name: categoryField,
        ranking: null,
        category: categoryField,
      });
    }
  }

  return {
    isWaitingList: false,
    series,
  };
}

/**
 * Normalize a single class object
 * @param {Object} classObj - class object with id, name, and optional playerCount
 * @returns {{class: {id: number, name: string}|null, series: Array, isUnknown: boolean}} - class info and series with playerCount
 */
function normalizeClass(classObj) {
  const { isWaitingList, series } = normalizeClassName(classObj.name);

  // Filter out waiting list entries
  if (isWaitingList) {
    return { class: null, series: [], isUnknown: false };
  }

  // Add playerCount to each series entry (will be aggregated at event level)
  const seriesWithPlayerCount = series.map((s) => ({
    ...s,
    playerCount: classObj.playerCount ?? null,
  }));

  return {
    class: { id: classObj.id, name: classObj.name, playerCount: classObj.playerCount },
    series: seriesWithPlayerCount,
    isUnknown: series.length === 0,
  };
}

/**
 * Sort series by category (alphabetically) then by ranking (numerically, lowest to highest)
 * @param {Array} series - array of series objects
 * @returns {Array} - sorted series array
 */
function sortSeries(series) {
  return series.sort((a, b) => {
    // First sort by category
    const catCompare = (a.category || '').localeCompare(b.category || '', 'da');
    if (catCompare !== 0) {
      return catCompare;
    }

    // Then by ranking (numeric, lowest to highest)
    const rankA = a.ranking ? parseInt(a.ranking.replace(/\D/g, ''), 10) : 0;
    const rankB = b.ranking ? parseInt(b.ranking.replace(/\D/g, ''), 10) : 0;
    return rankA - rankB;
  });
}

/**
 * Normalize all classes in an event
 * Aggregates series at the event level and tracks unknown series
 * Aggregates playerCount across all classes that map to the same series
 * @param {Object} event - event object with classes array
 * @returns {Object} - event with series and unknownSeries at top level
 */
function normalizeEventClasses(event) {
  if (!event.classes || !Array.isArray(event.classes)) {
    return {
      ...event,
      classes: [],
      series: [],
      unknownSeries: [],
    };
  }

  const cleanedClasses = [];
  const seriesSet = new Map(); // Use Map to deduplicate by name and aggregate playerCount
  const unknownSeries = [];

  for (const classObj of event.classes) {
    const result = normalizeClass(classObj);

    if (result.class === null) {
      // Waiting list - skip entirely
      continue;
    }

    // Keep id, name, and playerCount in classes
    cleanedClasses.push(result.class);

    if (result.isUnknown) {
      // Could not normalize - add to unknownSeries
      unknownSeries.push(result.class.name);
    } else {
      // Add each series entry (deduplicated by name, aggregate playerCount)
      for (const s of result.series) {
        if (!seriesSet.has(s.name)) {
          // First occurrence - store the series with its playerCount
          seriesSet.set(s.name, { ...s });
        } else {
          // Already exists - aggregate playerCount
          const existing = seriesSet.get(s.name);
          if (s.playerCount !== null && s.playerCount !== undefined) {
            if (existing.playerCount === null || existing.playerCount === undefined) {
              existing.playerCount = s.playerCount;
            } else {
              existing.playerCount += s.playerCount;
            }
          }
        }
      }
    }
  }

  return {
    ...event,
    classes: cleanedClasses,
    series: sortSeries(Array.from(seriesSet.values())),
    unknownSeries,
  };
}

/**
 * Normalize classes for all events
 * @param {Array} events - array of events
 * @returns {Array} - events with normalized classes
 */
function normalizeAllEvents(events) {
  return events.map(normalizeEventClasses);
}

/**
 * Get statistics about the normalization
 * @param {Array} events - normalized events
 * @returns {Object} - statistics
 */
function getStatistics(events) {
  const stats = {
    totalEvents: events.length,
    totalClasses: 0,
    totalSeries: 0,
    totalUnknownSeries: 0,
    totalPlayerCount: 0,
    byCategory: {},
    byCategoryPlayerCount: {},
    byRanking: {},
    byRankingPlayerCount: {},
    bySeriesName: {},
    bySeriesNamePlayerCount: {},
    unknownSeriesNames: [],
  };

  for (const event of events) {
    stats.totalClasses += (event.classes || []).length;

    // Count series and aggregate player counts
    for (const s of event.series || []) {
      stats.totalSeries++;
      stats.bySeriesName[s.name] = (stats.bySeriesName[s.name] || 0) + 1;

      const playerCount = s.playerCount || 0;
      stats.totalPlayerCount += playerCount;
      stats.bySeriesNamePlayerCount[s.name] =
        (stats.bySeriesNamePlayerCount[s.name] || 0) + playerCount;

      if (s.category) {
        stats.byCategory[s.category] = (stats.byCategory[s.category] || 0) + 1;
        stats.byCategoryPlayerCount[s.category] =
          (stats.byCategoryPlayerCount[s.category] || 0) + playerCount;
      }

      if (s.ranking) {
        stats.byRanking[s.ranking] = (stats.byRanking[s.ranking] || 0) + 1;
        stats.byRankingPlayerCount[s.ranking] =
          (stats.byRankingPlayerCount[s.ranking] || 0) + playerCount;
      }
    }

    // Count unknown series
    for (const name of event.unknownSeries || []) {
      stats.totalUnknownSeries++;
      if (!stats.unknownSeriesNames.includes(name)) {
        stats.unknownSeriesNames.push(name);
      }
    }
  }

  return stats;
}

/**
 * Collect all unique series from normalized events
 * Aggregates playerCount across all events for each series
 * @param {Array} events - normalized events
 * @returns {Array} - array of unique series objects with aggregated playerCount, sorted by category then ranking
 */
function collectUniqueSeries(events) {
  const seriesMap = new Map();

  for (const event of events) {
    for (const s of event.series || []) {
      if (!seriesMap.has(s.name)) {
        seriesMap.set(s.name, {
          name: s.name,
          ranking: s.ranking,
          category: s.category,
          playerCount: s.playerCount ?? null,
        });
      } else {
        // Aggregate playerCount across events
        const existing = seriesMap.get(s.name);
        if (s.playerCount !== null && s.playerCount !== undefined) {
          if (existing.playerCount === null || existing.playerCount === undefined) {
            existing.playerCount = s.playerCount;
          } else {
            existing.playerCount += s.playerCount;
          }
        }
      }
    }
  }

  return sortSeries(Array.from(seriesMap.values()));
}

/**
 * Main function to normalize classes in events
 * @param {string} inputPath - path to input YAML file
 * @param {string} outputPath - path to output YAML file
 */
async function main(
  inputPath = path.join(__dirname, '..', 'data', 'events.yaml'),
  outputPath = path.join(__dirname, '..', 'data', 'events.yaml')
) {
  try {
    console.log(`Loading events from ${inputPath}...`);
    const data = loadYaml(inputPath);

    console.log(`Normalizing classes for ${data.events.length} events...`);
    const normalizedEvents = normalizeAllEvents(data.events);

    const stats = getStatistics(normalizedEvents);
    console.log('\n=== Normalization Statistics ===');
    console.log(`Total events: ${stats.totalEvents}`);
    console.log(`Total classes: ${stats.totalClasses}`);
    console.log(`Total series (unique per event): ${stats.totalSeries}`);
    console.log(`Total players: ${stats.totalPlayerCount}`);
    console.log(`Unknown series entries: ${stats.totalUnknownSeries}`);

    console.log('\nBy Category (events / players):');
    for (const [category, count] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])) {
      const playerCount = stats.byCategoryPlayerCount[category] || 0;
      console.log(`  ${category}: ${count} events / ${playerCount} players`);
    }

    console.log('\nBy Ranking (events / players):');
    for (const [ranking, count] of Object.entries(stats.byRanking).sort((a, b) => {
      const numA = parseInt(a[0].replace('DPF', ''));
      const numB = parseInt(b[0].replace('DPF', ''));
      return numA - numB;
    })) {
      const playerCount = stats.byRankingPlayerCount[ranking] || 0;
      console.log(`  ${ranking}: ${count} events / ${playerCount} players`);
    }

    console.log('\nBy Series Name (top 20 by events / players):');
    const sortedNames = Object.entries(stats.bySeriesName).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sortedNames.slice(0, 20)) {
      const playerCount = stats.bySeriesNamePlayerCount[name] || 0;
      console.log(`  ${name}: ${count} events / ${playerCount} players`);
    }

    if (stats.unknownSeriesNames.length > 0) {
      console.log(`\nUnknown series (${stats.unknownSeriesNames.length} unique):`);
      for (const name of stats.unknownSeriesNames.slice(0, 30)) {
        console.log(`  - ${name}`);
      }
      if (stats.unknownSeriesNames.length > 30) {
        console.log(`  ... and ${stats.unknownSeriesNames.length - 30} more`);
      }
    }

    // Collect all unique series for top-level field
    const uniqueSeries = collectUniqueSeries(normalizedEvents);
    console.log(`\nTotal unique series: ${uniqueSeries.length}`);

    const normalizedData = {
      ...data,
      series: uniqueSeries,
      events: normalizedEvents,
      normalizedAt: new Date().toISOString(),
    };

    saveToYaml(normalizedData, outputPath);
    return normalizedData;
  } catch (error) {
    console.error('Error normalizing classes:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((_error) => {
    process.exit(1);
  });
}

module.exports = {
  GENDER_PATTERNS,
  DPF_PATTERN,
  DASH_LEVELS_PATTERN,
  CONCATENATED_GENDER_LEVEL_PATTERN,
  YOUTH_AGE_PATTERN,
  STANDALONE_LEVEL_PATTERN,
  WAITING_LIST_PATTERNS,
  isWaitingList,
  extractGender,
  extractYouthAge,
  extractDpfLevel,
  extractDpfLevels,
  extractDashLevels,
  extractConcatenatedGenderLevel,
  extractStandaloneLevels,
  normalizeClassName,
  normalizeClass,
  normalizeEventClasses,
  normalizeAllEvents,
  sortSeries,
  collectUniqueSeries,
  getStatistics,
  main,
};

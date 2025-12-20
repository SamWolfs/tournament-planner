const path = require('path');
const { loadYaml, saveToYaml } = require('./utils');

const CONFIG = {
  baseUrl: 'https://api.rankedin.com/v1/Organization/GetOrganisationEventsAsync',
  eventInfoUrl: 'https://api.rankedin.com/v1/tournament/GetInfoAsync',
  classPlayersUrl: 'https://api.rankedin.com/v1/tournament/GetPlayersForClassAsync',
  organisationId: 1420,
  isFinished: false,
  language: 'en',
  pageSize: 50,
  rateLimitDelayMs: 500,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(skip, take) {
  const params = new URLSearchParams({
    organisationId: CONFIG.organisationId,
    IsFinished: CONFIG.isFinished,
    Language: CONFIG.language,
    skip: skip,
    take: take,
  });
  return `${CONFIG.baseUrl}?${params.toString()}`;
}

async function fetchPage(skip, take, fetchFn = fetch) {
  const url = buildUrl(skip, take);
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function fetchAllEvents(fetchFn = fetch, delayMs = CONFIG.rateLimitDelayMs) {
  const allEvents = [];
  let skip = 0;
  let totalCount = 0;
  let hasMore = true;

  console.log('Starting to fetch events from RankedIn API...');

  while (hasMore) {
    console.log(`Fetching events ${skip} to ${skip + CONFIG.pageSize}...`);

    const data = await fetchPage(skip, CONFIG.pageSize, fetchFn);

    if (data.payload && data.payload.length > 0) {
      allEvents.push(...data.payload);
      totalCount = data.totalCount;
      skip += CONFIG.pageSize;

      hasMore = allEvents.length < totalCount;

      if (hasMore) {
        await sleep(delayMs);
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allEvents.length} events out of ${totalCount} total.`);

  return {
    events: allEvents,
    totalCount,
    fetchedAt: new Date().toISOString(),
  };
}

function buildEventInfoUrl(eventId) {
  const params = new URLSearchParams({
    id: eventId,
    language: CONFIG.language,
  });
  return `${CONFIG.eventInfoUrl}?${params.toString()}`;
}

async function fetchEventClasses(eventId, fetchFn = fetch) {
  const url = buildEventInfoUrl(eventId);
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} for event ${eventId}`);
  }

  const data = await response.json();
  const classes = data?.TournamentSidebarModel?.Classes || [];

  return classes.map((cls) => ({
    id: cls.Id,
    name: cls.Name,
  }));
}

function buildClassPlayersUrl(eventId, classId) {
  const params = new URLSearchParams({
    tournamentId: eventId,
    tournamentClassId: classId,
    language: CONFIG.language,
  });
  return `${CONFIG.classPlayersUrl}?${params.toString()}`;
}

async function fetchClassPlayerCount(eventId, classId, fetchFn = fetch) {
  const url = buildClassPlayersUrl(eventId, classId);
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} for event ${eventId}, class ${classId}`
    );
  }

  const data = await response.json();

  return Array.isArray(data.Participants) ? data.Participants.length : 0;
}

async function enrichEventsWithParticipantCounts(
  events,
  fetchFn = fetch,
  delayMs = CONFIG.rateLimitDelayMs
) {
  console.log(`Enriching ${events.length} events with participant counts...`);

  const enrichedEvents = [];
  let totalClasses = 0;
  let processedClasses = 0;

  for (const event of events) {
    if (event.classes && Array.isArray(event.classes)) {
      totalClasses += event.classes.length;
    }
  }

  console.log(`Total classes to process: ${totalClasses}`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(
      `[${i + 1}/${events.length}] Processing event ${event.eventId}: ${event.eventName}`
    );

    if (!event.classes || !Array.isArray(event.classes) || event.classes.length === 0) {
      enrichedEvents.push(event);
      continue;
    }

    const enrichedClasses = [];

    for (let j = 0; j < event.classes.length; j++) {
      const cls = event.classes[j];
      processedClasses++;

      try {
        const playerCount = await fetchClassPlayerCount(event.eventId, cls.id, fetchFn);
        enrichedClasses.push({
          ...cls,
          playerCount,
        });
        console.log(
          `  [${processedClasses}/${totalClasses}] Class ${cls.id} (${cls.name}): ${playerCount} players`
        );
      } catch (error) {
        console.error(
          `  [${processedClasses}/${totalClasses}] Error fetching player count for class ${cls.id}: ${error.message}`
        );
        enrichedClasses.push({
          ...cls,
          playerCount: null,
          playerCountError: error.message,
        });
      }

      // Rate limiting - wait before next request (except for last class of last event)
      if (processedClasses < totalClasses) {
        await sleep(delayMs);
      }
    }

    enrichedEvents.push({
      ...event,
      classes: enrichedClasses,
    });
  }

  console.log(`Enriched ${enrichedEvents.length} events with participant counts.`);
  return enrichedEvents;
}

async function enrichEventsWithClasses(events, fetchFn = fetch, delayMs = CONFIG.rateLimitDelayMs) {
  console.log(`Enriching ${events.length} events with class information...`);

  const enrichedEvents = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(
      `[${i + 1}/${events.length}] Fetching classes for event ${event.eventId}: ${event.eventName}`
    );

    try {
      const classes = await fetchEventClasses(event.eventId, fetchFn);
      enrichedEvents.push({
        ...event,
        classes,
      });
    } catch (error) {
      console.error(`  Error fetching classes for event ${event.eventId}: ${error.message}`);
      enrichedEvents.push({
        ...event,
        classes: [],
        classesError: error.message,
      });
    }

    if (i < events.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(`Enriched ${enrichedEvents.length} events with class information.`);
  return enrichedEvents;
}

async function fetchEvents(outputPath = path.join(__dirname, '..', 'data', 'events.yaml')) {
  try {
    const data = await fetchAllEvents();
    saveToYaml(data, outputPath);
    return data;
  } catch (error) {
    console.error('Error fetching events:', error.message);
    throw error;
  }
}

async function enrichEvents(
  inputPath = path.join(__dirname, '..', 'data', 'events.yaml'),
  outputPath = path.join(__dirname, '..', 'data', 'events.yaml')
) {
  try {
    console.log(`Loading events from ${inputPath}...`);
    const data = loadYaml(inputPath);

    const enrichedEvents = await enrichEventsWithClasses(data.events);

    const enrichedData = {
      ...data,
      events: enrichedEvents,
      enrichedAt: new Date().toISOString(),
    };

    saveToYaml(enrichedData, outputPath);
    return enrichedData;
  } catch (error) {
    console.error('Error enriching events:', error.message);
    throw error;
  }
}

async function enrichParticipantCounts(
  inputPath = path.join(__dirname, '..', 'data', 'events.yaml'),
  outputPath = path.join(__dirname, '..', 'data', 'events.yaml')
) {
  try {
    console.log(`Loading events from ${inputPath}...`);
    const data = loadYaml(inputPath);

    const enrichedEvents = await enrichEventsWithParticipantCounts(data.events);

    const enrichedData = {
      ...data,
      events: enrichedEvents,
      participantCountsEnrichedAt: new Date().toISOString(),
    };

    saveToYaml(enrichedData, outputPath);
    return enrichedData;
  } catch (error) {
    console.error('Error enriching participant counts:', error.message);
    throw error;
  }
}

async function main(options = {}) {
  const outputPath = options.outputPath || path.join(__dirname, '..', 'data', 'events.yaml');

  // Always fetch events first
  await fetchEvents(outputPath);

  // Enrich if requested
  if (options.enrich) {
    await enrichEvents(outputPath, outputPath);
  }

  // Enrich with participant counts if requested
  if (options.participants) {
    await enrichParticipantCounts(outputPath, outputPath);
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const enrich = args.includes('--enrich');
  const participants = args.includes('--participants');
  const participantsOnly = args.includes('--participants-only');

  if (participantsOnly) {
    enrichParticipantCounts().catch((_error) => {
      process.exit(1);
    });
  } else {
    main({ enrich, participants }).catch((_error) => {
      process.exit(1);
    });
  }
}

module.exports = {
  CONFIG,
  sleep,
  buildUrl,
  buildEventInfoUrl,
  buildClassPlayersUrl,
  fetchPage,
  fetchAllEvents,
  fetchEventClasses,
  fetchClassPlayerCount,
  enrichEventsWithClasses,
  enrichEventsWithParticipantCounts,
  fetchEvents,
  enrichEvents,
  enrichParticipantCounts,
  main,
};

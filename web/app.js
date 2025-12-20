const STORAGE_KEY = 'padel.okami.town/tournament-planner';

const state = {
  locations: {},
  categories: [],
  rankings: [],
  selectedCategories: new Set(),
  selectedRankings: new Set(),
  hometown: null,
  radius: 50,
  startDate: null,
  endDate: null,
  events: [],
};

const elements = {
  hometown: document.getElementById('hometown'),
  radius: document.getElementById('radius'),
  radiusValue: document.getElementById('radius-value'),
  startDate: document.getElementById('start-date'),
  endDate: document.getElementById('end-date'),
  categoriesContainer: document.getElementById('categories-container'),
  rankingsContainer: document.getElementById('rankings-container'),
  clearCategories: document.getElementById('clear-categories'),
  clearRankings: document.getElementById('clear-rankings'),
  searchBtn: document.getElementById('search-btn'),
  resultsList: document.getElementById('results-list'),
  resultsCount: document.getElementById('results-count'),
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function saveSettings() {
  const settings = {
    hometown: state.hometown,
    radius: state.radius,
    startDate: state.startDate ? formatDate(state.startDate) : null,
    endDate: state.endDate ? formatDate(state.endDate) : null,
    categories: Array.from(state.selectedCategories),
    rankings: Array.from(state.selectedRankings),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Could not save settings to localStorage:', error);
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return false;
    }

    const settings = JSON.parse(saved);

    if (settings.hometown && state.locations[settings.hometown]) {
      state.hometown = settings.hometown;
      elements.hometown.value = settings.hometown;
    }

    if (settings.radius) {
      state.radius = settings.radius;
      elements.radius.value = settings.radius;
      updateRadiusDisplay();
    }

    if (settings.startDate) {
      state.startDate = parseDate(settings.startDate);
      elements.startDate.value = settings.startDate;
    }
    if (settings.endDate) {
      state.endDate = parseDate(settings.endDate);
      elements.endDate.value = settings.endDate;
    }

    if (settings.categories && Array.isArray(settings.categories)) {
      settings.categories.forEach((category) => {
        if (state.categories.includes(category)) {
          state.selectedCategories.add(category);
          const chip = elements.categoriesContainer.querySelector(
            `.chip[data-category="${category}"]`
          );
          if (chip) {
            chip.classList.add('chip--checked');
            chip.querySelector('input').checked = true;
          }
        }
      });
    }

    if (settings.rankings && Array.isArray(settings.rankings)) {
      settings.rankings.forEach((ranking) => {
        if (state.rankings.includes(ranking)) {
          state.selectedRankings.add(ranking);
          const chips = elements.rankingsContainer.querySelectorAll('.chip');
          chips.forEach((chip) => {
            const input = chip.querySelector('input');
            if (input && input.value === ranking) {
              chip.classList.add('chip--checked');
              input.checked = true;
            }
          });
        }
      });
    }

    updateSearchButton();
    return true;
  } catch (error) {
    console.warn('Could not load settings from localStorage:', error);
    return false;
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function getSelectedSeries() {
  const series = new Set();
  for (const category of state.selectedCategories) {
    for (const ranking of state.selectedRankings) {
      series.add(`${category} ${ranking}`);
    }
  }
  return series;
}

async function init() {
  try {
    window.i18n.initLanguageSelector();
    window.i18n.updatePageTranslations();

    const config = await loadJson('data/config.json');

    state.locations = config.locations;
    state.categories = config.categories;
    state.rankings = config.rankings;

    populateHometown(config.locations);
    populateCategories(config.categories);
    populateRankings(config.rankings);
    setDefaultDates();
    updateRadiusDisplay();

    const hasSettings = loadSettings();

    setupEventListeners();

    // Auto-search if settings were loaded and are complete
    if (hasSettings && !elements.searchBtn.disabled) {
      searchTournaments();
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
    showError(window.i18n.t('error.loadFailed'));
  }
}

function populateHometown(locations) {
  const sortedLocations = Object.keys(locations).sort((a, b) => a.localeCompare(b, 'da'));

  sortedLocations.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    elements.hometown.appendChild(option);
  });
}

// TODO: pretty much same functionality as populateRankings?
function populateCategories(categories) {
  elements.categoriesContainer.innerHTML = '';

  categories.forEach((name) => {
    const label = document.createElement('label');
    label.className = 'chip chip--category';
    label.dataset.category = name;

    // TODO: to function
    label.innerHTML = `
      <input type="checkbox" value="${name}" class="chip__input">
      <span class="chip__indicator"></span>
      <span class="chip__name">${name}</span>
    `;

    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.selectedCategories.add(name);
        label.classList.add('chip--checked');
      } else {
        state.selectedCategories.delete(name);
        label.classList.remove('chip--checked');
      }
      updateSearchButton();
    });

    elements.categoriesContainer.appendChild(label);
  });
}

function populateRankings(rankings) {
  elements.rankingsContainer.innerHTML = '';

  rankings.forEach((name) => {
    const label = document.createElement('label');
    label.className = 'chip';

    // TODO: to function
    label.innerHTML = `
      <input type="checkbox" value="${name}" class="chip__input">
      <span class="chip__indicator"></span>
      <span class="chip__name">${name}</span>
    `;

    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.selectedRankings.add(name);
        label.classList.add('chip--checked');
      } else {
        state.selectedRankings.delete(name);
        label.classList.remove('chip--checked');
      }
      updateSearchButton();
    });

    elements.rankingsContainer.appendChild(label);
  });
}

function setDefaultDates() {
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  elements.startDate.value = formatDate(today);
  elements.endDate.value = formatDate(threeMonthsLater);

  state.startDate = today;
  state.endDate = threeMonthsLater;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr) {
  if (!dateStr) {
    return null;
  }
  return new Date(dateStr + 'T00:00:00');
}

function updateRadiusDisplay() {
  elements.radiusValue.textContent = `${state.radius} ${window.i18n.t('filter.km')}`;
}

function setupEventListeners() {
  elements.hometown.addEventListener('change', (e) => {
    state.hometown = e.target.value || null;
    updateSearchButton();
  });

  elements.radius.addEventListener('input', (e) => {
    state.radius = parseInt(e.target.value, 10);
    updateRadiusDisplay();
  });

  elements.startDate.addEventListener('change', (e) => {
    state.startDate = parseDate(e.target.value);
    updateSearchButton();
  });

  elements.endDate.addEventListener('change', (e) => {
    state.endDate = parseDate(e.target.value);
    updateSearchButton();
  });

  elements.clearCategories.addEventListener('click', () => {
    state.selectedCategories.clear();
    elements.categoriesContainer.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.remove('chip--checked');
      chip.querySelector('input').checked = false;
    });
    updateSearchButton();
  });

  elements.clearRankings.addEventListener('click', () => {
    state.selectedRankings.clear();
    elements.rankingsContainer.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.remove('chip--checked');
      chip.querySelector('input').checked = false;
    });
    updateSearchButton();
  });

  elements.searchBtn.addEventListener('click', searchTournaments);
}

function updateSearchButton() {
  const canSearch =
    state.hometown &&
    state.startDate &&
    state.endDate &&
    state.selectedCategories.size > 0 &&
    state.selectedRankings.size > 0;

  elements.searchBtn.disabled = !canSearch;
}

function sanitizeFileName(name) {
  return name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_');
}

async function searchTournaments() {
  if (!state.hometown) {
    return;
  }

  saveSettings();
  showLoading();

  try {
    const homeCoords = state.locations[state.hometown];
    if (!homeCoords) {
      throw new Error('Could not find coordinates for hometown');
    }

    const nearbyLocations = [];
    for (const [name, data] of Object.entries(state.locations)) {
      const distance = haversineDistance(homeCoords.lat, homeCoords.lon, data.lat, data.lon);

      if (distance <= state.radius) {
        nearbyLocations.push({
          name,
          file: `${sanitizeFileName(name)}.json`,
          distance: Math.round(distance),
        });
      }
    }

    const selectedSeries = getSelectedSeries();

    const allEvents = [];
    const fetchPromises = nearbyLocations.map(async (loc) => {
      try {
        const events = await loadJson(`data/${loc.file}`);
        events.forEach((event) => {
          allEvents.push({
            ...event,
            distance: loc.distance,
            locationName: loc.name,
          });
        });
      } catch (error) {
        console.warn(`Could not load events for ${loc.name}:`, error.message);
      }
    });

    await Promise.all(fetchPromises);

    const filteredEvents = allEvents.filter((event) => {
      const eventStart = new Date(event.start);
      if (state.startDate && eventStart < state.startDate) {
        return false;
      }
      if (state.endDate && eventStart > state.endDate) {
        return false;
      }

      if (!event.series || event.series.length === 0) {
        return false;
      }
      const hasMatchingSeries = event.series.some((s) => selectedSeries.has(s));
      if (!hasMatchingSeries) {
        return false;
      }

      return true;
    });

    filteredEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    state.events = filteredEvents;
    renderResults(filteredEvents, selectedSeries);
  } catch (error) {
    console.error('Search failed:', error);
    showError(window.i18n.t('error.searchFailed'));
  }
}

function renderResults(events, selectedSeries) {
  if (events.length === 0) {
    elements.resultsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🤷</div>
        <p class="empty-state__text">${window.i18n.t('empty.noMatches')}</p>
      </div>
    `;
    elements.resultsCount.textContent = window.i18n.t('results.noResults');
    return;
  }

  const countText =
    events.length === 1
      ? `1 ${window.i18n.t('results.tournament')}`
      : `${events.length} ${window.i18n.t('results.tournaments')}`;
  elements.resultsCount.textContent = countText;

  elements.resultsList.innerHTML = events
    .map((event) => renderEventCard(event, selectedSeries))
    .join('');
}

function renderEventCard(event, selectedSeries) {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const dateStr = formatEventDates(startDate, endDate);
  const fullUrl = `https://rankedin.com${event.url}`;

  const seriesTags = event.series
    .map((s) => {
      const isMatched = selectedSeries.has(s);
      return `<span class="tag${isMatched ? ' tag--matched' : ''}">${s}</span>`;
    })
    .join('');

  // TODO: Maybe user real icons?
  return `
    <article class="event">
      <div class="event__header">
        <div>
          <h3 class="event__name">
            <a href="${fullUrl}" target="_blank" rel="noopener">${event.name}</a>
          </h3>
        </div>
        <span class="event__distance">${event.distance} ${window.i18n.t('filter.km')}</span>
      </div>
      <div class="event__meta">
        <span class="event__meta-item">
          <span>📅</span>
          ${dateStr}
        </span>
        <span class="event__meta-item">
          <span>📍</span>
          ${event.city}
        </span>
        <span class="event__meta-item">
          <span>🏢</span>
          ${event.club}
        </span>
      </div>
      <div class="event__series">
        ${seriesTags}
      </div>
    </article>
  `;
}

function formatEventDates(start, end) {
  const locale = window.i18n.getDateLocale();
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString(locale, options);

  if (start.toDateString() === end.toDateString()) {
    return startStr;
  }

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startStr} - ${end.getDate()}`;
  }

  const endStr = end.toLocaleDateString(locale, options);
  return `${startStr} - ${endStr}`;
}

function showLoading() {
  elements.resultsList.innerHTML = `
    <div class="loading">
      <div class="loading__spinner"></div>
    </div>
  `;
  elements.resultsCount.textContent = window.i18n.t('results.searching');
}

function showError(message) {
  elements.resultsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">⚠️</div>
      <p class="empty-state__text">${message}</p>
    </div>
  `;
  elements.resultsCount.textContent = window.i18n.t('results.error');
}

document.addEventListener('DOMContentLoaded', init);

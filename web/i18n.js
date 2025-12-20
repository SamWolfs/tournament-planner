const STORAGE_KEY = 'padel.okami.town/i18n';

const translations = {
  da: {
    // Header
    'logo.text': 'Tournament Planner',
    'header.tagline': 'Find din næste turnering',

    // Filters
    'filter.city': 'By',
    'filter.city.placeholder': 'Vælg din by...',
    'filter.radius': 'Søgeradius',
    'filter.dateRange': 'Datointerval',
    'filter.category': 'Kategori',
    'filter.ranking': 'Rangering',
    'filter.clearAll': 'Ryd alle',
    'filter.km': 'km',

    // Search button
    'button.search': 'Søg turneringer',

    // Results
    'results.title': 'Turneringer',
    'results.selectFilters': 'Vælg filtre for at begynde',
    'results.noResults': 'Ingen resultater',
    'results.searching': 'Søger...',
    'results.error': 'Fejl',
    'results.tournament': 'turnering',
    'results.tournaments': 'turneringer',

    // Empty states
    'empty.instructions':
      'Vælg din by, radius, datoer, kategori og rangering for at finde turneringer i nærheden.',
    'empty.noMatches':
      'Ingen turneringer fundet, der matcher dine kriterier. Prøv at udvide din radius eller datointerval.',

    // Footer
    'footer.dataFrom': 'Data fra',

    // Error messages
    'error.loadFailed': 'Kunne ikke indlæse data. Opdater venligst siden.',
    'error.searchFailed': 'Søgning mislykkedes. Prøv venligst igen.',
  },

  en: {
    // Header
    'logo.text': 'Tournament Planner',
    'header.tagline': 'Find your next tournament',

    // Filters
    'filter.city': 'City',
    'filter.city.placeholder': 'Select your city...',
    'filter.radius': 'Search Radius',
    'filter.dateRange': 'Date Range',
    'filter.category': 'Category',
    'filter.ranking': 'Ranking',
    'filter.clearAll': 'Clear all',
    'filter.km': 'km',

    // Search button
    'button.search': 'Search Tournaments',

    // Results
    'results.title': 'Tournaments',
    'results.selectFilters': 'Select filters to begin',
    'results.noResults': 'No results',
    'results.searching': 'Searching...',
    'results.error': 'Error',
    'results.tournament': 'tournament',
    'results.tournaments': 'tournaments',

    // Empty states
    'empty.instructions':
      'Choose your city, radius, dates, category, and ranking to find tournaments near you.',
    'empty.noMatches':
      'No tournaments found matching your criteria. Try expanding your radius or date range.',

    // Footer
    'footer.dataFrom': 'Data from',

    // Error messages
    'error.loadFailed': 'Failed to load data. Please refresh the page.',
    'error.searchFailed': 'Search failed. Please try again.',
  },

  es: {
    // Header
    'logo.text': 'Tournament Planner',
    'header.tagline': 'Encuentra tu próximo torneo',

    // Filters
    'filter.city': 'Ciudad',
    'filter.city.placeholder': 'Selecciona tu ciudad...',
    'filter.radius': 'Radio de búsqueda',
    'filter.dateRange': 'Rango de fechas',
    'filter.category': 'Categoría',
    'filter.ranking': 'Clasificación',
    'filter.clearAll': 'Borrar todo',
    'filter.km': 'km',

    // Search button
    'button.search': 'Buscar torneos',

    // Results
    'results.title': 'Torneos',
    'results.selectFilters': 'Selecciona filtros para comenzar',
    'results.noResults': 'Sin resultados',
    'results.searching': 'Buscando...',
    'results.error': 'Error',
    'results.tournament': 'torneo',
    'results.tournaments': 'torneos',

    // Empty states
    'empty.instructions':
      'Elige tu ciudad, radio, fechas, categoría y clasificación para encontrar torneos cerca de ti.',
    'empty.noMatches':
      'No se encontraron torneos que coincidan con tus criterios. Intenta ampliar tu radio o rango de fechas.',

    // Footer
    'footer.dataFrom': 'Datos de',

    // Error messages
    'error.loadFailed': 'Error al cargar datos. Por favor, actualiza la página.',
    'error.searchFailed': 'La búsqueda falló. Por favor, inténtalo de nuevo.',
  },
};

const languages = {
  da: { name: 'Dansk', flag: '🇩🇰' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
};

let currentLang = localStorage.getItem(STORAGE_KEY) || 'da';

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {object} params - Optional parameters for interpolation
 * @returns {string} Translated string
 */
function t(key, params = {}) {
  const translation = translations[currentLang]?.[key] || translations['en']?.[key] || key;

  return translation.replace(/\{(\w+)\}/g, (match, param) => {
    return params[param] !== undefined ? params[param] : match;
  });
}

function getCurrentLang() {
  return currentLang;
}

function setLang(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    updatePageTranslations();
    document.documentElement.lang = lang;
  }
}

function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    el.title = t(key);
  });

  document.title = `${t('logo.text')} - ${t('header.tagline')}`;

  const currentFlag = document.getElementById('current-lang-flag');
  if (currentFlag) {
    currentFlag.textContent = languages[currentLang].flag;
  }
}

function initLanguageSelector() {
  const selector = document.getElementById('language-selector');
  if (!selector) {
    return;
  }

  const dropdown = selector.querySelector('.lang-dropdown');
  if (!dropdown) {
    return;
  }

  dropdown.innerHTML = Object.entries(languages)
    .map(
      ([code, { name, flag }]) => `
      <button 
        type="button" 
        class="lang-option${code === currentLang ? ' lang-option--active' : ''}" 
        data-lang="${code}"
      >
        <span class="lang-option__flag">${flag}</span>
        <span class="lang-option__name">${name}</span>
      </button>
    `
    )
    .join('');

  const toggle = selector.querySelector('.lang-toggle');
  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    selector.classList.toggle('lang-selector--open');
  });

  dropdown.addEventListener('click', (e) => {
    const option = e.target.closest('.lang-option');
    if (option) {
      const lang = option.dataset.lang;
      setLang(lang);
      selector.classList.remove('lang-selector--open');

      dropdown.querySelectorAll('.lang-option').forEach((opt) => {
        opt.classList.toggle('lang-option--active', opt.dataset.lang === lang);
      });
    }
  });

  document.addEventListener('click', () => {
    selector.classList.remove('lang-selector--open');
  });
}

/**
 * Get date locale for current language
 * @returns {string} Locale string for Intl.DateTimeFormat
 */
function getDateLocale() {
  const locales = {
    da: 'da-DK',
    en: 'en-GB',
    es: 'es-ES',
  };
  return locales[currentLang] || 'en-GB';
}

window.i18n = {
  t,
  setLang,
  getCurrentLang,
  getDateLocale,
  updatePageTranslations,
  initLanguageSelector,
};

export const LOCATION_ALIASES = {
  Copenhagen: 'København',
  'København S': 'København',
  Aarhus: 'Århus',
  'Århus N': 'Århus',
  'Horsens (Stensballe)': 'Horsens',
  // Generic country-level location (filter out or map to specific city)
  Denmark: null,
};

export function normalizeCity(city) {
  if (!city) {
    return null;
  }

  const normalized = city.trim();

  if (Object.hasOwn(LOCATION_ALIASES, normalized)) {
    return LOCATION_ALIASES[normalized];
  }

  return normalized;
}

export function getFilteredLocations() {
  return Object.entries(LOCATION_ALIASES)
    .filter(([_, canonical]) => canonical === null)
    .map(([alias, _]) => alias);
}

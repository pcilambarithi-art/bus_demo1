/**
 * Nominatim (OpenStreetMap Geocoding Service)
 * Searches places, bus stops, and landmarks in Chennai & Tamil Nadu without API keys
 */

export interface NominatimPlace {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

const geocodeCache = new Map<string, NominatimPlace[]>();

/**
 * Search places via OpenStreetMap Nominatim
 */
export async function searchNominatim(query: string): Promise<NominatimPlace[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const cacheKey = cleanQuery.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Focus search on Chennai / Tamil Nadu, India
  const searchQuery = encodeURIComponent(`${cleanQuery}, Chennai`);
  const url = `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=5&countrycodes=in&viewbox=79.9,13.25,80.35,12.75`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data)) {
      const places: NominatimPlace[] = data.map((item: any) => ({
        id: String(item.place_id || Math.random()),
        name: item.display_name.split(',')[0] || cleanQuery,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type || 'place',
      }));

      geocodeCache.set(cacheKey, places);
      return places;
    }
  } catch (err) {
    console.warn('[Nominatim] Geocoding request failed or timed out:', err);
  }

  return [];
}

/**
 * OSRM (Open Source Routing Machine) Service
 * Calculates actual road geometry, driving distance, and dynamic duration/ETA
 */

export interface OsrmRouteResult {
  coordinates: [number, number][]; // [lat, lng] array for our app
  geoJsonCoordinates: [number, number][]; // [lng, lat] for MapLibre GeoJSON
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
}

// In-memory cache to prevent redundant network calls
const routeCache = new Map<string, OsrmRouteResult>();

/**
 * Fetch driving route between two points using OSRM
 * Coordinates are passed as: [lat1, lng1], [lat2, lng2]
 */
export async function getOsrmRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<OsrmRouteResult | null> {
  const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // OSRM expects coordinates in lng,lat order
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const lngLatCoords: [number, number][] = route.geometry.coordinates; // [lng, lat]
      const latLngCoords: [number, number][] = lngLatCoords.map(([lng, lat]) => [lat, lng]);

      const result: OsrmRouteResult = {
        coordinates: latLngCoords,
        geoJsonCoordinates: lngLatCoords,
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      };

      routeCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[OSRM] Route calculation error, falling back to local calculation:', err);
  }

  return null;
}

/**
 * Calculate multi-stop full route via OSRM
 */
export async function getOsrmMultiStopRoute(
  stops: { lat: number; lng: number }[]
): Promise<OsrmRouteResult | null> {
  if (stops.length < 2) return null;

  // Format: lng1,lat1;lng2,lat2;...
  const coordString = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const lngLatCoords: [number, number][] = route.geometry.coordinates;
      const latLngCoords: [number, number][] = lngLatCoords.map(([lng, lat]) => [lat, lng]);

      return {
        coordinates: latLngCoords,
        geoJsonCoordinates: lngLatCoords,
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      };
    }
  } catch {
    // Ignore network error and fallback
  }

  return null;
}

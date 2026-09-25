// Geodesic and Vector calculations for smooth bus navigation

/**
 * Calculates distance in meters between two lat/lng points using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates compass bearing from start point to destination point in degrees (0 - 360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

/**
 * Interpolates between two coordinate tuples [lat, lng] given progress t (0.0 to 1.0)
 */
export function interpolateCoord(
  start: [number, number],
  end: [number, number],
  t: number
): [number, number] {
  const lat = start[0] + (end[0] - start[0]) * t;
  const lng = start[1] + (end[1] - start[1]) * t;
  return [lat, lng];
}

/**
 * Formats distance nicely (e.g. 2400m -> "2.4 km", 450m -> "450 m")
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Formats ETA nicely (e.g. 6 -> "6 min", 0 -> "Arrived")
 */
export function formatEta(minutes: number): string {
  if (minutes <= 0) return 'Arriving now';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

/**
 * Interpolates angle (bearing) taking wrapping around 360 into account
 */
export function interpolateBearing(fromAngle: number, toAngle: number, t: number): number {
  let diff = (toAngle - fromAngle) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (fromAngle + diff * t + 360) % 360;
}

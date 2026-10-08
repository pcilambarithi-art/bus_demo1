import { getDb, loadDb, saveDb } from '../database/database_service.mjs';

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Bearing from coordinate 1 to coordinate 2 in degrees.
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Formats time as HH:MM AM/PM
 */
export function formatTime(timestamp = Date.now()) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// In-memory runtime state for all buses
// Key: busId or busNumber
const liveBusStates = new Map();

// In-memory event listeners for Server-Sent Events (SSE)
const sseClients = new Set();

// Station notification history log (Station-wise audit records)
const notificationHistory = [];

/**
 * Initialize or get state for a specific bus
 */
function getOrCreateBusState(bus, route) {
  const key = bus.id;
  if (!liveBusStates.has(key)) {
    const stops = route?.stops || [];
    const stationStates = {};

    stops.forEach((stop) => {
      stationStates[stop.id] = {
        stationId: stop.id,
        stationName: stop.name,
        shortName: stop.shortName || stop.name,
        sequence: stop.sequence,
        lat: stop.lat,
        lng: stop.lng,
        approachRadiusMeters: 450,
        arrivalRadiusMeters: 60,
        state: 'IDLE', // 'IDLE' | 'APPROACHING' | 'ARRIVED' | 'WAITING' | 'DEPARTED'
        arrivalTime: null,
        departureTime: null,
        distanceMeters: 0,
        etaMinutes: 0,
        isCurrentStation: false,
        isNextStation: false,
      };
    });

    liveBusStates.set(key, {
      busId: bus.id,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      routeId: bus.routeId,
      driverName: bus.driverName,
      lat: bus.currentLat || (stops[0] ? stops[0].lat : 12.9249),
      lng: bus.currentLng || (stops[0] ? stops[0].lng : 80.1165),
      speedKmh: bus.currentSpeed || 0,
      heading: 0,
      accuracy: 5,
      lastUpdated: bus.lastUpdated ? new Date(bus.lastUpdated).getTime() : Date.now(),
      status: 'LIVE', // 'at_station' | 'moving' | 'destination'
      statusIndicator: 'green', // 'green' | 'red' | 'yellow'
      statusLabel: 'At Station',
      currentStation: stops[0] || null,
      nextStation: stops[1] || stops[0] || null,
      distanceToNextStationMeters: 0,
      etaToNextStationMinutes: 0,
      stationStates,
      completedStopCount: 0,
      lastValidCoord: null,
    });
  }
  return liveBusStates.get(key);
}

/**
 * Ingest live GPS packet from driver phone / GPS tracker
 */
export function ingestDriverGps(payload) {
  loadDb();
  const db = getDb();

  const {
    busId,
    busNumber,
    latitude,
    longitude,
    speed,
    heading,
    accuracy,
    timestamp = Date.now(),
  } = payload;

  const lat = Number(latitude);
  const lng = Number(longitude);
  const spd = Math.max(0, Number(speed || 0));

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid GPS coordinates');
  }

  // Find bus and route in DB
  const bus = db.buses.find(
    (b) =>
      (busId && b.id === busId) ||
      (busNumber && b.busNumber.toLowerCase() === busNumber.toLowerCase()) ||
      b.id === 'bus-07'
  );

  if (!bus) {
    throw new Error(`Bus not found for telemetry update`);
  }

  const route = db.routes.find((r) => r.id === bus.routeId) || db.routes[0];
  const busState = getOrCreateBusState(bus, route);

  // --- Reliability: GPS Jitter & Coordinate Jump Filter ---
  if (busState.lastValidCoord) {
    const jumpDistance = calculateDistanceMeters(
      busState.lastValidCoord.lat,
      busState.lastValidCoord.lng,
      lat,
      lng
    );
    const timeDeltaSec = Math.max(1, (timestamp - busState.lastUpdated) / 1000);
    const impliedSpeedKmh = (jumpDistance / timeDeltaSec) * 3.6;

    // Discard impossible teleportation jumps (>150 km/h in city traffic)
    if (impliedSpeedKmh > 150 && jumpDistance > 500) {
      console.warn(`[GPS Jitter Filter] Ignored abnormal GPS jump for ${bus.busNumber}: ${jumpDistance}m in ${timeDeltaSec}s`);
      return { success: false, reason: 'GPS coordinate jitter rejected', state: busState };
    }
  }

  busState.lastValidCoord = { lat, lng };
  busState.lat = lat;
  busState.lng = lng;
  busState.speedKmh = Math.round(spd);
  if (heading !== undefined) busState.heading = Number(heading);
  if (accuracy !== undefined) busState.accuracy = Math.round(accuracy);
  busState.lastUpdated = timestamp;

  // Persist latest coord to database bus object
  bus.currentLat = lat;
  bus.currentLng = lng;
  bus.currentSpeed = busState.speedKmh;
  bus.isLive = true;
  bus.lastUpdated = new Date(timestamp).toISOString();
  saveDb();

  // --- Station-by-Station State Machine Processing ---
  const stops = route?.stops || [];
  const eventsGenerated = [];

  let detectedCurrentStation = null;
  let detectedNextStation = null;
  let minDistanceToUpcomingStop = Infinity;

  // Final terminal stop check
  const finalStop = stops[stops.length - 1];
  const isNearFinalStop =
    finalStop && calculateDistanceMeters(lat, lng, finalStop.lat, finalStop.lng) <= 250;

  stops.forEach((stop, index) => {
    const stationState = busState.stationStates[stop.id] || {
      stationId: stop.id,
      stationName: stop.name,
      shortName: stop.shortName || stop.name,
      sequence: stop.sequence,
      lat: stop.lat,
      lng: stop.lng,
      approachRadiusMeters: 450,
      arrivalRadiusMeters: 60,
      state: 'IDLE',
      arrivalTime: null,
      departureTime: null,
      distanceMeters: 0,
      etaMinutes: 0,
    };

    const distMeters = calculateDistanceMeters(lat, lng, stop.lat, stop.lng);
    stationState.distanceMeters = distMeters;

    // Estimated time in minutes (based on speed or default average 25 km/h)
    const effectiveSpeedMps = Math.max(15, (busState.speedKmh * 1000) / 3600);
    const etaMins = Math.max(0, Math.round(distMeters / effectiveSpeedMps / 60));
    stationState.etaMinutes = etaMins;

    const prevState = stationState.state;

    // --- State Transitions: APPROACHING -> ARRIVED -> WAITING -> DEPARTED ---

    // 1. APPROACHING EVENT
    // Bus enters approaching radius (<= 450m) and is moving toward stop
    if (distMeters <= stationState.approachRadiusMeters && distMeters > stationState.arrivalRadiusMeters) {
      if (prevState === 'IDLE') {
        stationState.state = 'APPROACHING';
        const event = {
          id: `ev-${bus.busNumber}-${stop.id}-appr-${Date.now()}`,
          busNumber: bus.busNumber,
          stationId: stop.id,
          stationName: stop.name,
          sequence: stop.sequence,
          event: 'APPROACHING',
          eventLabel: 'Approaching',
          indicator: 'red',
          timeFormatted: formatTime(timestamp),
          timestamp,
          speedKmh: busState.speedKmh,
          distanceMeters: distMeters,
          etaMinutes: Math.max(1, etaMins),
          title: `Approaching ${stop.shortName || stop.name}`,
          message: `${bus.busNumber} is approaching ${stop.name}. Distance: ${distMeters}m, ETA: ~${Math.max(1, etaMins)} min.`,
        };
        eventsGenerated.push(event);
        notificationHistory.unshift(event);
      }
    }

    // 2. ARRIVED EVENT
    // Bus is inside arrival geofence (<= 60m) or stopped right at stop (<= 85m and speed <= 5 km/h)
    const isInsideArrivalGeofence =
      distMeters <= stationState.arrivalRadiusMeters ||
      (distMeters <= 85 && busState.speedKmh <= 5);

    if (isInsideArrivalGeofence) {
      if (prevState === 'IDLE' || prevState === 'APPROACHING') {
        stationState.state = 'ARRIVED';
        stationState.arrivalTime = formatTime(timestamp);

        const event = {
          id: `ev-${bus.busNumber}-${stop.id}-arr-${Date.now()}`,
          busNumber: bus.busNumber,
          stationId: stop.id,
          stationName: stop.name,
          sequence: stop.sequence,
          event: 'ARRIVED',
          eventLabel: 'Arrived',
          indicator: 'green',
          timeFormatted: stationState.arrivalTime,
          timestamp,
          speedKmh: busState.speedKmh,
          distanceMeters: distMeters,
          etaMinutes: 0,
          title: `🟢 Reached ${stop.shortName || stop.name}`,
          message: `🟢 ${bus.busNumber} has reached ${stop.name}. Arrival: ${stationState.arrivalTime}. The bus is currently waiting at the station.`,
        };
        eventsGenerated.push(event);
        notificationHistory.unshift(event);
      } else if (prevState === 'ARRIVED' && busState.speedKmh <= 2) {
        stationState.state = 'WAITING'; // Silent waiting state at station
      }
    }

    // 3. DEPARTED EVENT
    // Bus starts moving away (> 90m) with speed > 4 km/h after having arrived or waited
    const hasDepartedStation =
      (prevState === 'ARRIVED' || prevState === 'WAITING') &&
      distMeters > 90 &&
      busState.speedKmh >= 4;

    if (hasDepartedStation) {
      stationState.state = 'DEPARTED';
      stationState.departureTime = formatTime(timestamp);

      // Find the immediate next station
      const nextStop = stops[index + 1] || null;
      const nextEtaMins = nextStop
        ? Math.max(1, Math.round(calculateDistanceMeters(lat, lng, nextStop.lat, nextStop.lng) / 400))
        : 0;

      const event = {
        id: `ev-${bus.busNumber}-${stop.id}-dep-${Date.now()}`,
        busNumber: bus.busNumber,
        stationId: stop.id,
        stationName: stop.name,
        sequence: stop.sequence,
        event: 'DEPARTED',
        eventLabel: 'Departed',
        indicator: 'red',
        timeFormatted: stationState.departureTime,
        timestamp,
        speedKmh: busState.speedKmh,
        nextStationName: nextStop ? nextStop.name : 'Destination',
        nextStationEtaMinutes: nextEtaMins,
        title: `🔴 Departed ${stop.shortName || stop.name}`,
        message: `🔴 ${bus.busNumber} has departed from ${stop.name}. Departure: ${stationState.departureTime}. Next stop: ${nextStop ? nextStop.name : 'Destination'}. ETA: ${nextEtaMins} mins.`,
      };
      eventsGenerated.push(event);
      notificationHistory.unshift(event);
    }

    // Determine current & next station pointers
    if (distMeters <= 100) {
      detectedCurrentStation = stop;
    }

    if (stationState.state !== 'DEPARTED' && distMeters < minDistanceToUpcomingStop) {
      minDistanceToUpcomingStop = distMeters;
      detectedNextStation = stop;
    }

    busState.stationStates[stop.id] = stationState;
  });

  // 4. DESTINATION EVENT
  if (isNearFinalStop && busState.statusIndicator !== 'yellow') {
    const destEvent = {
      id: `ev-${bus.busNumber}-dest-${Date.now()}`,
      busNumber: bus.busNumber,
      stationId: finalStop.id,
      stationName: finalStop.name,
      sequence: finalStop.sequence,
      event: 'DESTINATION',
      eventLabel: 'Destination',
      indicator: 'yellow',
      timeFormatted: formatTime(timestamp),
      timestamp,
      speedKmh: busState.speedKmh,
      title: `🟡 Destination Reached`,
      message: `🟡 ${bus.busNumber} has reached the destination (${finalStop.name}). The journey is completed.`,
    };
    eventsGenerated.push(destEvent);
    notificationHistory.unshift(destEvent);
  }

  // Determine overall 3-state status:
  // 🟢 Green: Bus has reached a station / waiting at the station
  // 🔴 Red: Bus has departed and is travelling toward the next station
  // 🟡 Yellow: Bus has reached or is very close to its destination
  if (isNearFinalStop || (finalStop && busState.stationStates[finalStop.id]?.state === 'ARRIVED')) {
    busState.status = 'destination';
    busState.statusIndicator = 'yellow';
    busState.statusLabel = 'Destination / Arrived';
  } else if (detectedCurrentStation && (busState.speedKmh <= 4 || busState.stationStates[detectedCurrentStation.id]?.state === 'ARRIVED')) {
    busState.status = 'at_station';
    busState.statusIndicator = 'green';
    busState.statusLabel = `At Station (${detectedCurrentStation.shortName || detectedCurrentStation.name})`;
  } else {
    busState.status = 'moving';
    busState.statusIndicator = 'red';
    busState.statusLabel = `Moving to ${detectedNextStation ? detectedNextStation.shortName : 'Next Station'}`;
  }

  busState.currentStation = detectedCurrentStation || busState.currentStation || stops[0];
  busState.nextStation = detectedNextStation || stops[stops.length - 1];
  busState.distanceToNextStationMeters = detectedNextStation
    ? calculateDistanceMeters(lat, lng, detectedNextStation.lat, detectedNextStation.lng)
    : 0;
  busState.etaToNextStationMinutes = detectedNextStation
    ? Math.max(1, Math.round(busState.distanceToNextStationMeters / 400))
    : 0;

  // Keep notification history capped at latest 100 records
  if (notificationHistory.length > 100) {
    notificationHistory.length = 100;
  }

  // --- Broadcast Real-Time Update to SSE Subscribers ---
  const broadcastPayload = {
    type: 'GPS_TELEMETRY_UPDATE',
    bus: busState,
    events: eventsGenerated,
    timestamp: Date.now(),
  };

  notifySseClients(broadcastPayload);

  return {
    success: true,
    bus: busState,
    events: eventsGenerated,
  };
}

/**
 * Get real-time status of all fleet buses
 */
export function getAllLiveBuses() {
  loadDb();
  const db = getDb();
  const now = Date.now();

  return db.buses.map((bus) => {
    const route = db.routes.find((r) => r.id === bus.routeId) || db.routes[0];
    const state = getOrCreateBusState(bus, route);

    const secondsSinceUpdate = Math.round((now - state.lastUpdated) / 1000);
    const isGpsActive = secondsSinceUpdate <= 25;
    const isGpsWeak = secondsSinceUpdate > 25 && secondsSinceUpdate <= 60;

    return {
      ...state,
      secondsSinceUpdate,
      gpsHealth: isGpsActive ? 'active' : isGpsWeak ? 'weak' : 'offline',
      gpsHealthLabel: isGpsActive
        ? `Live GPS Active (Updated ${secondsSinceUpdate}s ago)`
        : isGpsWeak
        ? `GPS Signal Weak (Updated ${secondsSinceUpdate}s ago)`
        : 'GPS Signal Lost / Offline',
    };
  });
}

/**
 * Get station notification history
 */
export function getNotificationHistory(busNumberFilter) {
  if (!busNumberFilter) return notificationHistory;
  return notificationHistory.filter(
    (h) => h.busNumber.toLowerCase() === busNumberFilter.toLowerCase()
  );
}

/**
 * SSE Client Management
 */
export function addSseClient(res) {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

function notifySseClients(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

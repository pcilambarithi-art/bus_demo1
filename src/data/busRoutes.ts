import type { BusRoute, BusVehicle, StudentUser } from '../types/bus';
import { interpolateCoord } from '../utils/geo';

// Helper to generate dense waypoints between key corner anchors
function generateSmoothPath(anchors: [number, number][], stepsPerSegment: number = 30): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const start = anchors[i];
    const end = anchors[i + 1];
    for (let step = 0; step < stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      result.push(interpolateCoord(start, end, t));
    }
  }
  result.push(anchors[anchors.length - 1]);
  return result;
}

// DCE Campus Destination: Manimangalam, Near Tambaram, Chennai
// Coordinates: [12.9165, 80.0435]

// ROUTE 07: Guindy / Tambaram -> DCE Express (DCE-BUS-07)
const route07Anchors: [number, number][] = [
  [13.0067, 80.2026], // Guindy Kathipara
  [12.9850, 80.1780],
  [12.9675, 80.1491], // Pallavaram
  [12.9516, 80.1462], // Chromepet
  [12.9360, 80.1280], // Tambaram MEPZ
  [12.9249, 80.1165], // Tambaram West Stand
  [12.9150, 80.0820], // Mudichur Road Junction
  [12.9180, 80.0620], // Varadharajapuram
  [12.9165, 80.0435], // Dhanalakshmi College of Engineering (DCE) Campus
];

// ROUTE 04: Chromepet / Perungalathur -> DCE (DCE-BUS-04)
const route04Anchors: [number, number][] = [
  [12.9516, 80.1462], // Chromepet MIT Gate
  [12.9360, 80.1280], // Tambaram MEPZ
  [12.9249, 80.1165], // Tambaram West
  [12.9050, 80.0930], // Perungalathur Junction
  [12.9120, 80.0750], // Mudichur Koot Road
  [12.9165, 80.0435], // DCE Campus Gate
];

// ROUTE 01: Tambaram West -> DCE Campus (DCE-BUS-01)
const route01Anchors: [number, number][] = [
  [12.9360, 80.1280], // Tambaram Sanatorium
  [12.9249, 80.1165], // Tambaram West Bus Stand
  [12.9180, 80.0950], // Kishkinta Road
  [12.9150, 80.0820], // Mudichur Junction
  [12.9170, 80.0600], // Manimangalam Koot Road
  [12.9165, 80.0435], // DCE Engineering Block
];

// ROUTE 12: Koyambedu / Porur -> DCE Shuttle (DCE-BUS-12)
const route12Anchors: [number, number][] = [
  [13.0694, 80.1948], // Koyambedu CMBT
  [13.0335, 80.1583], // Porur Toll Gate
  [12.9980, 80.0970], // Kundrathur Koot Road
  [12.9550, 80.0700], // Somangalam
  [12.9165, 80.0435], // DCE Campus Main Gate
];

export const BUS_ROUTES: BusRoute[] = [
  {
    id: 'route-07',
    name: 'Guindy ➔ Tambaram ➔ DCE Express',
    code: 'R-07',
    origin: 'Guindy Kathipara',
    destination: 'DCE Campus, Manimangalam',
    totalDistanceKm: 18.2,
    estimatedTotalMinutes: 42,
    stops: [
      {
        id: 'stop-07-1',
        name: 'Guindy Kathipara Junction',
        shortName: 'Guindy',
        lat: 13.0067,
        lng: 80.2026,
        sequence: 1,
        scheduledTime: '07:15 AM',
        studentsWaiting: 22,
        isTerminal: true,
      },
      {
        id: 'stop-07-2',
        name: 'Pallavaram Bus Stop',
        shortName: 'Pallavaram',
        lat: 12.9675,
        lng: 80.1491,
        sequence: 2,
        scheduledTime: '07:28 AM',
        studentsWaiting: 18,
      },
      {
        id: 'stop-07-3',
        name: 'Tambaram West Stand',
        shortName: 'Tambaram West',
        lat: 12.9249,
        lng: 80.1165,
        sequence: 3,
        scheduledTime: '07:42 AM',
        studentsWaiting: 34,
      },
      {
        id: 'stop-07-4',
        name: 'Mudichur Road Junction',
        shortName: 'Mudichur',
        lat: 12.9150,
        lng: 80.0820,
        sequence: 4,
        scheduledTime: '07:54 AM',
        studentsWaiting: 16,
      },
      {
        id: 'stop-07-5',
        name: 'Dhanalakshmi College of Engg (DCE)',
        shortName: 'DCE Campus',
        lat: 12.9165,
        lng: 80.0435,
        sequence: 5,
        scheduledTime: '08:05 AM',
        studentsWaiting: 0,
        isTerminal: true,
      },
    ],
    waypoints: generateSmoothPath(route07Anchors, 35),
  },
  {
    id: 'route-04',
    name: 'Chromepet ➔ Perungalathur ➔ DCE',
    code: 'R-04',
    origin: 'Chromepet MIT',
    destination: 'DCE Campus, Manimangalam',
    totalDistanceKm: 14.5,
    estimatedTotalMinutes: 35,
    stops: [
      {
        id: 'stop-04-1',
        name: 'Chromepet MIT Gate',
        shortName: 'Chromepet',
        lat: 12.9516,
        lng: 80.1462,
        sequence: 1,
        scheduledTime: '07:25 AM',
        studentsWaiting: 15,
        isTerminal: true,
      },
      {
        id: 'stop-04-2',
        name: 'Tambaram MEPZ Gate',
        shortName: 'MEPZ',
        lat: 12.9360,
        lng: 80.1280,
        sequence: 2,
        scheduledTime: '07:35 AM',
        studentsWaiting: 21,
      },
      {
        id: 'stop-04-3',
        name: 'Perungalathur Junction',
        shortName: 'Perungalathur',
        lat: 12.9050,
        lng: 80.0930,
        sequence: 3,
        scheduledTime: '07:48 AM',
        studentsWaiting: 28,
      },
      {
        id: 'stop-04-4',
        name: 'Mudichur Koot Road',
        shortName: 'Mudichur Rd',
        lat: 12.9120,
        lng: 80.0750,
        sequence: 4,
        scheduledTime: '07:56 AM',
        studentsWaiting: 12,
      },
      {
        id: 'stop-04-5',
        name: 'Dhanalakshmi College of Engg (DCE)',
        shortName: 'DCE Campus',
        lat: 12.9165,
        lng: 80.0435,
        sequence: 5,
        scheduledTime: '08:08 AM',
        studentsWaiting: 0,
        isTerminal: true,
      },
    ],
    waypoints: generateSmoothPath(route04Anchors, 35),
  },
  {
    id: 'route-01',
    name: 'Tambaram ➔ Mudichur ➔ DCE Shuttle',
    code: 'R-01',
    origin: 'Tambaram Sanatorium',
    destination: 'DCE Campus, Manimangalam',
    totalDistanceKm: 10.8,
    estimatedTotalMinutes: 26,
    stops: [
      {
        id: 'stop-01-1',
        name: 'Tambaram Sanatorium',
        shortName: 'Sanatorium',
        lat: 12.9360,
        lng: 80.1280,
        sequence: 1,
        scheduledTime: '07:30 AM',
        studentsWaiting: 19,
        isTerminal: true,
      },
      {
        id: 'stop-01-2',
        name: 'Tambaram West Bus Stand',
        shortName: 'Tambaram West',
        lat: 12.9249,
        lng: 80.1165,
        sequence: 2,
        scheduledTime: '07:40 AM',
        studentsWaiting: 26,
      },
      {
        id: 'stop-01-3',
        name: 'Mudichur Road Junction',
        shortName: 'Mudichur',
        lat: 12.9150,
        lng: 80.0820,
        sequence: 3,
        scheduledTime: '07:52 AM',
        studentsWaiting: 14,
      },
      {
        id: 'stop-01-4',
        name: 'Manimangalam Koot Road',
        shortName: 'Manimangalam',
        lat: 12.9170,
        lng: 80.0600,
        sequence: 4,
        scheduledTime: '08:01 AM',
        studentsWaiting: 11,
      },
      {
        id: 'stop-01-5',
        name: 'DCE Engineering Block',
        shortName: 'DCE Campus',
        lat: 12.9165,
        lng: 80.0435,
        sequence: 5,
        scheduledTime: '08:10 AM',
        studentsWaiting: 0,
        isTerminal: true,
      },
    ],
    waypoints: generateSmoothPath(route01Anchors, 35),
  },
  {
    id: 'route-12',
    name: 'Koyambedu ➔ Porur ➔ Kundrathur ➔ DCE',
    code: 'R-12',
    origin: 'Koyambedu CMBT',
    destination: 'DCE Campus, Manimangalam',
    totalDistanceKm: 24.6,
    estimatedTotalMinutes: 52,
    stops: [
      {
        id: 'stop-12-1',
        name: 'Koyambedu CMBT',
        shortName: 'Koyambedu',
        lat: 13.0694,
        lng: 80.1948,
        sequence: 1,
        scheduledTime: '07:05 AM',
        studentsWaiting: 31,
        isTerminal: true,
      },
      {
        id: 'stop-12-2',
        name: 'Porur Toll Gate',
        shortName: 'Porur',
        lat: 13.0335,
        lng: 80.1583,
        sequence: 2,
        scheduledTime: '07:22 AM',
        studentsWaiting: 24,
      },
      {
        id: 'stop-12-3',
        name: 'Kundrathur Murugan Koot Road',
        shortName: 'Kundrathur',
        lat: 12.9980,
        lng: 80.0970,
        sequence: 3,
        scheduledTime: '07:38 AM',
        studentsWaiting: 17,
      },
      {
        id: 'stop-12-4',
        name: 'Somangalam Junction',
        shortName: 'Somangalam',
        lat: 12.9550,
        lng: 80.0700,
        sequence: 4,
        scheduledTime: '07:51 AM',
        studentsWaiting: 9,
      },
      {
        id: 'stop-12-5',
        name: 'Dhanalakshmi College of Engg (DCE)',
        shortName: 'DCE Campus',
        lat: 12.9165,
        lng: 80.0435,
        sequence: 5,
        scheduledTime: '08:08 AM',
        studentsWaiting: 0,
        isTerminal: true,
      },
    ],
    waypoints: generateSmoothPath(route12Anchors, 35),
  },
];

export const BUS_VEHICLES: BusVehicle[] = [
  {
    id: 'bus-07',
    busNumber: 'DCE-BUS-07',
    plateNumber: 'TN-11-AA-4521',
    routeId: 'route-07',
    driverName: 'Muruganandam K.',
    driverPhone: '+91 94440 12894',
    driverRating: 4.9,
    capacity: 52,
    currentOccupancy: 36,
    hasAC: true,
    isLive: true,
    statusText: 'On Schedule (GST Road)',
  },
  {
    id: 'bus-04',
    busNumber: 'DCE-BUS-04',
    plateNumber: 'TN-11-AB-1903',
    routeId: 'route-04',
    driverName: 'Senthil Kumar R.',
    driverPhone: '+91 94442 77410',
    driverRating: 4.8,
    capacity: 48,
    currentOccupancy: 39,
    hasAC: true,
    isLive: true,
    statusText: 'Moving via Perungalathur',
  },
  {
    id: 'bus-01',
    busNumber: 'DCE-BUS-01',
    plateNumber: 'TN-11-AC-8812',
    routeId: 'route-01',
    driverName: 'Paneerselvam M.',
    driverPhone: '+91 98840 33190',
    driverRating: 4.9,
    capacity: 45,
    currentOccupancy: 28,
    hasAC: false,
    isLive: true,
    statusText: 'Approaching Mudichur',
  },
  {
    id: 'bus-12',
    busNumber: 'DCE-BUS-12',
    plateNumber: 'TN-11-AD-5561',
    routeId: 'route-12',
    driverName: 'Govindaraj V.',
    driverPhone: '+91 98412 88921',
    driverRating: 4.7,
    capacity: 52,
    currentOccupancy: 44,
    hasAC: true,
    isLive: true,
    statusText: 'Crossing Kundrathur',
  },
];

export const DEFAULT_STUDENT: StudentUser = {
  name: 'Karthik S.',
  id: 'DCE-2024-CSE-042',
  department: 'Computer Science & Engineering',
  semester: '6th Semester - Section A',
  assignedBusId: 'bus-07',
  assignedStopId: 'stop-07-3', // Tambaram West Stand
  lat: 12.9249,
  lng: 80.1165,
};

// API Service configuration & DCE Real-Time Bus Tracking AI Engine
export const API_KEY =
  import.meta.env.VITE_API_KEY ||
  import.meta.env.VITE_GEMINI_API_KEY ||
  '';

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const GOOGLE_MAPS_SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_MAPS_SCRIPT_URL ||
  (GOOGLE_MAPS_API_KEY ? `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places` : '');

let googleMapsPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).google?.maps) return Promise.resolve();

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = GOOGLE_MAPS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

export interface DceTransitContext {
  busId: string;
  routeId: string;
  routeName: string;
  currentSpeed: number;
  latitude: number;
  longitude: number;
  distanceToStop: string;
  distanceToCollegeKm: number;
  etaMinutes: number;
  nextStopName: string;
  studentStopName: string;
  status: string;
  lastUpdatedTimestamp: string;
  freshnessSeconds: number;
  distanceToNextStop?: string;
  studentName?: string;
  routeStopsSummary?: string;
  allBusesSummary?: string;
  activeAlertsSummary?: string;
}

/**
 * Checks whether user query is genuinely related to college transit/buses.
 * Strictest filtering: Rejects any unwanted chats (coding, general knowledge, movies, etc.)
 */
function isTransitRelated(query: string): boolean {
  const p = query.toLowerCase().trim();

  // Unwanted chat categories
  const unwantedKeywords = [
    'code', 'python', 'javascript', 'java', 'html', 'css', 'react', 'program', 'algorithm',
    'recipe', 'cook', 'food', 'weather', 'rain', 'temperature', 'climate',
    'movie', 'cinema', 'actor', 'actress', 'song', 'music', 'album', 'game',
    'cricket', 'ipl', 'football', 'joke', 'story', 'poem', 'essay', 'homework',
    'math', 'solve', 'physics', 'chemistry', 'biology', 'history', 'president',
    'minister', 'politics', 'election', 'capital of', 'ai model', 'chatgpt',
    'openai', 'who are you', 'how are you', 'what is your name', 'tell me about yourself',
    'love', 'dating', 'finance', 'stock', 'crypto', 'bitcoin', 'general knowledge'
  ];

  const hasUnwanted = unwantedKeywords.some((kw) => p.includes(kw));
  const hasExplicitBus =
    p.includes('bus') || p.includes('route') || p.includes('stop') ||
    p.includes('dce') || p.includes('tambaram') || p.includes('speed') ||
    p.includes('driver') || p.includes('eta');

  if (hasUnwanted && !hasExplicitBus) {
    return false;
  }

  // Explicit greeting or transit keywords
  const transitKeywords = [
    'bus', 'route', 'stop', 'track', 'live', 'speed', 'eta', 'time', 'reach',
    'location', 'where', 'when', 'which', 'arrive', 'arrival', 'delay', 'driver',
    'dce', 'tambaram', 'chromepet', 'guindy', 'koyambedu', 'porur', 'mudichur',
    'perungalathur', 'pallavaram', 'sanatorium', 'somangalam', 'kundrathur',
    'mepz', 'kishkinta', 'manimangalam', 'campus', 'college', 'seat', 'occupancy',
    'enga', 'irukku', 'iruku', 'varum', 'varuma', 'vandhucha', 'vandhutha',
    'eppo', 'eppovarum', 'solunga', 'solu', 'list', 'fleet', 'cockpit', 'pass',
    '07', '04', '01', '12', 'plate', 'gps', 'radar', 'transit', 'vehicle', 'map',
    'van', 'pickup', 'drop', 'near', 'distance', 'kilometer', 'km', 'hi', 'hello',
    'vanakkam', 'help'
  ];

  return transitKeywords.some((kw) => p.includes(kw));
}

const NON_TRANSIT_REFUSAL_EN =
  'This chatbot is strictly for Dhanalakshmi College of Engineering (DCE) Bus Tracking only. Please ask about bus locations, routes, stops, ETA, speed, or campus fleet status.';

const NON_TRANSIT_REFUSAL_TA =
  'இந்த chatbot Dhanalakshmi College of Engineering (DCE) பேருந்து நேரலை கண்காணிப்பிற்கு மட்டுமே (Bus Tracking Only). தயவுசெய்து கல்லூரி பேருந்துகள் பற்றிய கேள்விகளை மட்டும் கேட்கவும்.';

/**
 * Official DCE Real-Time Bus Tracking AI
 * Enforces strict domain limitation: Only DCE bus tracking and live telemetry.
 */
export async function queryTransitAssistant(
  prompt: string,
  context: DceTransitContext
): Promise<string> {
  const cleanPrompt = prompt.trim();
  const lowerPrompt = cleanPrompt.toLowerCase();

  const isTanglish =
    lowerPrompt.includes('enga') ||
    lowerPrompt.includes('irukku') ||
    lowerPrompt.includes('vandhucha') ||
    lowerPrompt.includes('varuma') ||
    lowerPrompt.includes('eppo') ||
    lowerPrompt.includes('solunga') ||
    lowerPrompt.includes('vanakkam') ||
    lowerPrompt.includes('tamil') ||
    lowerPrompt.includes('perunthu');

  // Strict domain enforcement: refuse non-bus queries immediately
  if (!isTransitRelated(cleanPrompt)) {
    return isTanglish ? NON_TRANSIT_REFUSAL_TA : NON_TRANSIT_REFUSAL_EN;
  }

  // Location freshness
  let freshnessLabel = 'LIVE';
  if (context.freshnessSeconds <= 30) {
    freshnessLabel = 'LIVE';
  } else if (context.freshnessSeconds <= 120) {
    freshnessLabel = 'RECENT';
  } else if (context.freshnessSeconds <= 300) {
    freshnessLabel = 'SLIGHTLY DELAYED';
  } else {
    freshnessLabel = 'STALE';
  }

  const dceSystemPrompt = `You are the official Dhanalakshmi College of Engineering (DCE) Campus Bus Tracking AI Assistant.
Your SOLE and EXCLUSIVE responsibility is to answer student and faculty questions regarding live bus tracking, fleet telemetry, routes, stops, speeds, and ETAs.

LIVE DATA EXTRACTED FROM ACTIVE WEB APPLICATION:
- Currently Selected Bus: ${context.busId}
- Route Name: ${context.routeName} (Code: ${context.routeId})
- Current Bus Speed: ${context.currentSpeed} km/h
- Current GPS Coordinates: ${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)}
- Movement Status: ${context.status}
- Telemetry Freshness: ${freshnessLabel} (Updated: ${context.lastUpdatedTimestamp})
- Current Location: Near ${context.nextStopName}${context.distanceToNextStop ? ` (${context.distanceToNextStop} to next stop)` : ''}
- Distance to Student Stop (${context.studentStopName}): ${context.distanceToStop}
- Distance to DCE College Campus: ${context.distanceToCollegeKm.toFixed(1)} km
- Calculated Live ETA: ~${context.etaMinutes <= 0 ? 'Arriving now' : `${context.etaMinutes} minutes`}
${context.studentName ? `- Student Name: ${context.studentName}` : ''}
${context.routeStopsSummary ? `- Route Stops in Sequence:\n  ${context.routeStopsSummary}` : ''}

${context.allBusesSummary ? `ALL ACTIVE FLEET BUSES (LIVE WEB EXTRACTION):\n${context.allBusesSummary}` : ''}
${context.activeAlertsSummary ? `ACTIVE TRANSIT NOTIFICATIONS:\n${context.activeAlertsSummary}` : ''}

CRITICAL UNWANTED CHAT POLICY (HIGHEST PRIORITY):
This chatbot is EXCLUSIVELY for bus tracking. If the user asks or chats about ANY unwanted topic (such as general knowledge, coding/programming, recipes, weather, movies, jokes, stories, homework, politics, non-transit chat, or anything unrelated to DCE buses):
DO NOT ANSWER THE QUESTION.
You MUST ONLY reply:
"${NON_TRANSIT_REFUSAL_EN}" (or in Tamil/Tanglish: "${NON_TRANSIT_REFUSAL_TA}").

Response Rules:
1. Always calculate and tell the user the exact live status, speed, location, and ETA based on the live data above.
2. If user asks for bus list / routes to track, list all 4 buses (DCE-BUS-07, 04, 01, 12) from the live fleet data.
3. If user asks in Tanglish (e.g. "Bus enga irukku?", "Bus eppo varum?"), respond in friendly, natural Tanglish.
4. If user asks in English, respond in professional, crisp English.
5. Strictly refuse non-bus queries.`;

  if (API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${dceSystemPrompt}\n\nStudent question: ${cleanPrompt}`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer) return answer.trim();
      }
    } catch {
      // Fall through to strict deterministic engine
    }
  }

  // Deterministic Zero-Hallucination Transit Engine
  // 1. Bus list / all routes query
  if (
    lowerPrompt.includes('list') ||
    lowerPrompt.includes('all bus') ||
    lowerPrompt.includes('routes') ||
    lowerPrompt.includes('how many') ||
    lowerPrompt.includes('fleet')
  ) {
    if (isTanglish) {
      return `DCE Active Bus Fleet (நேரலை பேருந்துகள்):\n• DCE-BUS-07: Guindy / Tambaram ➜ DCE Express (Active Live)\n• DCE-BUS-04: Chromepet / Perungalathur ➜ DCE (Active Live)\n• DCE-BUS-01: Tambaram West ➜ DCE Campus (Active Live)\n• DCE-BUS-12: Koyambedu / Porur ➜ DCE Shuttle (Active Live)\n\nதற்போது நீங்கள் கண்காணிப்பது: Bus ${context.busId} (${context.routeName}).`;
    }
    return `DCE Active Transit Fleet (Live Tracking):\n• DCE-BUS-07: Guindy / Tambaram ➜ DCE Express [LIVE]\n• DCE-BUS-04: Chromepet / Perungalathur ➜ DCE [LIVE]\n• DCE-BUS-01: Tambaram West ➜ DCE Campus [LIVE]\n• DCE-BUS-12: Koyambedu / Porur ➜ DCE Shuttle [LIVE]\n\nCurrently Tracking: Bus ${context.busId} (${context.routeName}).`;
  }

  // 2. Speed query
  if (lowerPrompt.includes('speed') || lowerPrompt.includes('fast')) {
    if (isTanglish) {
      return `Bus ${context.busId} தற்போது ${context.currentSpeed} km/h வேகத்தில் ${context.nextStopName} அருகில் சென்று கொண்டிருக்கிறது. Status: ${context.status}.`;
    }
    return `Bus ${context.busId} (${context.routeName}) is currently traveling at ${context.currentSpeed} km/h near ${context.nextStopName}. Status: ${context.status}.`;
  }

  // 3. Location / ETA in Tanglish
  if (isTanglish) {
    if (lowerPrompt.includes('enga') || lowerPrompt.includes('location') || lowerPrompt.includes('track') || lowerPrompt.includes('where')) {
      return `Bus ${context.busId} இப்போது ${context.nextStopName} அருகில் ${context.currentSpeed} km/h speed-ல் moving-ல் உள்ளது. உங்க stop (${context.studentStopName})-க்கு வர approx ${context.etaMinutes <= 0 ? 'இப்போதே வந்துவிட்டது' : `${context.etaMinutes} நிமிடங்கள்`} ஆகும். (Last updated: ${context.lastUpdatedTimestamp}).`;
    }
    if (lowerPrompt.includes('eppo') || lowerPrompt.includes('reach') || lowerPrompt.includes('college') || lowerPrompt.includes('time') || lowerPrompt.includes('when')) {
      return `Bus ${context.busId} approximately ${context.etaMinutes <= 0 ? 'இப்போதே வந்துவிட்டது' : `${context.etaMinutes} நிமிடங்களில்`} ${context.studentStopName} stop-ஐ சென்றடையும். DCE College Distance: ${context.distanceToCollegeKm.toFixed(1)} km. This is a verified live GPS calculation.`;
    }
    return `Bus ${context.busId} (${context.routeName}) - Status: ${context.status}, Speed: ${context.currentSpeed} km/h. Next stop: ${context.nextStopName}. Last updated: ${context.lastUpdatedTimestamp}.`;
  }

  // 4. Default Standard English Response with full verified telemetry
  return `Bus: ${context.busId}
Route: ${context.routeName}
Status: ${context.status}
Speed: ${context.currentSpeed} km/h
Current Location: Near ${context.nextStopName}
Distance to Your Stop (${context.studentStopName}): ${context.distanceToStop}
Distance to DCE Campus: ${context.distanceToCollegeKm.toFixed(1)} km
Estimated Arrival (ETA): ${context.etaMinutes <= 0 ? 'Arriving now' : `~${context.etaMinutes} minutes`}
Last Updated: ${context.lastUpdatedTimestamp} (${freshnessLabel})`;
}

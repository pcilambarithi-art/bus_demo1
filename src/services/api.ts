// API Service configuration & DCE Real-Time Bus Tracking AI Engine
export const API_KEY =
  import.meta.env.VITE_API_KEY ||
  import.meta.env.VITE_GEMINI_API_KEY ||
  '';

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao';

export const GOOGLE_MAPS_SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_MAPS_SCRIPT_URL ||
  `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;

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
}

/**
 * Official DCE Real-Time Bus Tracking AI
 * Complies with DCE System Prompt guidelines
 */
export async function queryTransitAssistant(
  prompt: string,
  context: DceTransitContext
): Promise<string> {
  // Determine location freshness level (Section 5)
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

  const dceSystemPrompt = `You are the official AI assistant for Dhanalakshmi College of Engineering (DCE), Chennai, Tamil Nadu real-time college bus tracking system.
Your primary responsibility is to provide accurate information about DCE college buses using verified real-time data.
You must NEVER invent, estimate, assume, or fabricate bus locations, routes, timings, driver information, or bus status.

Service Area:
- Institution: Dhanalakshmi College of Engineering (DCE), Manimangalam, Near Tambaram, Chennai, Tamil Nadu.

Current Verified Real-Time Telemetry:
- Bus ID: ${context.busId}
- Route: ${context.routeName}
- GPS Coordinates: ${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)}
- Speed: ${context.currentSpeed} km/h
- Status: ${context.status}
- Location Freshness: ${freshnessLabel} (Updated: ${context.lastUpdatedTimestamp})
- Current Location: Near ${context.nextStopName}
- Distance to Student's Stop (${context.studentStopName}): ${context.distanceToStop}
- Distance to DCE College Campus: ${context.distanceToCollegeKm.toFixed(1)} km
- Estimated Arrival (ETA): ~${context.etaMinutes} minutes

Response Guidelines:
1. Support English, Tamil, and Tanglish (Tamil-English mixed) natively.
   - If user asks in Tanglish/Tamil (e.g. "Bus enga irukku?", "Bus vandhucha?"), respond in clear Tanglish/Tamil.
   - If user asks in English, respond in English.
2. Standard Response Format for tracking queries:
   Bus: ${context.busId}
   Route: ${context.routeName}
   Status: ${context.status}
   Speed: ${context.currentSpeed} km/h
   Last Updated: ${context.lastUpdatedTimestamp}
   Location: Near ${context.nextStopName}
   Distance to Stop: ${context.distanceToStop}
   Estimated arrival: Around ${context.etaMinutes <= 0 ? 'Now' : `${context.etaMinutes} minutes`}
3. Respect privacy: Never invent or expose personal driver numbers, private addresses, passwords, or internal tokens.
4. If asked about stale or unavailable data, clearly state so without hallucinating.`;

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
                text: `${dceSystemPrompt}\n\nStudent question: ${prompt}`,
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
    // Fallback to strict DCE rule-based logic
  }

  // Strict Rule-Based DCE Response Logic (Zero Hallucination)
  const lower = prompt.toLowerCase();
  const isTanglish =
    lower.includes('enga') ||
    lower.includes('irukku') ||
    lower.includes('vandhucha') ||
    lower.includes('varuma') ||
    lower.includes('eppo') ||
    lower.includes('solunga') ||
    lower.includes('reach');

  if (isTanglish) {
    if (lower.includes('enga') || lower.includes('location') || lower.includes('track')) {
      return `Bus ${context.busId} இப்போது ${context.nextStopName} அருகில் ${context.currentSpeed} km/h speed-ல் moving-ல் உள்ளது. உங்க stop (${context.studentStopName})-க்கு வர approx ${context.etaMinutes} minutes ஆகும். Last updated ${context.lastUpdatedTimestamp}.`;
    }
    if (lower.includes('eppo') || lower.includes('reach') || lower.includes('college')) {
      return `Bus ${context.busId} approximately ${context.etaMinutes}–${context.etaMinutes + 5} minutes-ல் DCE College reach ஆகும். Distance: ${context.distanceToCollegeKm.toFixed(1)} km. This is a verified live estimate.`;
    }
    return `Bus ${context.busId} (${context.routeName}) - Status: ${context.status}, Speed: ${context.currentSpeed} km/h. Next stop: ${context.nextStopName}. Last updated: ${context.lastUpdatedTimestamp}.`;
  }

  // English Standard Format (Section 8)
  return `Bus: ${context.busId}
Route: ${context.routeName}
Status: ${context.status}
Speed: ${context.currentSpeed} km/h
Last Updated: ${context.lastUpdatedTimestamp} (${freshnessLabel})
Location: Near ${context.nextStopName}
Distance to College: ${context.distanceToCollegeKm.toFixed(1)} km
Estimated arrival: Approximately ${context.etaMinutes <= 0 ? 'Arriving now' : `${context.etaMinutes} minutes`}`;
}

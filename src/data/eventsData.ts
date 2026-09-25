import type { EventItem } from '../types';

export const EVENTS_DATA: EventItem[] = [];


export const SCHEDULE_DATA = [
  {
    time: '08:30 AM - 09:30 AM',
    title: 'Tactical Check-In & Terminal Induction',
    phase: 'PHASE 01',
    description: 'Collection of RFID smart badges, security clearances, breakfast ration, and verification of registration QR codes.',
    category: 'Briefing' as const,
    venue: 'Grid Entrance Gate & Welcome Concourse',
    status: 'Upcoming' as const
  },
  {
    time: '09:30 AM - 10:45 AM',
    title: 'Keynote Address: Emerging Threat Vectors & Autonomous Cyber War',
    phase: 'PHASE 02',
    description: 'Inauguration ceremony featuring top cyber defense directors and keynote on zero-day AI vulnerabilities.',
    category: 'Briefing' as const,
    venue: 'Grand Cyber Auditorium (Hall 1)',
    status: 'Upcoming' as const
  },
  {
    time: '11:00 AM - 01:00 PM',
    title: 'Morning Challenges: CTF Infiltration & Bug Hunt',
    phase: 'PHASE 03',
    description: 'Simultaneous deployment of the Jeopardy CTF sandbox, Bug Hunt live audits, and Paper Presentation oral sessions.',
    category: 'Round 1' as const,
    venue: 'Cyber Range Alpha & R&D Gallery',
    status: 'Upcoming' as const
  },
  {
    time: '01:00 PM - 02:00 PM',
    title: 'Tactical Network Recharging & Refreshment Break',
    phase: 'PAUSE',
    description: 'Catered gourmet lunch buffet, peer networking, threat-intel exhibition booths, and hardware displays.',
    category: 'Break' as const,
    venue: 'Main Dining Pavilion & Innovation Court',
    status: 'Upcoming' as const
  },
  {
    time: '02:00 PM - 03:45 PM',
    title: 'Afternoon Finals: Cyber Quiz, Tech Debate & Final Siege',
    phase: 'PHASE 04',
    description: 'Live buzzer round for Cyber Quiz, parliamentary Tech Debate showdown, and CTF attack-defense finale.',
    category: 'Finals' as const,
    venue: 'Matrix Labs & Executive Chamber',
    status: 'Upcoming' as const
  },
  {
    time: '04:15 PM - 05:30 PM',
    title: 'Valedictory Protocol & Trophy Distribution',
    phase: 'PHASE 05',
    description: 'Awarding ₹1,00,000+ bounty pool, championship shields, certificates of honor, and closing cyber fireworks.',
    category: 'Valedictory' as const,
    venue: 'Grand Cyber Auditorium',
    status: 'Upcoming' as const
  }
];

// Clear any legacy cached default events on first load if version flag not set
if (typeof window !== 'undefined' && !localStorage.getItem('systech2k27_events_cleared_v2')) {
  localStorage.removeItem('systech2k27_events');
  localStorage.setItem('systech2k27_events_cleared_v2', 'true');
}

export const getStoredEvents = (): EventItem[] => {
  try {
    const saved = localStorage.getItem('systech2k27_events');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load custom events:', e);
  }
  return EVENTS_DATA;
};

export const saveStoredEvents = (events: EventItem[]) => {
  try {
    localStorage.setItem('systech2k27_events', JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('systech_events_updated', { detail: events }));
  } catch (e) {
    console.error('Failed to save events:', e);
  }
};

export const resetStoredEvents = () => {
  try {
    localStorage.removeItem('systech2k27_events');
    window.dispatchEvent(new CustomEvent('systech_events_updated', { detail: EVENTS_DATA }));
  } catch (e) {
    console.error('Failed to reset events:', e);
  }
};

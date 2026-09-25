export interface EventItem {
  id: string;
  number: string;
  name: string;
  tagline: string;
  track: 'Technical' | 'Non-Technical';
  category: 'Offensive' | 'Defensive' | 'Intel' | 'Research' | 'Strategy';
  description: string;
  detailedDescription: string;
  iconName: string;
  type: 'Individual' | 'Team (2-4 Members)' | 'Team (2-5 Members)' | 'Individual or Team (2)' | 'Team (2 Members)';
  teamMin: number;
  teamMax: number;
  date: string;
  time: string;
  venue: string;
  prizePool: string;
  rules: string[];
  eligibility: string[];
  prerequisites: string[];
  coordinators: { name: string; contact: string }[];
}

export interface RegistrationFormData {
  fullName: string;
  email: string;
  phone: string;
  collegeName: string;
  department: string;
  yearOfStudy: string;
  eventId: string;
  participationType: 'Individual' | 'Team';
  teamName?: string;
  teamMembers?: string[];
  paymentScreenshot?: File | null;
}

export interface RegistrationRecord extends RegistrationFormData {
  id: string;
  registrationId: string;
  createdAt: string;
  status: 'CONFIRMED' | 'PENDING';
  qrPayload: string;
}

export interface TimelineSchedule {
  time: string;
  title: string;
  phase: string;
  description: string;
  category: 'Briefing' | 'Round 1' | 'Break' | 'Finals' | 'Valedictory';
  venue: string;
  status: 'Completed' | 'Current' | 'Upcoming';
}

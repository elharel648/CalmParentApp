export type Language = 'he' | 'en';
export type UnitSystem = 'metric' | 'imperial';
export type TemperatureUnit = 'celsius' | 'fahrenheit';

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Vaccine {
  id: string;
  name: string;
  age: string;
  completed: boolean;
  date?: string; // ISO date string
}

export interface Milestone {
  id: string;
  title: string;
  completedDate?: string;
  description?: string;
}

export interface Memory {
  id: string;
  title: string;
  date: string;
  imageUrl?: string;
  description?: string;
}

export interface Child {
  id: string;
  name: string;
  dob: string; // ISO date string
  gender: 'Male' | 'Female';
  avatar?: string;
  weight: string;
  height: string;
  headCircumference: string;
  bloodType?: string;
  allergies?: string[];
  teethCount: number;
  vaccines: Vaccine[];
  milestones: Milestone[];
  memories: Memory[];
}

export type ActivityType = 'feeding' | 'sleep' | 'diaper' | 'bath' | 'medical' | 'play' | 'growth';
export type ActivitySubType = 
  | 'breast' | 'bottle' | 'solids' // feeding
  | 'wet' | 'dirty' | 'mixed' // diaper
  | 'medication' | 'symptom' | 'temperature' // medical
  | 'tummy_time' | 'outdoors' | 'reading' // play
  | 'night' | 'nap'; // sleep

export interface Activity {
  id: string;
  type: ActivityType;
  subType?: ActivitySubType;
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  amount?: string; // for feeding (ml)
  side?: 'left' | 'right' | 'both'; // for breastfeeding
  notes?: string;
  mood?: 'happy' | 'neutral' | 'fussy' | 'crying';
}

export interface AppSettings {
  notifications: boolean;
  biometric: boolean;
  darkMode: boolean;
  units: UnitSystem;
  temperatureUnit: TemperatureUnit;
}

export interface Prediction {
  nextSleep?: string;
  nextFeed?: string;
  tip?: string;
  alert?: string;
}

export interface AppState {
  user: User | null;
  child: Child | null;
  activities: Activity[];
  isPremium: boolean;
  prediction: Prediction | null;
  language: Language;
  settings: AppSettings;
  isOnboarded: boolean;
  
  // Actions
  addActivity: (activity: Activity) => void;
  updateActivity: (activity: Activity) => void;
  deleteActivity: (id: string) => void;
  togglePremium: () => void;
  refreshPrediction: () => void;
  setLanguage: (lang: Language) => void;
  updateChild: (updates: Partial<Child>) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  completeOnboarding: (child: Partial<Child>) => void;
  t: (key: string) => string;
}
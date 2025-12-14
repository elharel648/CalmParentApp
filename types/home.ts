/**
 * Types for HomeScreen and related components
 */

export interface ChildProfile {
    id: string;
    name: string;
    birthDate: Date | any;
    ageMonths: number;
    photoUrl?: string;
}

export interface WeatherData {
    temp: number;
    city: string;
    recommendation: string;
    loading: boolean;
    error?: string;
}

export interface MedicationsState {
    vitaminD: boolean;
    iron: boolean;
}

export interface HomeDataState {
    lastFeedTime: string;
    lastSleepTime: string;
    babyStatus: 'sleeping' | 'awake';
    aiTip: string;
    loadingAI: boolean;
}

export type TrackingType = 'food' | 'sleep' | 'diaper' | null;

export type GuardianRole = 'אבא' | 'אמא' | 'סבתא' | 'בייביסיטר';

export interface DynamicStyles {
    bg: string;
    text: string;
    textSub: string;
    aiBg: string;
    aiBorder: string;
    aiTextNight: string;
}

export const DEFAULT_CHILD_PROFILE: ChildProfile = {
    id: '',
    name: 'הבייבי שלי',
    birthDate: new Date(),
    ageMonths: 0,
};

export const GUARDIAN_ROLES: GuardianRole[] = ['אבא', 'אמא', 'סבתא', 'בייביסיטר'];

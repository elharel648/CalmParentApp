/**
 * Types for ProfileScreen and related components
 */

export interface GrowthStats {
    weight?: string;
    height?: string;
    headCircumference?: string;
}

// New: Growth measurement with full history
export interface GrowthMeasurement {
    id: string;
    date: any; // Firebase Timestamp
    weight?: number; // kg
    height?: number; // cm
    headCircumference?: number; // cm
    note?: string;
}

export interface Milestone {
    title: string;
    date: any; // Firebase Timestamp
}

// New: Categorized milestones for developmental tracking
export type MilestoneCategory = 'motor' | 'communication' | 'cognitive' | 'social' | 'other';

export interface CategorizedMilestone {
    id: string;
    category: MilestoneCategory;
    title: string;
    achievedDate?: any; // Firebase Timestamp
    expectedAgeMonths?: number;
    isAchieved: boolean;
    note?: string;
}

export interface CustomVaccine {
    id: string;
    name: string;
    isDone?: boolean;
    date?: string;
}

// New: Photo gallery entry
export interface PhotoEntry {
    id: string;
    url: string; // base64 or storage URL
    date: any; // Firebase Timestamp
    caption?: string;
}

export interface BabyProfileData {
    id: string;
    name: string;
    birthDate: any; // Firebase Timestamp
    gender: 'boy' | 'girl' | 'other';
    parentId: string;
    photoUrl?: string;
    stats?: GrowthStats;
    growthHistory?: GrowthMeasurement[]; // New
    album?: { [month: number]: string };
    photoGallery?: PhotoEntry[]; // New
    milestones?: Milestone[];
    categorizedMilestones?: CategorizedMilestone[]; // New
    vaccines?: { [key: string]: boolean | { isDone: boolean; date: any } };
    customVaccines?: CustomVaccine[];
}

export interface VaccineItem {
    key: string;
    name: string;
}

export interface VaccineGroup {
    ageTitle: string;
    vaccines: VaccineItem[];
}

// Vaccine schedule from Ministry of Health
export const VACCINE_SCHEDULE: VaccineGroup[] = [
    { ageTitle: 'לאחר הלידה', vaccines: [{ key: 'hepB_1', name: 'צהבת B (מנה 1)' }] },
    { ageTitle: 'גיל חודש', vaccines: [{ key: 'hepB_2', name: 'צהבת B (מנה 2)' }] },
    { ageTitle: 'גיל חודשיים', vaccines: [{ key: 'm5_1', name: 'מחומשת (מנה 1)' }, { key: 'prevnar_1', name: 'פרבנר (מנה 1)' }, { key: 'rota_1', name: 'רוטה (מנה 1)' }] },
    { ageTitle: 'גיל 4 חודשים', vaccines: [{ key: 'm5_2', name: 'מחומשת (מנה 2)' }, { key: 'prevnar_2', name: 'פרבנר (מנה 2)' }, { key: 'rota_2', name: 'רוטה (מנה 2)' }] },
    { ageTitle: 'גיל 6 חודשים', vaccines: [{ key: 'm5_3', name: 'מחומשת (מנה 3)' }, { key: 'hepB_3', name: 'צהבת B (מנה 3)' }, { key: 'rota_3', name: 'רוטה (מנה 3)' }] },
    { ageTitle: 'גיל שנה', vaccines: [{ key: 'mmrv_1', name: 'MMRV (מנה 1)' }, { key: 'prevnar_3', name: 'פרבנר (מנה 3)' }] },
];

export interface EditMetricState {
    type: 'weight' | 'height' | 'head';
    value: string;
    title: string;
    unit: string;
}

// Milestone icon config helper
export interface MilestoneConfig {
    icon: any;
    color: [string, string];
    bg: string;
}

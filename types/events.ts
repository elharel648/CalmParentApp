// types/events.ts - Event Types for Firebase Events Collection

import { Timestamp } from 'firebase/firestore';

// ===================
// EVENT TYPES
// ===================

export type EventType = 'food' | 'sleep' | 'diaper' | 'supplement' | 'medication' | 'note';

export type FoodSubType = 'bottle' | 'breast' | 'pumping' | 'solids';
export type DiaperSubType = 'wet' | 'dirty' | 'mixed' | 'dry';
export type SupplementSubType = 'vitaminD' | 'iron' | 'probiotic' | 'other';

// ===================
// EVENT INTERFACES
// ===================

export interface BaseEvent {
    id?: string;
    type: EventType;
    timestamp: Date | Timestamp;
    childId: string;
    userId: string;
    creatorId?: string;
    reporterName?: string;
    note?: string;
}

export interface FoodEvent extends BaseEvent {
    type: 'food';
    subType: FoodSubType;
    amount?: number; // Always in ml
    duration?: number; // In seconds (for breastfeeding)
    side?: 'left' | 'right' | 'both';
}

export interface SleepEvent extends BaseEvent {
    type: 'sleep';
    duration?: number; // In seconds
    startTime?: string;
    endTime?: string;
    quality?: 'good' | 'restless' | 'interrupted';
}

export interface DiaperEvent extends BaseEvent {
    type: 'diaper';
    subType: DiaperSubType;
}

export interface SupplementEvent extends BaseEvent {
    type: 'supplement';
    subType: SupplementSubType;
}

export interface MedicationEvent extends BaseEvent {
    type: 'medication';
    medicationName: string;
    dosage?: string;
}

export interface NoteEvent extends BaseEvent {
    type: 'note';
    title?: string;
}

export type AppEvent = FoodEvent | SleepEvent | DiaperEvent | SupplementEvent | MedicationEvent | NoteEvent;

// ===================
// BABY/CHILD TYPES
// ===================

export interface Baby {
    id: string;
    name: string;
    birthDate: Date | Timestamp;
    gender: 'boy' | 'girl' | 'other';
    parentId: string;
    familyId?: string;
    photoUrl?: string;
    stats?: {
        height?: string;
        weight?: string;
        headCircumference?: string;
    };
    milestones?: Milestone[];
    vaccines?: Record<string, boolean>;
    customVaccines?: CustomVaccine[];
    album?: Record<number, string>;
    albumNotes?: Record<number, string>;
    meds?: MedicationsState;
    medsDate?: string;
}

export interface Milestone {
    title: string;
    date: Date | Timestamp;
    description?: string;
}

export interface CustomVaccine {
    id: string;
    name: string;
    isDone: boolean;
}

export interface MedicationsState {
    vitaminD: boolean;
    iron: boolean;
}

// ===================
// FAMILY TYPES
// ===================

export type FamilyRole = 'admin' | 'member' | 'guest';
export type AccessLevel = 'full' | 'actions_only' | 'view_only';

export interface FamilyMember {
    id?: string;
    role: FamilyRole;
    name: string;
    email: string;
    joinedAt: Date | Timestamp;
    accessLevel: AccessLevel;
    historyAccessDays?: number;
    invitedBy?: string;
    expiresAt?: Date | Timestamp;
}

export interface Family {
    id: string;
    createdBy: string;
    babyId: string;
    babyName: string;
    inviteCode: string;
    members: Record<string, FamilyMember>;
    createdAt: Date | Timestamp;
}

// ===================
// REPORT TYPES
// ===================

export interface DailyStats {
    food: number;
    foodCount: number;
    sleep: number;
    sleepCount: number;
    diapers: number;
    supplements: number;
    feedingTypes: {
        bottle: number;
        breast: number;
        solids: number;
    };
}

export interface WeeklyData {
    labels: string[];
    sleep: number[];
    food: number[];
    diapers: number[];
}

export interface TimeInsights {
    longestSleep: number;
    biggestFeeding: number;
    bestSleepDay: string;
    avgFeedingInterval: number;
    avgSleepTime: string;
}

export interface Comparison {
    sleepChange: number;
    feedingChange: number;
    diaperChange: number;
}

// ===================
// SITTER TYPES
// ===================

export interface Sitter {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone?: string;
    bio?: string;
    experience?: string;
    hourlyRate?: number;
    rating?: number;
    reviewCount?: number;
    photoUrl?: string;
    isApproved: boolean;
    isAvailable: boolean;
    location?: {
        city?: string;
        area?: string;
    };
    certifications?: string[];
    createdAt: Date | Timestamp;
}

export interface Booking {
    id: string;
    parentId: string;
    sitterId: string;
    childId: string;
    date: Date | Timestamp;
    startTime: string;
    endTime: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    totalAmount?: number;
    notes?: string;
    createdAt: Date | Timestamp;
}

// ===================
// UTILITY TYPES
// ===================

export interface FirebaseTimestamp {
    toDate: () => Date;
    seconds: number;
    nanoseconds: number;
}

export function isFirebaseTimestamp(value: unknown): value is FirebaseTimestamp {
    return (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as FirebaseTimestamp).toDate === 'function'
    );
}

export function toDate(value: Date | Timestamp | FirebaseTimestamp | string | null | undefined): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    if (isFirebaseTimestamp(value)) return value.toDate();
    if ('toDate' in value) return (value as Timestamp).toDate();
    return new Date();
}

// ===================
// PARSING HELPERS
// ===================

/**
 * Parse amount string to number (handles "120 מ"ל" -> 120)
 */
export function parseAmount(amount: string | number | undefined | null): number {
    if (amount === undefined || amount === null) return 0;
    if (typeof amount === 'number') return amount;
    const match = amount.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}`;
    }
    return `${minutes} דק'`;
}

/**
 * Format hours with unit
 */
export function formatHours(hours: number): string {
    return `${hours.toFixed(1)} שע'`;
}

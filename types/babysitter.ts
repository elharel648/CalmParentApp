/**
 * Babysitter System Types
 * טיפוסים למערכת בייביסיטרים
 */

import { Timestamp } from 'firebase/firestore';

// ===================
// BABYSITTER PROFILE
// ===================

export type AgeRange = '0-1' | '1-3' | '3-6' | '6+';
export type Certification = 'cpr' | 'first_aid' | 'education' | 'nursing' | 'special_needs';

export interface BabysitterProfile {
    isActive: boolean;
    hourlyRate: number;
    ageRanges: AgeRange[];
    radius: number; // km
    bio: string;
    certifications: Certification[];
    responseTimeMinutes: number; // average
    completedShifts: number;
    repeatFamilies: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ===================
// BOOKING
// ===================

export type BookingStatus =
    | 'pending'      // waiting for babysitter response
    | 'confirmed'    // babysitter accepted
    | 'declined'     // babysitter declined
    | 'active'       // shift in progress
    | 'completed'    // shift ended
    | 'cancelled';   // parent cancelled

export interface BabysitterBooking {
    id: string;
    parentId: string;
    babysitterId: string;
    status: BookingStatus;

    // Scheduled time
    date: Timestamp;
    startTime: string; // "18:00"
    endTime: string;   // "22:00"

    // Actual time (for timer)
    actualStart?: Timestamp;
    actualEnd?: Timestamp;
    pausedMinutes?: number; // total paused time

    // Payment
    hourlyRate: number;
    totalMinutes?: number;
    totalAmount?: number;

    // Meta
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ===================
// ACTIVE SHIFT (Timer Widget)
// ===================

export interface ActiveShift {
    id: string;
    bookingId: string;
    parentId: string;
    babysitterId: string;
    babysitterName: string;
    babysitterPhoto?: string;

    // Timer state
    startedAt: Timestamp;
    isPaused: boolean;
    pausedAt?: Timestamp;
    totalPausedSeconds: number;

    // Rate
    hourlyRate: number;

    // Status
    isActive: boolean;
}

// ===================
// REVIEW
// ===================

export type ReviewTag =
    | 'reliable'
    | 'punctual'
    | 'great_with_babies'
    | 'great_with_toddlers'
    | 'kids_loved_her'
    | 'clean_organized'
    | 'flexible'
    | 'professional';

export interface Review {
    id: string;
    bookingId: string;
    parentId: string;
    babysitterId: string;

    rating: number; // 1-5
    text?: string;
    tags?: ReviewTag[];

    createdAt: Timestamp;
}

// ===================
// CHAT
// ===================

export interface Chat {
    id: string;
    parentId: string;
    babysitterId: string;

    lastMessage?: string;
    lastMessageAt?: Timestamp;
    unreadByParent: number;
    unreadByBabysitter: number;

    createdAt: Timestamp;
}

export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    createdAt: Timestamp;
    readAt?: Timestamp;
}

// ===================
// DISPLAY HELPERS
// ===================

export interface BabysitterCardData {
    id: string;
    name: string;
    photoUrl?: string;
    rating: number;
    reviewCount: number;
    hourlyRate: number;
    distance: number; // km
    responseTime: number; // minutes
    repeatFamilies: number;
    certifications: Certification[];
    isAvailableToday: boolean;
    mutualFriends?: number;
}

export const CERTIFICATION_LABELS: Record<Certification, string> = {
    cpr: 'החייאה',
    first_aid: 'עזרה ראשונה',
    education: 'לימודי חינוך',
    nursing: 'סיעוד',
    special_needs: 'חינוך מיוחד',
};

export const REVIEW_TAG_LABELS: Record<ReviewTag, string> = {
    reliable: 'אמינה',
    punctual: 'דייקנית',
    great_with_babies: 'מצוינת עם תינוקות',
    great_with_toddlers: 'מצוינת עם פעוטות',
    kids_loved_her: 'הילדים אהבו אותה',
    clean_organized: 'מסודרת ונקייה',
    flexible: 'גמישה',
    professional: 'מקצועית',
};

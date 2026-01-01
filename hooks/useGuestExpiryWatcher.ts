/**
 * useGuestExpiryWatcher - Monitors invited guests and removes them when their time expires
 * If the expired guest is a registered babysitter, opens a rating modal
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { revokeGuestAccess } from '../services/familyService';
import { notificationStorageService } from '../services/notificationStorageService';

interface ExpiredGuest {
    guestId: string;
    guestName: string;
    isBabysitter: boolean;
    babysitterProfile?: {
        id: string;
        name: string;
        image?: string;
    };
}

interface UseGuestExpiryWatcherResult {
    expiredGuest: ExpiredGuest | null;
    clearExpiredGuest: () => void;
    checkForExpiredGuests: () => Promise<void>;
}

export const useGuestExpiryWatcher = (familyId: string | null): UseGuestExpiryWatcherResult => {
    const [expiredGuest, setExpiredGuest] = useState<ExpiredGuest | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const processedGuests = useRef<Set<string>>(new Set());

    const checkForExpiredGuests = useCallback(async () => {
        console.log('🕐 GuestExpiry: Starting check... familyId:', familyId, 'currentUser:', auth.currentUser?.uid);

        if (!familyId || !auth.currentUser) {
            console.log('🕐 GuestExpiry: Skipping - no familyId or currentUser');
            return;
        }

        try {
            const familyDoc = await getDoc(doc(db, 'families', familyId));
            if (!familyDoc.exists()) {
                console.log('🕐 GuestExpiry: Family doc not found');
                return;
            }

            const familyData = familyDoc.data();
            const members = familyData.members || {};
            const currentUserId = auth.currentUser.uid;

            console.log('🕐 GuestExpiry: Found members:', Object.keys(members));
            console.log('🕐 GuestExpiry: Current user role:', members[currentUserId]?.role);

            // Only the family admin checks for expired guests
            if (members[currentUserId]?.role !== 'admin') {
                console.log('🕐 GuestExpiry: Skipping - current user is not admin');
                return;
            }

            const now = new Date();
            console.log('🕐 GuestExpiry: Current time:', now.toISOString());

            for (const [memberId, memberData] of Object.entries(members)) {
                const member = memberData as any;
                console.log('🕐 GuestExpiry: Checking member:', memberId, 'role:', member.role, 'expiresAt:', member.expiresAt);

                // Skip non-guests or already processed
                if (member.role !== 'guest') continue;
                if (processedGuests.current.has(memberId)) {
                    console.log('🕐 GuestExpiry: Already processed, skipping');
                    continue;
                }

                // Check if guest has expiresAt and if it's expired
                if (!member.expiresAt) {
                    console.log('🕐 GuestExpiry: No expiresAt field');
                    continue;
                }

                const expiresAt = member.expiresAt?.toDate ? member.expiresAt.toDate() : new Date(member.expiresAt);
                console.log('🕐 GuestExpiry: Parsed expiresAt:', expiresAt.toISOString(), 'now:', now.toISOString(), 'expired:', now > expiresAt);

                if (now > expiresAt) {
                    console.log('🕐 GuestExpiry: 🚨 EXPIRED! Removing guest:', member.name);

                    // Get babysitter status from member data (saved when guest joined)
                    const isBabysitter = member.isBabysitter === true;
                    console.log('🕐 GuestExpiry: isBabysitter:', isBabysitter);

                    // Remove guest from family
                    const removed = await revokeGuestAccess(memberId, familyId);

                    if (removed) {
                        // Only mark as processed AFTER successful removal
                        processedGuests.current.add(memberId);
                        console.log('🕐 GuestExpiry: Guest removed from family!');

                        // Always send notification to the guest that their access ended
                        try {
                            await notificationStorageService.sendNotificationToUser(
                                memberId,
                                'guest_access_ended',
                                'סיום גישת אורח',
                                'הגישה שלך כאורח הסתיימה. תודה על העזרה! 💜'
                            );
                            console.log('🕐 GuestExpiry: Notification sent to guest');
                        } catch (notifError) {
                            console.log('🕐 GuestExpiry: Could not send notification to guest:', notifError);
                        }

                        // If babysitter, trigger rating popup for the admin
                        if (isBabysitter) {
                            console.log('🕐 GuestExpiry: Opening rating modal for babysitter');
                            setExpiredGuest({
                                guestId: memberId,
                                guestName: member.name || 'בייביסיטר',
                                isBabysitter: true,
                                babysitterProfile: {
                                    id: memberId,
                                    name: member.name || 'בייביסיטר',
                                    image: member.photoURL || undefined,
                                }
                            });
                        } else {
                            // Just notify about regular guest removal
                            console.log('🕐 GuestExpiry: Showing alert for regular guest');
                            Alert.alert(
                                'סיום גישת אורח',
                                `הגישה של ${member.name || 'האורח'} הסתיימה.`
                            );
                        }

                        // Only handle one expired guest at a time
                        break;
                    } else {
                        console.log('🕐 GuestExpiry: Failed to remove guest, will retry next check');
                    }
                }
            }
        } catch (error) {
            console.log('🕐 GuestExpiry: ERROR:', error);
        }
    }, [familyId]);

    const clearExpiredGuest = useCallback(() => {
        setExpiredGuest(null);
    }, []);

    // Start periodic check
    useEffect(() => {
        if (!familyId) return;

        // Initial check
        checkForExpiredGuests();

        // Check every 30 seconds
        intervalRef.current = setInterval(checkForExpiredGuests, 30 * 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [familyId, checkForExpiredGuests]);

    return {
        expiredGuest,
        clearExpiredGuest,
        checkForExpiredGuests,
    };
};

export default useGuestExpiryWatcher;

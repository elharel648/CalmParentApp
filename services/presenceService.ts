// presenceService.ts - Real-time presence tracking for family members
import { doc, setDoc, onSnapshot, serverTimestamp, getDoc, updateDoc, Unsubscribe } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { AppState, AppStateStatus } from 'react-native';

// --- Types ---
export interface FamilyMemberPresence {
    isOnline: boolean;
    lastSeen: Date | null;
    userId: string;
    name: string;
}

// --- Helper ---
const getCurrentUserId = (): string | null => {
    return auth.currentUser?.uid || null;
};

// --- Set user as online ---
export const setUserOnline = async (familyId: string): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId || !familyId) return;

    try {
        const presenceRef = doc(db, 'families', familyId, 'presence', userId);
        await setDoc(presenceRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
            userId,
            name: auth.currentUser?.displayName || 'משתמש',
        }, { merge: true });
    } catch {
        // Silently fail
    }
};

// --- Set user as offline ---
export const setUserOffline = async (familyId: string): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId || !familyId) return;

    try {
        const presenceRef = doc(db, 'families', familyId, 'presence', userId);
        await updateDoc(presenceRef, {
            isOnline: false,
            lastSeen: serverTimestamp(),
        });
    } catch {
        // Silently fail
    }
};

// --- Subscribe to family presence (real-time) ---
export const subscribeToFamilyPresence = (
    familyId: string,
    callback: (members: FamilyMemberPresence[]) => void
): Unsubscribe => {
    if (!familyId) {
        callback([]);
        return () => { };
    }

    // Listen to the family document's members
    const familyRef = doc(db, 'families', familyId);

    return onSnapshot(familyRef, async (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }

        const familyData = snapshot.data();
        const members = familyData.members || {};
        const memberIds = Object.keys(members);

        // Get presence for each member
        const presencePromises = memberIds.map(async (memberId) => {
            try {
                const presenceRef = doc(db, 'families', familyId, 'presence', memberId);
                const presenceSnap = await getDoc(presenceRef);

                if (presenceSnap.exists()) {
                    const data = presenceSnap.data();
                    return {
                        userId: memberId,
                        name: members[memberId]?.name || 'משתמש',
                        isOnline: data.isOnline || false,
                        lastSeen: data.lastSeen?.toDate() || null,
                    };
                } else {
                    return {
                        userId: memberId,
                        name: members[memberId]?.name || 'משתמש',
                        isOnline: false,
                        lastSeen: null,
                    };
                }
            } catch {
                return {
                    userId: memberId,
                    name: members[memberId]?.name || 'משתמש',
                    isOnline: false,
                    lastSeen: null,
                };
            }
        });

        const presenceList = await Promise.all(presencePromises);
        callback(presenceList);
    });
};

// --- Auto-manage presence based on app state ---
export const setupPresenceListener = (familyId: string): (() => void) => {
    if (!familyId) return () => { };

    // Set online immediately
    setUserOnline(familyId);

    // Listen to app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            setUserOnline(familyId);
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            setUserOffline(familyId);
        }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Return cleanup function
    return () => {
        subscription.remove();
        setUserOffline(familyId);
    };
};

export default {
    setUserOnline,
    setUserOffline,
    subscribeToFamilyPresence,
    setupPresenceListener,
};

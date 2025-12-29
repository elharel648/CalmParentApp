import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { AccessLevel, FamilyRole } from '../services/familyService';

// --- Types ---
export interface ActiveChild {
    childId: string;
    childName: string;
    photoUrl?: string;
    role: 'parent' | 'guest';
    accessLevel: AccessLevel;
    familyId?: string;
}

interface ActiveChildContextType {
    // State
    activeChild: ActiveChild | null;
    allChildren: ActiveChild[];
    isLoading: boolean;

    // Computed permissions
    isGuest: boolean;
    isParent: boolean;
    canAccessReports: boolean;
    canAccessProfile: boolean;
    canAccessBabysitter: boolean;

    // Actions
    setActiveChild: (child: ActiveChild) => void;
    refreshChildren: () => Promise<void>;
}

const ActiveChildContext = createContext<ActiveChildContextType | null>(null);

// --- Provider ---
interface ActiveChildProviderProps {
    children: ReactNode;
}

export const ActiveChildProvider: React.FC<ActiveChildProviderProps> = ({ children }) => {
    const [activeChild, setActiveChildState] = useState<ActiveChild | null>(null);
    const [allChildren, setAllChildren] = useState<ActiveChild[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Ref to track activeChild without causing refreshChildren to recreate
    // This fixes the infinite loop when joining with code
    const activeChildRef = useRef<ActiveChild | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        activeChildRef.current = activeChild;
    }, [activeChild]);

    // Computed permissions based on current role AND having a child profile
    // Hide tabs if: (1) user is a guest, OR (2) user has no baby profiles
    const isGuest = activeChild?.role === 'guest';
    const hasAnyChild = allChildren.length > 0;
    const isParent = !isGuest && hasAnyChild;
    const canAccessReports = !isGuest && hasAnyChild; // Need child + not guest
    const canAccessProfile = !isGuest && hasAnyChild; // Need child + not guest
    const canAccessBabysitter = !isGuest && hasAnyChild; // Need child + not guest

    // Load all children (own + guest access)
    const refreshChildren = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setAllChildren([]);
            setActiveChildState(null);
            setIsLoading(false);
            return;
        }

        try {
            const childrenList: ActiveChild[] = [];

            // 1. First check: Find babies directly by parentId (works even without family)
            const babiesQuery = query(
                collection(db, 'babies'),
                where('parentId', '==', userId)
            );
            const babiesSnapshot = await getDocs(babiesQuery);

            if (!babiesSnapshot.empty) {
                babiesSnapshot.forEach((babyDoc) => {
                    const babyData = babyDoc.data();
                    // Check if not already added
                    if (!childrenList.find(c => c.childId === babyDoc.id)) {
                        childrenList.push({
                            childId: babyDoc.id,
                            childName: babyData.name || 'תינוק',
                            photoUrl: babyData.photoUrl,
                            role: 'parent',
                            accessLevel: 'full',
                            familyId: undefined,
                        });
                    }
                });
            }

            // 2. Also check via family (for shared family access)
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.data();

            if (userData?.familyId) {
                const familyDoc = await getDoc(doc(db, 'families', userData.familyId));
                if (familyDoc.exists()) {
                    const familyData = familyDoc.data();
                    const memberData = familyData.members?.[userId];
                    const isAdmin = memberData?.role === 'admin';

                    // Get baby info
                    if (familyData.babyId && !childrenList.find(c => c.childId === familyData.babyId)) {
                        const babyDoc = await getDoc(doc(db, 'babies', familyData.babyId));
                        const babyData = babyDoc.exists() ? babyDoc.data() : null;

                        childrenList.push({
                            childId: familyData.babyId,
                            childName: babyData?.name || familyData.babyName || 'תינוק',
                            photoUrl: babyData?.photoUrl,
                            role: isAdmin ? 'parent' : (memberData?.role === 'guest' ? 'guest' : 'parent'),
                            accessLevel: memberData?.accessLevel || (isAdmin ? 'full' : 'actions_only'),
                            familyId: userData.familyId,
                        });
                    }
                }
            }

            // 2. Get guest access children
            if (userData?.guestAccess) {
                for (const [familyId, guestInfo] of Object.entries(userData.guestAccess as Record<string, any>)) {
                    try {
                        // Check if access hasn't expired - safely handle different date formats
                        if (guestInfo?.expiresAt) {
                            const expirationDate = guestInfo.expiresAt.toDate ?
                                guestInfo.expiresAt.toDate() :
                                new Date(guestInfo.expiresAt);
                            if (expirationDate < new Date()) {
                                continue; // Skip expired access
                            }
                        }

                        const familyDoc = await getDoc(doc(db, 'families', familyId));
                        if (familyDoc.exists()) {
                            const familyData = familyDoc.data();

                            // Skip if no babyId in family
                            if (!familyData?.babyId) {
                                continue;
                            }

                            const babyDoc = await getDoc(doc(db, 'babies', familyData.babyId));
                            const babyData = babyDoc.exists() ? babyDoc.data() : null;

                            childrenList.push({
                                childId: familyData.babyId,
                                childName: babyData?.name || familyData.babyName || 'תינוק',
                                photoUrl: babyData?.photoUrl,
                                role: 'guest',
                                accessLevel: 'actions_only',
                                familyId,
                            });
                        }
                    } catch (err) {
                        if (__DEV__) console.warn('Error loading guest family:', familyId, err);
                        // Continue to next family, don't crash
                    }
                }
            }

            setAllChildren(childrenList);

            // Set active child to first one if not already set
            // Using ref to avoid infinite loop (ref doesn't cause callback recreation)
            if (childrenList.length > 0 && !activeChildRef.current) {
                setActiveChildState(childrenList[0]);
                activeChildRef.current = childrenList[0];
            }

        } catch (error) {
            if (__DEV__) console.log('Error loading children:', error);
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty deps - uses ref instead of state to avoid infinite loop

    // Listen to auth state and refresh
    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setIsLoading(false);
            return;
        }

        // Initial load
        refreshChildren();

        // Listen to user document changes
        const unsubscribe = onSnapshot(doc(db, 'users', userId), () => {
            refreshChildren();
        });

        return () => unsubscribe();
    }, [refreshChildren]);

    const setActiveChild = useCallback((child: ActiveChild) => {
        setActiveChildState(child);
    }, []);

    return (
        <ActiveChildContext.Provider
            value={{
                activeChild,
                allChildren,
                isLoading,
                isGuest,
                isParent,
                canAccessReports,
                canAccessProfile,
                canAccessBabysitter,
                setActiveChild,
                refreshChildren,
            }}
        >
            {children}
        </ActiveChildContext.Provider>
    );
};

// --- Hook ---
export const useActiveChild = (): ActiveChildContextType => {
    const context = useContext(ActiveChildContext);
    if (!context) {
        throw new Error('useActiveChild must be used within an ActiveChildProvider');
    }
    return context;
};

export default ActiveChildContext;

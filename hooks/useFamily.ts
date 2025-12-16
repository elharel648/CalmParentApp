import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
    Family,
    FamilyMember,
    FamilyRole,
    createFamily,
    joinFamily,
    leaveFamily,
    removeMember,
    regenerateInviteCode,
    updateMemberRole,
} from '../services/familyService';
import { auth, db } from '../services/firebaseConfig';

interface UseFamilyReturn {
    family: Family | null;
    members: FamilyMember[];
    isLoading: boolean;
    isAdmin: boolean;
    canEdit: boolean;
    myRole: FamilyRole | null;
    inviteCode: string | null;

    // Actions
    create: (babyId: string, babyName: string) => Promise<boolean>;
    join: (code: string) => Promise<{ success: boolean; message: string }>;
    leave: () => Promise<boolean>;
    remove: (userId: string) => Promise<boolean>;
    refreshInviteCode: () => Promise<string | null>;
    changeRole: (userId: string, role: FamilyRole) => Promise<boolean>;
    refresh: () => Promise<void>;
}

export const useFamily = (): UseFamilyReturn => {
    const [family, setFamily] = useState<Family | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Listen to User Document changes AND Family Document changes
    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setIsLoading(false);
            return;
        }

        let unsubscribeFamily: (() => void) | null = null;

        // 1. Listen to User Document (to get familyId)
        const unsubscribeUser = onSnapshot(doc(db, 'users', userId), (userSnap) => {
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const familyId = userData?.familyId;

                if (familyId) {
                    // 2. If user has family, listen to Family Document
                    // If we are already listening to this family, do nothing? 
                    // Ideally we should check if familyId changed.

                    // Simple approach: Always re-subscribe if familyId is found
                    // (Optimization: check if familyId !== currentFamilyId)

                    if (unsubscribeFamily) {
                        unsubscribeFamily();
                    }

                    unsubscribeFamily = onSnapshot(doc(db, 'families', familyId), (familySnap) => {
                        if (familySnap.exists()) {
                            const familyData = familySnap.data() as Family;
                            setFamily({ ...familyData, id: familySnap.id });
                        } else {
                            setFamily(null);
                        }
                        setIsLoading(false);
                    }, (error) => {
                        console.error('Error listening to family doc:', error);
                        setIsLoading(false);
                    });
                } else {
                    // User has no family
                    if (unsubscribeFamily) {
                        unsubscribeFamily();
                        unsubscribeFamily = null;
                    }
                    setFamily(null);
                    setIsLoading(false);
                }
            } else {
                setFamily(null);
                setIsLoading(false);
            }
        }, (error) => {
            console.error('Error listening to user doc:', error);
            setIsLoading(false);
        });

        return () => {
            unsubscribeUser();
            if (unsubscribeFamily) unsubscribeFamily();
        };
    }, []);

    // Derived values
    const userId = auth.currentUser?.uid;
    const myRole = userId && family?.members[userId]?.role || null;
    const isAdmin = myRole === 'admin';
    const canEdit = myRole === 'admin' || myRole === 'member';
    const inviteCode = family?.inviteCode || null;

    const members: FamilyMember[] = family
        ? Object.entries(family.members).map(([id, member]) => ({
            ...member,
            id,
        } as FamilyMember))
        : [];

    // Actions
    const create = useCallback(async (babyId: string, babyName: string): Promise<boolean> => {
        const newFamily = await createFamily(babyId, babyName);
        return !!newFamily;
    }, []);

    const join = useCallback(async (code: string) => {
        const result = await joinFamily(code);
        return { success: result.success, message: result.message };
    }, []);

    const leave = useCallback(async (): Promise<boolean> => {
        const success = await leaveFamily();
        if (success) setFamily(null);
        return success;
    }, []);

    const remove = useCallback(async (memberUserId: string): Promise<boolean> => {
        return await removeMember(memberUserId);
    }, []);

    const refreshInviteCode = useCallback(async (): Promise<string | null> => {
        return await regenerateInviteCode();
    }, []);

    const changeRole = useCallback(async (memberUserId: string, role: FamilyRole): Promise<boolean> => {
        return await updateMemberRole(memberUserId, role);
    }, []);

    const refresh = useCallback(async () => {
        // No-op: handled by real-time listeners
    }, []);

    return {
        family,
        members,
        isLoading,
        isAdmin,
        canEdit,
        myRole,
        inviteCode,
        create,
        join,
        leave,
        remove,
        refreshInviteCode,
        changeRole,
        refresh,
    };
};

export default useFamily;

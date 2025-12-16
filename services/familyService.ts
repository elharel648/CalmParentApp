import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    deleteField,
    serverTimestamp,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

// --- Types ---
export type FamilyRole = 'admin' | 'member' | 'viewer' | 'guest';
export type AccessLevel = 'full' | 'actions_only';

export interface FamilyMember {
    id?: string; // Added when mapping from members object
    role: FamilyRole;
    name: string;
    email: string;
    joinedAt: Date;
    accessLevel: AccessLevel; // 'full' for parent/member, 'actions_only' for guest
    historyAccessDays?: number; // -1 or undefined for unlimited, otherwise number of days back
    invitedBy?: string; // userId of who invited this member
    expiresAt?: Date; // Optional expiration for temporary guest access
}

export interface Family {
    id: string;
    createdBy: string;
    babyId: string;
    babyName: string;
    inviteCode: string;
    members: Record<string, FamilyMember>;
    createdAt: Date;
}

// --- Helper Functions ---

// Generate a random 6-digit invite code
const generateInviteCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get current user ID
const getCurrentUserId = (): string | null => {
    return auth.currentUser?.uid || null;
};

// --- Family Service ---

/**
 * Create a new family for the current user's baby
 */
export const createFamily = async (babyId: string, babyName: string): Promise<Family | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    const user = auth.currentUser;
    if (!user) return null;

    try {
        // Check if user already has a family
        const existingFamily = await getMyFamily();
        if (existingFamily) {
            return existingFamily;
        }

        const familyId = `family_${userId}_${Date.now()}`;
        const inviteCode = generateInviteCode();

        const familyData: Omit<Family, 'id'> = {
            createdBy: userId,
            babyId,
            babyName,
            inviteCode,
            members: {
                [userId]: {
                    role: 'admin',
                    name: user.displayName || 'Admin',
                    email: user.email || '',
                    joinedAt: new Date(),
                    accessLevel: 'full',
                }
            },
            createdAt: new Date(),
        };

        await setDoc(doc(db, 'families', familyId), {
            ...familyData,
            createdAt: serverTimestamp(),
            [`members.${userId}.joinedAt`]: serverTimestamp(),
        });

        // Update user's familyId
        await updateDoc(doc(db, 'users', userId), {
            familyId,
        });

        return { id: familyId, ...familyData };
    } catch (error) {
        if (__DEV__) console.log('Error creating family:', error);
        return null;
    }
};

/**
 * Get the current user's family
 */
export const getMyFamily = async (): Promise<Family | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
        // First check user's familyId
        const userDoc = await getDoc(doc(db, 'users', userId));
        const familyId = userDoc.data()?.familyId;

        if (familyId) {
            const familyDoc = await getDoc(doc(db, 'families', familyId));
            if (familyDoc.exists()) {
                return { id: familyDoc.id, ...familyDoc.data() } as Family;
            }
        }

        // Fallback: search for family where user is a member
        const q = query(
            collection(db, 'families'),
            where(`members.${userId}.role`, 'in', ['admin', 'member', 'viewer'])
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Family;
        }

        return null;
    } catch (error) {
        if (__DEV__) console.log('Error getting family:', error);
        return null;
    }
};

/**
 * Join a family using invite code
 * If user is already in a family, they will leave it and join the new one
 */
export const joinFamily = async (inviteCode: string, role: FamilyRole = 'member'): Promise<{ success: boolean; message: string; family?: Family }> => {
    const userId = getCurrentUserId();
    if (!userId) return { success: false, message: 'יש להתחבר למערכת' };

    const user = auth.currentUser;
    if (!user) return { success: false, message: 'יש להתחבר למערכת' };

    try {
        // Find family by invite code first
        const q = query(
            collection(db, 'families'),
            where('inviteCode', '==', inviteCode.trim())
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: false, message: 'קוד הזמנה לא תקין' };
        }

        const familyDoc = snapshot.docs[0];
        const familyId = familyDoc.id;
        const familyData = familyDoc.data() as Family;

        // Check if already a member of THIS family
        if (familyData.members && familyData.members[userId]) {
            return { success: false, message: 'אתה כבר חלק מהמשפחה הזו' };
        }



        // Check if in a different family - leave it first
        const existingFamily = await getMyFamily();
        if (existingFamily && existingFamily.id !== familyId) {
            // Leave current family silently
            await leaveFamily();
        }

        // Add user to new family
        await updateDoc(doc(db, 'families', familyId), {
            [`members.${userId}`]: {
                role,
                name: user.displayName || 'משתמש חדש',
                email: user.email || '',
                joinedAt: serverTimestamp(),
                accessLevel: role === 'guest' ? 'actions_only' : 'full',
            }
        });

        // Update user's familyId (use setDoc with merge in case user doc doesn't exist)
        await setDoc(doc(db, 'users', userId), {
            familyId,
        }, { merge: true });

        return {
            success: true,
            message: `הצטרפת למשפחת ${familyData.babyName}! 🎉`,
            family: { id: familyId, ...familyData }
        };
    } catch (error) {
        if (__DEV__) console.log('Error joining family:', error);
        return { success: false, message: 'שגיאה בהצטרפות למשפחה' };
    }
};

/**
 * Leave a family
 */
export const leaveFamily = async (): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        const family = await getMyFamily();
        if (!family) return false;

        // Can't leave if you're the only admin
        const admins = Object.entries(family.members).filter(([_, m]) => m.role === 'admin');
        if (admins.length === 1 && admins[0][0] === userId) {
            // Transfer admin to another member or delete family
            const otherMembers = Object.keys(family.members).filter(id => id !== userId);
            if (otherMembers.length > 0) {
                // Transfer admin to first other member
                await updateDoc(doc(db, 'families', family.id), {
                    [`members.${otherMembers[0]}.role`]: 'admin',
                });
            }
        }

        // Remove user from family
        await updateDoc(doc(db, 'families', family.id), {
            [`members.${userId}`]: deleteField(),
        });

        // Remove familyId from user
        await updateDoc(doc(db, 'users', userId), {
            familyId: deleteField(),
        });

        return true;
    } catch (error) {
        if (__DEV__) console.log('Error leaving family:', error);
        return false;
    }
};

/**
 * Remove a member from the family (admin only)
 */
export const removeMember = async (memberUserId: string): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        const family = await getMyFamily();
        if (!family) return false;

        // Check if current user is admin
        if (family.members[userId]?.role !== 'admin') {
            return false;
        }

        // Can't remove yourself
        if (memberUserId === userId) return false;

        // Remove member
        await updateDoc(doc(db, 'families', family.id), {
            [`members.${memberUserId}`]: deleteField(),
        });

        // Remove familyId from removed user
        await updateDoc(doc(db, 'users', memberUserId), {
            familyId: deleteField(),
        });

        return true;
    } catch (error) {
        if (__DEV__) console.log('Error removing member:', error);
        return false;
    }
};

/**
 * Regenerate invite code (admin only)
 */
export const regenerateInviteCode = async (): Promise<string | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
        const family = await getMyFamily();
        if (!family) return null;

        if (family.members[userId]?.role !== 'admin') {
            return null;
        }

        const newCode = generateInviteCode();
        await updateDoc(doc(db, 'families', family.id), {
            inviteCode: newCode,
        });

        return newCode;
    } catch (error) {
        if (__DEV__) console.log('Error regenerating invite code:', error);
        return null;
    }
};

/**
 * Update member role (admin only)
 */
export const updateMemberRole = async (memberUserId: string, newRole: FamilyRole): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        const family = await getMyFamily();
        if (!family) return false;

        if (family.members[userId]?.role !== 'admin') {
            return false;
        }

        await updateDoc(doc(db, 'families', family.id), {
            [`members.${memberUserId}.role`]: newRole,
        });

        return true;
    } catch (error) {
        if (__DEV__) console.log('Error updating member role:', error);
        return false;
    }
};

/**
 * Subscribe to family updates (real-time)
 */
export const subscribeToFamily = (
    familyId: string,
    callback: (family: Family | null) => void
): Unsubscribe => {
    return onSnapshot(doc(db, 'families', familyId), (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as Family);
        } else {
            callback(null);
        }
    });
};

/**
 * Get family members with their roles
 */
export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
    const family = await getMyFamily();
    if (!family) return [];

    return Object.entries(family.members).map(([userId, member]) => ({
        ...member,
        id: userId,
    }));
};

/**
 * Check if current user is admin
 */
export const isAdmin = async (): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    const family = await getMyFamily();
    if (!family) return false;

    return family.members[userId]?.role === 'admin';
};

/**
 * Check if current user can edit (admin or member)
 */
export const canEdit = async (): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    const family = await getMyFamily();
    if (!family) return true; // No family = single user, can edit

    const role = family.members[userId]?.role;
    return role === 'admin' || role === 'member';
};

// --- Guest Invitation System ---

/**
 * Create a guest invite code for a specific child
 * @param childId - The baby/child ID to grant access to
 * @param familyId - The family ID
 * @param expiresInHours - Hours until code expires (default 24)
 * @returns The invite code and expiration date
 */
export const createGuestInvite = async (
    childId: string,
    familyId: string,
    expiresInHours: number = 24
): Promise<{ code: string; expiresAt: Date } | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
        // SECURITY CHECK: Verify user is admin/member of this family
        const familyDoc = await getDoc(doc(db, 'families', familyId));
        if (!familyDoc.exists()) {
            console.error('Family not found');
            return null;
        }

        const familyData = familyDoc.data();
        const memberRole = familyData.members?.[userId]?.role;

        // Only admin or member can create invites (not guest or viewer)
        if (memberRole !== 'admin' && memberRole !== 'member') {
            console.error('User not authorized to create invites');
            return null;
        }

        // Generate a unique 6-digit code with collision check
        let code = generateInviteCode();
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            const existingInvite = await getDoc(doc(db, 'invites', code));
            if (!existingInvite.exists()) break;
            code = generateInviteCode();
            attempts++;
        }

        if (attempts >= maxAttempts) {
            console.error('Failed to generate unique invite code');
            return null;
        }

        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        // Store the invite in Firestore
        await setDoc(doc(db, 'invites', code), {
            code,
            familyId,
            childId,
            createdBy: userId,
            createdAt: serverTimestamp(),
            expiresAt,
            type: 'guest',
            used: false,
        });

        return { code, expiresAt };
    } catch (error) {
        console.error('Error creating guest invite:', error);
        return null;
    }
};

/**
 * Join as a guest using an invite code
 * @param inviteCode - The 6-digit invite code
 * @returns Result with success status and child info
 */
export const joinAsGuest = async (
    inviteCode: string
): Promise<{ success: boolean; message: string; childId?: string; familyId?: string }> => {
    const userId = getCurrentUserId();
    if (!userId) return { success: false, message: 'יש להתחבר למערכת' };

    const user = auth.currentUser;
    if (!user) return { success: false, message: 'יש להתחבר למערכת' };

    try {
        // Find the invite
        const inviteDoc = await getDoc(doc(db, 'invites', inviteCode.trim()));

        if (!inviteDoc.exists()) {
            return { success: false, message: 'קוד הזמנה לא תקין' };
        }

        const inviteData = inviteDoc.data();

        // Check if invite is expired
        const expiresAt = inviteData.expiresAt?.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);
        if (new Date() > expiresAt) {
            return { success: false, message: 'קוד ההזמנה פג תוקף' };
        }

        // Check if invite was already used
        if (inviteData.used) {
            return { success: false, message: 'קוד ההזמנה כבר נוצל' };
        }

        const { familyId, childId } = inviteData;

        // SECURITY: Prevent self-invite
        if (inviteData.createdBy === userId) {
            return { success: false, message: 'לא ניתן להצטרף להזמנה שיצרת בעצמך' };
        }

        // SECURITY: Verify family exists
        const familyDoc = await getDoc(doc(db, 'families', familyId));
        if (!familyDoc.exists()) {
            return { success: false, message: 'המשפחה לא נמצאה' };
        }

        const familyData = familyDoc.data();

        // SECURITY: Check if already a member
        if (familyData.members?.[userId]) {
            return { success: false, message: 'אתה כבר חלק מהמשפחה הזו' };
        }

        // Add guest to family with limited access
        await updateDoc(doc(db, 'families', familyId), {
            [`members.${userId}`]: {
                role: 'guest',
                name: user.displayName || 'אורח',
                email: user.email || '',
                joinedAt: serverTimestamp(),
                accessLevel: 'actions_only',
                invitedBy: inviteData.createdBy,
            }
        });

        // Update user's guestAccess field
        await setDoc(doc(db, 'users', userId), {
            guestAccess: {
                [familyId]: {
                    role: 'guest',
                    childId,
                    accessLevel: 'actions_only',
                    joinedAt: serverTimestamp(),
                }
            }
        }, { merge: true });

        // Mark invite as used
        await updateDoc(doc(db, 'invites', inviteCode), {
            used: true,
            usedBy: userId,
            usedAt: serverTimestamp(),
        });

        // Get child name for success message
        const childDoc = await getDoc(doc(db, 'babies', childId));
        const childName = childDoc.exists() ? childDoc.data()?.name || 'התינוק' : 'התינוק';

        return {
            success: true,
            message: `הצטרפת כאורח ל${childName}! 🎉`,
            childId,
            familyId,
        };
    } catch (error) {
        console.error('Error joining as guest:', error);
        return { success: false, message: 'שגיאה בהצטרפות' };
    }
};

/**
 * Revoke guest access for a user
 */
export const revokeGuestAccess = async (guestUserId: string, familyId: string): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        // Verify caller is admin
        const family = await getMyFamily();
        if (!family || family.members[userId]?.role !== 'admin') {
            return false;
        }

        // Remove from family members
        await updateDoc(doc(db, 'families', familyId), {
            [`members.${guestUserId}`]: deleteField()
        });

        // Remove from user's guestAccess
        await updateDoc(doc(db, 'users', guestUserId), {
            [`guestAccess.${familyId}`]: deleteField()
        });

        return true;
    } catch (error) {
        console.error('Error revoking guest access:', error);
        return false;
    }
};

export default {
    createFamily,
    getMyFamily,
    joinFamily,
    leaveFamily,
    removeMember,
    regenerateInviteCode,
    updateMemberRole,
    subscribeToFamily,
    getFamilyMembers,
    isAdmin,
    canEdit,
    createGuestInvite,
    joinAsGuest,
    revokeGuestAccess,
};

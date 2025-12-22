import { useState, useCallback, useEffect } from 'react';
import { auth } from '../services/firebaseConfig';
import { isPremiumUser, getMaxSharedUsers } from '../services/subscriptionService';
import { GuardianRole, GUARDIAN_ROLES } from '../types/home';

interface UseGuardianReturn {
    currentGuardian: GuardianRole;
    setCurrentGuardian: (role: GuardianRole) => void;
    availableRoles: GuardianRole[];
    isPremium: boolean;
    maxSharedUsers: number;
}

/**
 * Custom hook for guardian/shift management
 */
export const useGuardian = (): UseGuardianReturn => {
    const [currentGuardian, setCurrentGuardian] = useState<GuardianRole>('אבא');
    const [isPremium, setIsPremium] = useState(false);
    const [maxSharedUsers, setMaxSharedUsers] = useState(2);

    const user = auth.currentUser;

    const fetchSubscriptionData = useCallback(async () => {
        if (!user) return;

        try {
            const premium = await isPremiumUser(user.uid);
            setIsPremium(premium);

            const maxUsers = await getMaxSharedUsers(user.uid);
            setMaxSharedUsers(maxUsers);
        } catch (e) {
            if (__DEV__) console.log('Subscription fetch error:', e);
        }
    }, [user]);

    useEffect(() => {
        fetchSubscriptionData();
    }, [fetchSubscriptionData]);

    const availableRoles = GUARDIAN_ROLES.slice(0, maxSharedUsers);

    return {
        currentGuardian,
        setCurrentGuardian,
        availableRoles,
        isPremium,
        maxSharedUsers,
    };
};

export default useGuardian;

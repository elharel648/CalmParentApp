import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../services/firebaseConfig';
import { getChildProfile } from '../services/firebaseService';
import { ChildProfile, DEFAULT_CHILD_PROFILE } from '../types/home';

interface UseChildProfileReturn {
    profile: ChildProfile;
    greeting: string;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Custom hook for managing child profile data
 * Uses useFocusEffect to refresh data when screen comes into focus
 */
export const useChildProfile = (): UseChildProfileReturn => {
    const [profile, setProfile] = useState<ChildProfile>(DEFAULT_CHILD_PROFILE);
    const [greeting, setGreeting] = useState('שלום');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const user = auth.currentUser;

    const calculateGreeting = useCallback(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'בוקר טוב';
        if (hour >= 12 && hour < 18) return 'צהריים טובים';
        return 'ערב טוב';
    }, []);

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            setGreeting(calculateGreeting());

            const fetchedProfile = await getChildProfile(user.uid);

            if (fetchedProfile) {
                const now = new Date();
                const months =
                    (now.getFullYear() - fetchedProfile.birthDate.getFullYear()) * 12 +
                    (now.getMonth() - fetchedProfile.birthDate.getMonth());

                setProfile({
                    id: fetchedProfile.childId,
                    name: fetchedProfile.name,
                    birthDate: fetchedProfile.birthDate,
                    ageMonths: Math.max(0, months),
                    photoUrl: fetchedProfile.photoUrl || undefined,
                    parentId: fetchedProfile.parentId,
                });
            }
        } catch (e) {
            console.error('Error loading profile:', e);
            setError('שגיאה בטעינת הפרופיל');
        } finally {
            setLoading(false);
        }
    }, [user, calculateGreeting]);

    // Refresh profile data every time the screen comes into focus
    // This ensures instant updates when returning from ProfileScreen
    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [fetchProfile])
    );

    return {
        profile,
        greeting,
        loading,
        error,
        refresh: fetchProfile,
    };
};

export default useChildProfile;

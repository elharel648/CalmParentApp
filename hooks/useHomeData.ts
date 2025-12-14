import { useState, useCallback } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { getLastEvent, formatTimeFromTimestamp, getRecentHistory } from '../services/firebaseService';
import { getAIPrediction } from '../services/geminiService';
import { HomeDataState } from '../types/home';

interface UseHomeDataReturn extends HomeDataState {
    toggleBabyStatus: () => void;
    generateInsight: () => Promise<void>;
    refresh: () => Promise<void>;
}

/**
 * Custom hook for home screen data - events, status, and AI insights
 */
export const useHomeData = (
    childId: string | undefined,
    childName: string,
    ageMonths: number
): UseHomeDataReturn => {
    const [lastFeedTime, setLastFeedTime] = useState('--:--');
    const [lastSleepTime, setLastSleepTime] = useState('--:--');
    const [babyStatus, setBabyStatus] = useState<'sleeping' | 'awake'>('awake');
    const [aiTip, setAiTip] = useState('אוסף נתונים לניתוח...');
    const [loadingAI, setLoadingAI] = useState(false);

    const user = auth.currentUser;

    const updateRemoteStatus = useCallback(async (status: 'sleeping' | 'awake') => {
        if (!childId) return;
        try {
            const childRef = doc(db, 'babies', childId);
            await updateDoc(childRef, { status });
        } catch (e) {
            console.error('Status update error:', e);
        }
    }, [childId]);

    const toggleBabyStatus = useCallback(() => {
        const newStatus = babyStatus === 'sleeping' ? 'awake' : 'sleeping';
        setBabyStatus(newStatus);
        updateRemoteStatus(newStatus);
    }, [babyStatus, updateRemoteStatus]);

    const generateInsight = useCallback(async () => {
        if (!user || !childId) return;

        setLoadingAI(true);
        try {
            const history = await getRecentHistory(childId);
            const profileData = { name: childName, ageMonths };
            const prediction = await getAIPrediction(history, user.uid, profileData);
            setAiTip(prediction.tip);
        } catch (e) {
            console.error('AI error:', e);
            setAiTip('לא הצלחתי לנתח כרגע.');
        } finally {
            setLoadingAI(false);
        }
    }, [user, childId, childName, ageMonths]);

    const refresh = useCallback(async () => {
        if (!childId) return;

        try {
            // Fetch last events
            const lastFeed = await getLastEvent(childId, 'food');
            const lastSleep = await getLastEvent(childId, 'sleep');

            setLastFeedTime(formatTimeFromTimestamp(lastFeed?.timestamp));
            setLastSleepTime(formatTimeFromTimestamp(lastSleep?.timestamp));

            // Fetch current status
            const childRef = doc(db, 'babies', childId);
            const snap = await getDoc(childRef);

            if (snap.exists()) {
                const data = snap.data();
                if (data.status) setBabyStatus(data.status);
            }

            // Generate AI insight
            await generateInsight();
        } catch (e) {
            console.error('Home data refresh error:', e);
        }
    }, [childId, generateInsight]);

    return {
        lastFeedTime,
        lastSleepTime,
        babyStatus,
        aiTip,
        loadingAI,
        toggleBabyStatus,
        generateInsight,
        refresh,
    };
};

export default useHomeData;

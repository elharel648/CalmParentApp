import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { getLastEvent, formatTimeFromTimestamp, getRecentHistory } from '../services/firebaseService';
import { HomeDataState } from '../types/home';

interface DailyStats {
    feedCount: number;
    sleepMinutes: number;
    diaperCount: number;
}

interface UseHomeDataReturn extends HomeDataState {
    dailyStats: DailyStats;
    toggleBabyStatus: () => void;
    generateInsight: () => Promise<void>;
    refresh: () => Promise<void>;
    isLoading: boolean;
}

/**
 * Custom hook for home screen data - events, status, and AI insights
 */
export const useHomeData = (
    childId: string | undefined,
    childName: string,
    ageMonths: number,
    creatorId?: string
): UseHomeDataReturn => {
    const [lastFeedTime, setLastFeedTime] = useState('--:--');
    const [lastSleepTime, setLastSleepTime] = useState('--:--');
    const [babyStatus, setBabyStatus] = useState<'sleeping' | 'awake'>('awake');
    const [aiTip, setAiTip] = useState('אוסף נתונים לניתוח...');
    const [loadingAI, setLoadingAI] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dailyStats, setDailyStats] = useState<DailyStats>({
        feedCount: 0,
        sleepMinutes: 0,
        diaperCount: 0,
    });


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
        // Disabled for now
        setAiTip('');
        setLoadingAI(false);
    }, []);

    const calculateDailyStats = useCallback((events: any[]) => {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        let feedCount = 0;
        let sleepMinutes = 0;
        let diaperCount = 0;

        events.forEach(event => {
            let eventDate: Date;
            if (event.timestamp?.seconds) {
                eventDate = new Date(event.timestamp.seconds * 1000);
            } else if (event.timestamp) {
                eventDate = new Date(event.timestamp);
            } else {
                return;
            }

            if (eventDate >= last24h) {
                switch (event.type) {
                    case 'food':
                        feedCount++;
                        break;
                    case 'sleep':
                        // Extract sleep duration from note if available
                        if (event.note) {
                            const match = event.note.match(/(\d+):(\d+)/);
                            if (match) {
                                sleepMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
                            }
                        }
                        break;
                    case 'diaper':
                        diaperCount++;
                        break;
                }
            }
        });

        return { feedCount, sleepMinutes, diaperCount };
    }, []);

    const refresh = useCallback(async () => {
        if (!childId) return;

        try {
            // Fetch last events (passing creatorId for legacy support)
            const lastFeed = await getLastEvent(childId, 'food', creatorId);
            const lastSleep = await getLastEvent(childId, 'sleep', creatorId);

            setLastFeedTime(formatTimeFromTimestamp(lastFeed?.timestamp));
            setLastSleepTime(formatTimeFromTimestamp(lastSleep?.timestamp));

            // Fetch current status
            const childRef = doc(db, 'babies', childId);
            const snap = await getDoc(childRef);

            if (snap.exists()) {
                const data = snap.data();
                if (data.status) setBabyStatus(data.status);
            }

            // Calculate daily stats from history
            const history = await getRecentHistory(childId, creatorId);
            const stats = calculateDailyStats(history);
            setDailyStats(stats);

        } catch (e) {
            console.error('Home data refresh error:', e);
        }
    }, [childId, creatorId, calculateDailyStats]);

    // Auto-refresh when childId changes - MUST be after refresh definition
    useEffect(() => {
        const fetchDataForChild = async () => {
            if (!childId) {
                // Reset data when no child
                setLastFeedTime('--:--');
                setLastSleepTime('--:--');
                setDailyStats({ feedCount: 0, sleepMinutes: 0, diaperCount: 0 });
                return;
            }

            if (__DEV__) console.log('🔄 useHomeData: Fetching data for childId =', childId);

            try {
                // Fetch last events
                const lastFeed = await getLastEvent(childId, 'food', creatorId);
                const lastSleep = await getLastEvent(childId, 'sleep', creatorId);

                setLastFeedTime(formatTimeFromTimestamp(lastFeed?.timestamp));
                setLastSleepTime(formatTimeFromTimestamp(lastSleep?.timestamp));

                // Fetch current status
                const childRef = doc(db, 'babies', childId);
                const snap = await getDoc(childRef);

                if (snap.exists()) {
                    const data = snap.data();
                    if (data.status) setBabyStatus(data.status);
                }

                // Calculate daily stats from history
                const history = await getRecentHistory(childId, creatorId);
                const stats = calculateDailyStats(history);
                setDailyStats(stats);

                if (__DEV__) console.log('✅ useHomeData: Data fetched for childId =', childId, 'stats =', stats);

            } catch (e) {
                if (__DEV__) console.log('Home data refresh error:', e);
            }
        };

        fetchDataForChild();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childId]); // Only refresh when childId changes

    return {
        lastFeedTime,
        lastSleepTime,
        babyStatus,
        aiTip,
        loadingAI,
        dailyStats,
        isLoading,
        toggleBabyStatus,
        generateInsight,
        refresh,
    };
};

export default useHomeData;

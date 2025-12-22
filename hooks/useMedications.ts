import { useState, useCallback } from 'react';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { MedicationsState } from '../types/home';

interface UseMedicationsReturn {
    meds: MedicationsState;
    toggleMed: (type: 'vitaminD' | 'iron') => void;
    syncStatus: 'synced' | 'syncing' | 'error';
    refresh: () => Promise<void>;
}

/**
 * Custom hook for daily medications tracking with Firebase sync
 */
export const useMedications = (childId: string | undefined): UseMedicationsReturn => {
    const [meds, setMeds] = useState<MedicationsState>({ vitaminD: false, iron: false });
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    const syncToFirebase = useCallback(async (newMeds: MedicationsState) => {
        if (!childId) return;

        setSyncStatus('syncing');
        try {
            const childRef = doc(db, 'babies', childId);
            await updateDoc(childRef, {
                meds: newMeds,
                medsDate: new Date().toDateString(),
            });
            setSyncStatus('synced');
        } catch (e) {
            if (__DEV__) console.log('Med sync error:', e);
            setSyncStatus('error');
        }
    }, [childId]);

    // Save supplement event to timeline
    const saveSupplementEvent = useCallback(async (type: 'vitaminD' | 'iron') => {
        const user = auth.currentUser;
        if (!user || !childId) return;

        const supplementName = type === 'vitaminD' ? 'ויטמין D' : 'ברזל';

        try {
            await addDoc(collection(db, 'events'), {
                userId: user.uid,
                childId,
                type: 'supplement',
                subType: type,
                note: supplementName,
                timestamp: serverTimestamp(),
                reporterName: user.displayName || 'אני',
            });
            if (__DEV__) console.log('💊 Supplement event saved:', supplementName);
        } catch (e) {
            if (__DEV__) console.log('Supplement event save error:', e);
        }
    }, [childId]);

    const toggleMed = useCallback((type: 'vitaminD' | 'iron') => {
        const newValue = !meds[type];
        const newMeds = { ...meds, [type]: newValue };
        setMeds(newMeds);
        syncToFirebase(newMeds);

        // Save to timeline only when marking as TAKEN (true)
        if (newValue) {
            saveSupplementEvent(type);
        }
    }, [meds, syncToFirebase, saveSupplementEvent]);

    const refresh = useCallback(async () => {
        if (!childId) return;

        try {
            const childRef = doc(db, 'babies', childId);
            const snap = await getDoc(childRef);

            if (snap.exists()) {
                const data = snap.data();
                const todayStr = new Date().toDateString();

                if (data.medsDate === todayStr) {
                    setMeds(data.meds || { vitaminD: false, iron: false });
                } else {
                    // Reset for new day
                    const resetMeds = { vitaminD: false, iron: false };
                    setMeds(resetMeds);
                    await updateDoc(childRef, { meds: resetMeds, medsDate: todayStr });
                }
            }
        } catch (e) {
            if (__DEV__) console.log('Med refresh error:', e);
        }
    }, [childId]);

    return {
        meds,
        toggleMed,
        syncStatus,
        refresh,
    };
};

export default useMedications;

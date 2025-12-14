import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { addMilestone, removeMilestone } from '../services/babyService';
import { Milestone } from '../types/profile';

interface UseMilestonesReturn {
    addNew: (babyId: string, title: string, date: Date) => Promise<void>;
    remove: (babyId: string, milestone: Milestone, onSuccess: () => void) => void;
}

export const useMilestones = (): UseMilestonesReturn => {

    const addNew = useCallback(async (babyId: string, title: string, date: Date) => {
        if (!babyId || !title.trim()) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        await addMilestone(babyId, title, date);
    }, []);

    const remove = useCallback((
        babyId: string,
        milestone: Milestone,
        onSuccess: () => void
    ) => {
        Alert.alert(
            "מחיקה",
            "האם למחוק את אבן הדרך?",
            [
                { text: "ביטול" },
                {
                    text: "מחק",
                    style: "destructive",
                    onPress: async () => {
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                        await removeMilestone(babyId, milestone);
                        onSuccess();
                    }
                }
            ]
        );
    }, []);

    return {
        addNew,
        remove,
    };
};

export default useMilestones;

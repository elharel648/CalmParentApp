import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    toggleVaccineStatus,
    addCustomVaccine,
    toggleCustomVaccine,
    removeCustomVaccine
} from '../services/babyService';
import { CustomVaccine } from '../types/profile';

interface UseVaccinesReturn {
    toggleVaccine: (babyId: string, currentVaccines: any, key: string) => Promise<boolean>;
    addCustom: (babyId: string, name: string) => Promise<void>;
    toggleCustom: (babyId: string, allCustom: CustomVaccine[], vaccineId: string) => Promise<void>;
    deleteCustom: (babyId: string, vaccine: CustomVaccine) => Promise<void>;
}

export const useVaccines = (): UseVaccinesReturn => {

    const toggleVaccine = useCallback(async (
        babyId: string,
        currentVaccines: any,
        key: string,
        date?: Date
    ): Promise<boolean> => {
        if (!babyId) return false;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        await toggleVaccineStatus(babyId, currentVaccines, key, date);
        // Optimistic update return value (not used much but good to have)
        return true;
    }, []);

    const addCustom = useCallback(async (babyId: string, name: string) => {
        if (!babyId || !name.trim()) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        await addCustomVaccine(babyId, name);
    }, []);

    const toggleCustom = useCallback(async (
        babyId: string,
        allCustom: CustomVaccine[],
        vaccineId: string
    ) => {
        if (!babyId) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        await toggleCustomVaccine(babyId, allCustom, vaccineId);
    }, []);

    const deleteCustom = useCallback(async (babyId: string, vaccine: CustomVaccine) => {
        Alert.alert(
            "מחיקה",
            "האם למחוק את החיסון?",
            [
                { text: "ביטול" },
                {
                    text: "מחק",
                    style: "destructive",
                    onPress: async () => {
                        await removeCustomVaccine(babyId, vaccine);
                    }
                }
            ]
        );
    }, []);

    return {
        toggleVaccine,
        addCustom,
        toggleCustom,
        deleteCustom,
    };
};

export default useVaccines;

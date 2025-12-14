import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import { getBabyData, updateBabyData, saveAlbumImage, BabyData } from '../services/babyService';
import { GrowthStats } from '../types/profile';

interface UseBabyProfileReturn {
    baby: BabyData | null;
    loading: boolean;
    savingImage: boolean;
    babyAgeMonths: number;
    birthDateObj: Date;
    refresh: () => Promise<void>;
    updatePhoto: (type: 'profile' | 'album', monthIndex?: number) => Promise<void>;
    updateBirthDate: (date: Date) => Promise<void>;
    updateStats: (type: 'weight' | 'height' | 'head', value: string) => Promise<void>;
}

export const useBabyProfile = (): UseBabyProfileReturn => {
    const [baby, setBaby] = useState<BabyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingImage, setSavingImage] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await getBabyData();
            if (data) setBaby(data);
        } catch (e) {
            console.error('Error loading baby profile:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const birthDateObj = baby?.birthDate
        ? new Date(baby.birthDate.seconds * 1000)
        : new Date();

    const babyAgeMonths = Math.floor(
        (new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const updateBirthDate = useCallback(async (date: Date) => {
        if (!baby?.id) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const timestamp = Timestamp.fromDate(date);
        await updateBabyData(baby.id, { birthDate: timestamp });
        setBaby(prev => prev ? { ...prev, birthDate: timestamp } : null);
    }, [baby?.id]);

    const updateStats = useCallback(async (type: 'weight' | 'height' | 'head', value: string) => {
        if (!baby?.id) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const currentStats = baby.stats || {};
        let updates: { stats: GrowthStats } = { stats: { ...currentStats } };

        if (type === 'weight') updates.stats.weight = value;
        if (type === 'height') updates.stats.height = value;
        if (type === 'head') updates.stats.headCircumference = value;

        await updateBabyData(baby.id, updates);
        setBaby(prev => prev ? { ...prev, stats: updates.stats } : null);
    }, [baby?.id, baby?.stats]);

    const updatePhoto = useCallback(async (type: 'profile' | 'album', monthIndex?: number) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('שגיאה', 'חובה אישור לגלריה');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'profile' ? [1, 1] : [3, 4],
            quality: 0.3,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64 && baby?.id) {
            setSavingImage(true);
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;

            try {
                if (type === 'profile') {
                    await updateBabyData(baby.id, { photoUrl: base64Img });
                    setBaby(prev => prev ? { ...prev, photoUrl: base64Img } : null);
                } else if (type === 'album' && monthIndex !== undefined) {
                    await saveAlbumImage(baby.id, monthIndex, base64Img);
                    setBaby(prev => {
                        if (!prev) return null;
                        return { ...prev, album: { ...prev.album, [monthIndex]: base64Img } };
                    });
                }

                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (e) {
                Alert.alert('שגיאה בשמירה');
            } finally {
                setSavingImage(false);
            }
        }
    }, [baby?.id]);

    return {
        baby,
        loading,
        savingImage,
        babyAgeMonths,
        birthDateObj,
        refresh: loadData,
        updatePhoto,
        updateBirthDate,
        updateStats,
    };
};

export default useBabyProfile;

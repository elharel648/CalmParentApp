import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Platform, ActionSheetIOS, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import { getBabyData, updateBabyData, saveAlbumImage, BabyData, getBabyDataById } from '../services/babyService';
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
    updateAllStats: (stats: { weight?: string; height?: string; headCircumference?: string }) => Promise<void>;
    updateBasicInfo: (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => Promise<void>;
    updateAlbumNote: (month: number, note: string) => Promise<void>;
}

export const useBabyProfile = (childId?: string): UseBabyProfileReturn => {
    const [baby, setBaby] = useState<BabyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingImage, setSavingImage] = useState(false);
    const prevChildId = useRef<string | undefined>(childId);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            // If childId is provided, load that specific child's data
            if (childId) {
                const data = await getBabyDataById(childId);
                if (data) setBaby(data);
            } else {
                // Fall back to default behavior
                const data = await getBabyData();
                if (data) setBaby(data);
            }
        } catch (e) {
            console.error('Error loading baby profile:', e);
        } finally {
            setLoading(false);
        }
    }, [childId]);

    // Reload when childId changes (for live updates when switching children)
    useEffect(() => {
        if (prevChildId.current !== childId) {
            prevChildId.current = childId;
            loadData();
        }
    }, [childId, loadData]);

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

    // Update all stats in one call to avoid race condition
    const updateAllStats = useCallback(async (newStats: { weight?: string; height?: string; headCircumference?: string }) => {
        if (!baby?.id) {
            console.log('❌ updateAllStats: No baby.id');
            return;
        }

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const currentStats = baby.stats || {};
        const mergedStats: GrowthStats = {
            ...currentStats,
            ...(newStats.weight !== undefined && { weight: newStats.weight }),
            ...(newStats.height !== undefined && { height: newStats.height }),
            ...(newStats.headCircumference !== undefined && { headCircumference: newStats.headCircumference }),
        };

        console.log('📤 updateAllStats saving:', mergedStats);
        await updateBabyData(baby.id, { stats: mergedStats });
        console.log('✅ updateAllStats successful');
        setBaby(prev => prev ? { ...prev, stats: mergedStats } : null);
    }, [baby?.id, baby?.stats]);

    const updateBasicInfo = useCallback(async (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => {
        if (!baby?.id) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const timestamp = Timestamp.fromDate(data.birthDate);
        const updates = {
            name: data.name,
            gender: data.gender,
            birthDate: timestamp,
        };

        await updateBabyData(baby.id, updates);
        setBaby(prev => prev ? { ...prev, ...updates } : null);
    }, [baby?.id]);

    const openSettings = useCallback(() => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    }, []);

    const handlePermissionDenied = useCallback((permissionType: 'camera' | 'gallery') => {
        const message = permissionType === 'camera'
            ? 'נדרשת הרשאת מצלמה כדי לצלם תמונה'
            : 'נדרשת הרשאת גלריה כדי לבחור תמונה';

        Alert.alert(
            'חובה לאשר הרשאות',
            message,
            [
                { text: 'ביטול', style: 'cancel' },
                { text: 'פתח הגדרות', onPress: openSettings }
            ]
        );
    }, [openSettings]);

    const pickImageFromLibrary = useCallback(async (type: 'profile' | 'album', monthIndex?: number) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            handlePermissionDenied('gallery');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'profile' ? [1, 1] : [3, 4],
            quality: 0.3,
            base64: true,
        });

        return result;
    }, [handlePermissionDenied]);

    const takePhotoWithCamera = useCallback(async (type: 'profile' | 'album') => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            handlePermissionDenied('camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: type === 'profile' ? [1, 1] : [3, 4],
            quality: 0.3,
            base64: true,
        });

        return result;
    }, [handlePermissionDenied]);

    const processImage = useCallback(async (result: ImagePicker.ImagePickerResult, type: 'profile' | 'album', monthIndex?: number) => {
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

    const updatePhoto = useCallback(async (type: 'profile' | 'album', monthIndex?: number) => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['ביטול', 'צלם תמונה', 'בחר מהגלריה'],
                    cancelButtonIndex: 0,
                    title: 'בחר מקור תמונה',
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        // Camera
                        const result = await takePhotoWithCamera(type);
                        if (result) await processImage(result, type, monthIndex);
                    } else if (buttonIndex === 2) {
                        // Gallery
                        const result = await pickImageFromLibrary(type, monthIndex);
                        if (result) await processImage(result, type, monthIndex);
                    }
                }
            );
        } else {
            // Android - use Alert for action sheet
            Alert.alert(
                'בחר מקור תמונה',
                '',
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'צלם תמונה',
                        onPress: async () => {
                            const result = await takePhotoWithCamera(type);
                            if (result) await processImage(result, type, monthIndex);
                        }
                    },
                    {
                        text: 'בחר מהגלריה',
                        onPress: async () => {
                            const result = await pickImageFromLibrary(type, monthIndex);
                            if (result) await processImage(result, type, monthIndex);
                        }
                    },
                ]
            );
        }
    }, [takePhotoWithCamera, pickImageFromLibrary, processImage]);

    const updateAlbumNote = useCallback(async (month: number, note: string) => {
        if (!baby?.id) return;

        try {
            // Get current album data
            const currentAlbum = baby.albumNotes || {};
            const updatedNotes = { ...currentAlbum, [month]: note };

            // Save to Firebase
            await updateBabyData(baby.id, { albumNotes: updatedNotes });

            // Update local state
            setBaby(prev => prev ? { ...prev, albumNotes: updatedNotes } : null);

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.error('Error saving album note:', e);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את ההערה');
        }
    }, [baby?.id, baby?.albumNotes]);

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
        updateAllStats,
        updateBasicInfo,
        updateAlbumNote,
    };
};

export default useBabyProfile;

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Sun, Droplets, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MedicationsState } from '../../types/home';

interface MedicationsTrackerProps {
    meds: MedicationsState;
    onToggle: (type: 'vitaminD' | 'iron') => void;
    syncStatus?: 'synced' | 'syncing' | 'error';
    dynamicStyles: { text: string };
}

/**
 * Daily medications tracker with sync status
 */
const MedicationsTracker = memo<MedicationsTrackerProps>(({
    meds,
    onToggle,
    syncStatus = 'synced',
    dynamicStyles,
}) => {
    const handleToggle = useCallback((type: 'vitaminD' | 'iron') => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(
                meds[type]
                    ? Haptics.NotificationFeedbackType.Warning
                    : Haptics.NotificationFeedbackType.Success
            );
        }
        onToggle(type);
    }, [meds, onToggle]);

    return (
        <View style={styles.medsContainer}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitleSmall, { color: dynamicStyles.text }]}>
                    מדד יומי (מתאפס בלילה)
                </Text>
                {syncStatus === 'syncing' && (
                    <Text style={styles.syncIndicator}>מסנכרן...</Text>
                )}
            </View>

            <View style={styles.medsGrid}>
                {/* Vitamin D */}
                <TouchableOpacity
                    style={[styles.medBtn, meds.vitaminD && styles.medBtnActive]}
                    onPress={() => handleToggle('vitaminD')}
                    accessibilityLabel={`ויטמין D ${meds.vitaminD ? 'ניתן' : 'לא ניתן'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: meds.vitaminD }}
                >
                    <Text style={[styles.medText, meds.vitaminD && styles.medTextActive]}>
                        ויטמין D
                    </Text>
                    {meds.vitaminD ? (
                        <CheckCircle size={20} color="#fff" />
                    ) : (
                        <Sun size={20} color="#F59E0B" />
                    )}
                </TouchableOpacity>

                {/* Iron */}
                <TouchableOpacity
                    style={[styles.medBtn, meds.iron && styles.medBtnActive]}
                    onPress={() => handleToggle('iron')}
                    accessibilityLabel={`ברזל ${meds.iron ? 'ניתן' : 'לא ניתן'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: meds.iron }}
                >
                    <Text style={[styles.medText, meds.iron && styles.medTextActive]}>
                        ברזל
                    </Text>
                    {meds.iron ? (
                        <CheckCircle size={20} color="#fff" />
                    ) : (
                        <Droplets size={20} color="#EF4444" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
});

MedicationsTracker.displayName = 'MedicationsTracker';

const styles = StyleSheet.create({
    medsContainer: {
        marginBottom: 30,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitleSmall: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'right',
    },
    syncIndicator: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    medsGrid: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    medBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    medBtnActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    medText: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
        color: '#374151',
    },
    medTextActive: {
        color: '#fff',
    },
});

export default MedicationsTracker;

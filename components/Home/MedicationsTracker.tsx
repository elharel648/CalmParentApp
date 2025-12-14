import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Sun, Droplets, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MedicationsState } from '../../types/home';

interface MedicationsTrackerProps {
    meds: MedicationsState;
    onToggle: (type: 'vitaminD' | 'iron') => void;
    syncStatus?: 'synced' | 'syncing' | 'error';
    dynamicStyles: { text: string };
}

/**
 * Beautiful circular medication tracker
 */
const MedicationsTracker = memo<MedicationsTrackerProps>(({
    meds,
    onToggle,
}) => {
    const handleToggle = useCallback((type: 'vitaminD' | 'iron') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(
                meds[type]
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Medium
            );
        }
        onToggle(type);
    }, [meds, onToggle]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>💊 תוספי תזונה יומיים</Text>
            </View>

            <View style={styles.pillsRow}>
                {/* Vitamin D */}
                <TouchableOpacity
                    style={styles.pillContainer}
                    onPress={() => handleToggle('vitaminD')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.pillCircle, meds.vitaminD && styles.pillCircleActive]}>
                        {meds.vitaminD ? (
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.gradient}
                            >
                                <Check size={24} color="#fff" />
                            </LinearGradient>
                        ) : (
                            <Sun size={24} color="#F59E0B" />
                        )}
                    </View>
                    <Text style={[styles.pillLabel, meds.vitaminD && styles.pillLabelActive]}>
                        ויטמין D
                    </Text>
                </TouchableOpacity>

                {/* Iron */}
                <TouchableOpacity
                    style={styles.pillContainer}
                    onPress={() => handleToggle('iron')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.pillCircle, meds.iron && styles.pillCircleActive]}>
                        {meds.iron ? (
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.gradient}
                            >
                                <Check size={24} color="#fff" />
                            </LinearGradient>
                        ) : (
                            <Droplets size={24} color="#EF4444" />
                        )}
                    </View>
                    <Text style={[styles.pillLabel, meds.iron && styles.pillLabelActive]}>
                        ברזל
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

MedicationsTracker.displayName = 'MedicationsTracker';

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        marginBottom: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    pillsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
    },
    pillContainer: {
        alignItems: 'center',
    },
    pillCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F9FAFB',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    pillCircleActive: {
        borderColor: '#10B981',
        borderWidth: 0,
    },
    gradient: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillLabel: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    pillLabelActive: {
        color: '#10B981',
    },
});

export default MedicationsTracker;

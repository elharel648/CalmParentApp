import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Sun, Droplets, Check, Pill } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';

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
    const { theme, isDarkMode } = useTheme();
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

    const takenCount = (meds.vitaminD ? 1 : 0) + (meds.iron ? 1 : 0);
    const allTaken = takenCount === 2;

    return (
        <View style={[styles.container, { backgroundColor: theme.card }]}>
            <View style={styles.pillsRow}>
                {/* Vitamin D */}
                <TouchableOpacity
                    style={styles.pillContainer}
                    onPress={() => handleToggle('vitaminD')}
                    activeOpacity={0.7}
                >
                    <View style={[
                        styles.pillCircle,
                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                        meds.vitaminD && styles.pillCircleActive
                    ]}>
                        {Platform.OS === 'ios' && !meds.vitaminD && (
                            <BlurView
                                intensity={20}
                                tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        {meds.vitaminD ? (
                            <Check size={18} color="#10B981" strokeWidth={3} />
                        ) : (
                            <Sun size={18} color="#F59E0B" strokeWidth={2} />
                        )}
                    </View>
                    <Text style={[styles.pillLabel, { color: theme.textSecondary }, meds.vitaminD && { color: '#10B981' }]}>
                        ויטמין D
                    </Text>
                </TouchableOpacity>

                {/* Iron */}
                <TouchableOpacity
                    style={styles.pillContainer}
                    onPress={() => handleToggle('iron')}
                    activeOpacity={0.7}
                >
                    <View style={[
                        styles.pillCircle,
                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                        meds.iron && styles.pillCircleActive
                    ]}>
                        {Platform.OS === 'ios' && !meds.iron && (
                            <BlurView
                                intensity={20}
                                tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        {meds.iron ? (
                            <Check size={18} color="#10B981" strokeWidth={3} />
                        ) : (
                            <Droplets size={18} color="#EF4444" strokeWidth={2} />
                        )}
                    </View>
                    <Text style={[styles.pillLabel, { color: theme.textSecondary }, meds.iron && { color: '#10B981' }]}>
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
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    pillsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
    },
    pillContainer: {
        alignItems: 'center',
    },
    pillCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    pillCircleActive: {
        borderColor: '#10B981',
        borderWidth: 2,
        backgroundColor: '#10B98115',
    },
    pillLabel: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '600',
    },
});

export default MedicationsTracker;

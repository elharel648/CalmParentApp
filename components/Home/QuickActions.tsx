import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Utensils, Moon, Layers, Music, Anchor, Pill, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { MedicationsState } from '../../types/home';
import { LinearGradient } from 'expo-linear-gradient';

interface QuickActionsProps {
    lastFeedTime: string;
    lastSleepTime: string;
    onFoodPress: () => void;
    onSleepPress: () => void;
    onDiaperPress: () => void;
    onWhiteNoisePress: () => void;
    onSOSPress: () => void;
    onSupplementsPress: () => void; // New prop
    meds?: MedicationsState;
    dynamicStyles: { text: string };
}

/**
 * Quick action buttons including Supplements modal trigger
 */
const QuickActions = memo<QuickActionsProps>(({
    lastFeedTime,
    lastSleepTime,
    onFoodPress,
    onSleepPress,
    onDiaperPress,
    onWhiteNoisePress,
    onSOSPress,
    onSupplementsPress,
    meds,
    dynamicStyles,
}) => {
    const { isRunning, elapsedSeconds, formatTime } = useSleepTimer();

    const handlePress = useCallback((callback: () => void) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        callback();
    }, []);

    // Calculate supplements taken
    const takenCount = (meds?.vitaminD ? 1 : 0) + (meds?.iron ? 1 : 0);
    const allTaken = takenCount === 2;

    return (
        <View>
            <Text style={[styles.sectionTitle, { color: dynamicStyles.text }]}>
                פעולות מהירות
            </Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionsSlider}
            >
                {/* Food */}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]}
                    onPress={() => handlePress(onFoodPress)}
                    accessibilityRole="button"
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
                        <Utensils size={24} color="#fff" />
                    </View>
                    <Text style={styles.actionText}>אוכל</Text>
                    <Text style={styles.lastTimeText}>{lastFeedTime}</Text>
                </TouchableOpacity>

                {/* Sleep */}
                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        { backgroundColor: isRunning ? '#6366F1' : '#E0E7FF' }
                    ]}
                    onPress={() => handlePress(onSleepPress)}
                    accessibilityRole="button"
                >
                    <View style={[
                        styles.actionIcon,
                        { backgroundColor: isRunning ? '#fff' : '#6366F1' }
                    ]}>
                        <Moon size={24} color={isRunning ? '#6366F1' : '#fff'} />
                    </View>
                    <Text style={[styles.actionText, isRunning && { color: '#fff' }]}>
                        {isRunning ? 'ישנה' : 'שינה'}
                    </Text>
                    <Text style={[
                        isRunning ? styles.timerText : styles.lastTimeText,
                        isRunning && { color: '#E0E7FF' }
                    ]}>
                        {isRunning ? formatTime(elapsedSeconds) : lastSleepTime}
                    </Text>
                </TouchableOpacity>

                {/* Diaper */}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                    onPress={() => handlePress(onDiaperPress)}
                    accessibilityRole="button"
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                        <Layers size={24} color="#fff" />
                    </View>
                    <Text style={styles.actionText}>חיתול</Text>
                </TouchableOpacity>

                {/* Supplements (Single Button) */}
                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        allTaken ? { backgroundColor: '#E0F2FE' } : { backgroundColor: '#F3F4F6' } // Sky-100
                    ]}
                    onPress={() => handlePress(onSupplementsPress)}
                    accessibilityRole="button"
                >
                    {allTaken ? (
                        <View style={[styles.actionIcon, { backgroundColor: '#0EA5E9' }]}>
                            <Check size={24} color="#fff" />
                        </View>
                    ) : (
                        <View style={[styles.actionIcon, { backgroundColor: '#6B7280' }]}>
                            <Pill size={24} color="#fff" />
                        </View>
                    )}
                    <Text style={[styles.actionText, allTaken && { color: '#0284C7' }]}>
                        תוספים
                    </Text>
                    <Text style={[styles.lastTimeText, allTaken && { color: '#0EA5E9' }]}>
                        {takenCount}/2 נלקחו
                    </Text>
                </TouchableOpacity>

                {/* Separator line */}
                <View style={styles.separator} />

                {/* White Noise */}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F3E8FF' }]}
                    onPress={() => handlePress(onWhiteNoisePress)}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
                        <Music size={24} color="#fff" />
                    </View>
                    <Text style={[styles.actionText, { color: '#5B21B6' }]}>רעש לבן</Text>
                </TouchableOpacity>

                {/* SOS */}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FCE7F3' }]}
                    onPress={() => handlePress(onSOSPress)}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#F43F5E' }]}>
                        <Anchor size={24} color="#fff" />
                    </View>
                    <Text style={[styles.actionText, { color: '#BE123C' }]}>SOS</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
});

QuickActions.displayName = 'QuickActions';

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'right',
    },
    actionsSlider: {
        flexDirection: 'row-reverse',
        gap: 10,
        paddingLeft: 20,
        paddingBottom: 16,
    },
    actionBtn: {
        width: 90,
        height: 110,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
    lastTimeText: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 3,
        fontWeight: '600',
    },
    timerText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 3,
    },
    separator: {
        width: 1,
        height: 80,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
        alignSelf: 'center',
    },
});

export default QuickActions;

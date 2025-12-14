import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Utensils, Moon, Layers, Music, Anchor } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../../context/SleepTimerContext';

interface QuickActionsProps {
    lastFeedTime: string;
    lastSleepTime: string;
    onFoodPress: () => void;
    onSleepPress: () => void;
    onDiaperPress: () => void;
    onWhiteNoisePress: () => void;
    onSOSPress: () => void;
    dynamicStyles: { text: string };
}

/**
 * Quick action buttons with haptic feedback
 * Sleep button shows active timer when running
 */
const QuickActions = memo<QuickActionsProps>(({
    lastFeedTime,
    lastSleepTime,
    onFoodPress,
    onSleepPress,
    onDiaperPress,
    onWhiteNoisePress,
    onSOSPress,
    dynamicStyles,
}) => {
    const { isRunning, elapsedSeconds, formatTime } = useSleepTimer();

    const handlePress = useCallback((callback: () => void) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        callback();
    }, []);

    return (
        <View>
            <Text style={[styles.sectionTitle, { color: dynamicStyles.text }]}>
                תיעוד מהיר
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
                    accessibilityLabel={`תיעוד אוכל. אחרון: ${lastFeedTime}`}
                    accessibilityRole="button"
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
                        <Utensils size={28} color="#fff" />
                    </View>
                    <Text style={styles.actionText}>אוכל</Text>
                    <Text style={styles.lastTimeText}>{lastFeedTime}</Text>
                </TouchableOpacity>

                {/* Sleep - Shows timer when active! */}
                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        { backgroundColor: isRunning ? '#6366F1' : '#E0E7FF' }
                    ]}
                    onPress={() => handlePress(onSleepPress)}
                    accessibilityLabel={isRunning ? `שינה פעילה: ${formatTime(elapsedSeconds)}` : `תיעוד שינה. אחרון: ${lastSleepTime}`}
                    accessibilityRole="button"
                >
                    <View style={[
                        styles.actionIcon,
                        { backgroundColor: isRunning ? '#fff' : '#6366F1' }
                    ]}>
                        <Moon size={28} color={isRunning ? '#6366F1' : '#fff'} />
                    </View>
                    <Text style={[
                        styles.actionText,
                        isRunning && { color: '#fff' }
                    ]}>
                        {isRunning ? 'ישנה 😴' : 'שינה'}
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
                    accessibilityLabel="תיעוד חיתול"
                    accessibilityRole="button"
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                        <Layers size={28} color="#fff" />
                    </View>
                    <Text style={styles.actionText}>חיתול</Text>
                </TouchableOpacity>

                {/* White Noise */}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F3E8FF' }]}
                    onPress={() => handlePress(onWhiteNoisePress)}
                    accessibilityLabel="הפעל רעש לבן"
                    accessibilityRole="button"
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
                        <Music size={28} color="#fff" />
                    </View>
                    <Text style={[styles.actionText, { color: '#5B21B6' }]}>רעש לבן</Text>
                </TouchableOpacity>

                {/* SOS */}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FCE7F3' }]}
                    onPress={() => handlePress(onSOSPress)}
                    accessibilityLabel="מצב SOS להרגעה"
                    accessibilityRole="button"
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#F43F5E' }]}>
                        <Anchor size={28} color="#fff" />
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
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'right',
    },
    actionsSlider: {
        flexDirection: 'row-reverse',
        gap: 12,
        paddingLeft: 20,
        paddingBottom: 20,
    },
    actionBtn: {
        width: 105,
        height: 130,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
    },
    lastTimeText: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
        fontWeight: '500',
    },
    timerText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 4,
    },
});

export default QuickActions;

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { Utensils, Moon, Droplets, Music, Heart, Pill, Check, Timer } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';

interface QuickActionsProps {
    lastFeedTime: string;
    lastSleepTime: string;
    onFoodPress: () => void;
    onSleepPress: () => void;
    onDiaperPress: () => void;
    onWhiteNoisePress: () => void;
    onSOSPress: () => void;
    onSupplementsPress: () => void;
    meds?: MedicationsState;
    dynamicStyles: { text: string };
}

// Action button configuration
const ACTIONS = {
    food: {
        icon: Utensils,
        label: 'האכלה',
        activeLabel: 'מאכילה',
        color: '#F59E0B',
        lightColor: '#FEF3C7',
    },
    sleep: {
        icon: Moon,
        label: 'שינה',
        activeLabel: 'ישנ/ה',
        color: '#6366F1',
        lightColor: '#EEF2FF',
    },
    diaper: {
        icon: Droplets,
        label: 'החתלה',
        color: '#10B981',
        lightColor: '#D1FAE5',
    },
    supplements: {
        icon: Pill,
        label: 'תוספים',
        color: '#0EA5E9',
        lightColor: '#E0F2FE',
    },
    whiteNoise: {
        icon: Music,
        label: 'רעש לבן',
        color: '#8B5CF6',
        lightColor: '#F3E8FF',
    },
    sos: {
        icon: Heart,
        label: 'SOS',
        color: '#EF4444',
        lightColor: '#FEE2E2',
    },
};

/**
 * Premium Minimalist Quick Actions - Clean white cards with color accents
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
    const { theme } = useTheme();
    const { isRunning: sleepIsRunning, elapsedSeconds: sleepElapsed, formatTime: sleepFormatTime } = useSleepTimer();
    const { isRunning: foodIsRunning, elapsedSeconds: foodElapsed, formatTime: foodFormatTime } = useFoodTimer();

    const handlePress = useCallback((callback: () => void) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        callback();
    }, []);

    // Calculate supplements taken
    const takenCount = (meds?.vitaminD ? 1 : 0) + (meds?.iron ? 1 : 0);
    const allTaken = takenCount === 2;

    // Ref to scroll to right side on mount
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 50);
    }, []);

    // Single action button component
    const ActionButton = ({
        config,
        onPress,
        isActive = false,
        activeTime,
        lastTime,
        badge,
    }: {
        config: typeof ACTIONS.food;
        onPress: () => void;
        isActive?: boolean;
        activeTime?: string;
        lastTime?: string;
        badge?: string;
    }) => {
        const Icon = config.icon;

        return (
            <TouchableOpacity
                style={[
                    styles.actionCard,
                    { backgroundColor: theme.card },
                    isActive && { borderColor: config.color, borderWidth: 2 }
                ]}
                onPress={() => handlePress(onPress)}
                activeOpacity={0.7}
            >
                {/* Icon Circle */}
                <View style={[styles.iconCircle, { backgroundColor: config.lightColor }]}>
                    <Icon size={22} color={config.color} strokeWidth={2} />
                </View>

                {/* Label */}
                <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>
                    {isActive ? config.activeLabel : config.label}
                </Text>

                {/* Time or Badge */}
                {activeTime && isActive ? (
                    <View style={[styles.timerBadge, { backgroundColor: config.color }]}>
                        <Timer size={10} color="#fff" />
                        <Text style={styles.timerText}>{activeTime}</Text>
                    </View>
                ) : lastTime ? (
                    <Text style={[styles.lastTimeText, { color: theme.textSecondary }]}>
                        {lastTime}
                    </Text>
                ) : badge ? (
                    <Text style={[styles.badgeText, { color: config.color }]}>
                        {badge}
                    </Text>
                ) : null}

                {/* Active indicator dot */}
                {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: config.color }]} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Section Header */}
            <View style={styles.header}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    פעולות מהירות
                </Text>
            </View>

            {/* Primary Actions Row */}
            <View style={styles.primaryRow}>
                <ActionButton
                    config={ACTIONS.food}
                    onPress={onFoodPress}
                    isActive={foodIsRunning}
                    activeTime={foodIsRunning ? foodFormatTime(foodElapsed) : undefined}
                    lastTime={!foodIsRunning ? lastFeedTime : undefined}
                />
                <ActionButton
                    config={ACTIONS.sleep}
                    onPress={onSleepPress}
                    isActive={sleepIsRunning}
                    activeTime={sleepIsRunning ? sleepFormatTime(sleepElapsed) : undefined}
                    lastTime={!sleepIsRunning ? lastSleepTime : undefined}
                />
                <ActionButton
                    config={ACTIONS.diaper}
                    onPress={onDiaperPress}
                />
            </View>

            {/* Secondary Actions Row */}
            <View style={styles.secondaryRow}>
                <ActionButton
                    config={allTaken ? { ...ACTIONS.supplements, icon: Check } : ACTIONS.supplements}
                    onPress={onSupplementsPress}
                    badge={`${takenCount}/2`}
                />
                <ActionButton
                    config={ACTIONS.whiteNoise}
                    onPress={onWhiteNoisePress}
                />
                <ActionButton
                    config={ACTIONS.sos}
                    onPress={onSOSPress}
                />
            </View>
        </View>
    );
});

QuickActions.displayName = 'QuickActions';

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'right',
    },

    // Primary row (3 main actions)
    primaryRow: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 12,
    },

    // Secondary row
    secondaryRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },

    // Action Card
    actionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
        position: 'relative',
    },

    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },

    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },

    lastTimeText: {
        fontSize: 11,
        fontWeight: '500',
    },

    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },

    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },

    timerText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },

    activeDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});

export default QuickActions;

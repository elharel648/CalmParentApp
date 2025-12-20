import React, { memo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Utensils, Moon, Droplets, Music, Heart, Pill, Check, Timer, Plus, HeartPulse, Pause, TrendingUp, Award, Sparkles } from 'lucide-react-native';
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
    onHealthPress?: () => void;
    onGrowthPress?: () => void;
    onMilestonesPress?: () => void;
    onMagicMomentsPress?: () => void;
    onCustomPress?: () => void;
    onFoodTimerStop?: (seconds: number, timerType: string) => void;
    onSleepTimerStop?: (seconds: number) => void;
    meds?: MedicationsState;
    dynamicStyles: { text: string };
}

// Action button configuration
const ACTIONS = {
    food: {
        icon: Utensils,
        label: 'אוכל',
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
        activeLabel: 'החתלה',
        color: '#10B981',
        lightColor: '#D1FAE5',
    },
    supplements: {
        icon: Pill,
        label: 'תוספים',
        activeLabel: 'תוספים',
        color: '#0EA5E9',
        lightColor: '#E0F2FE',
    },
    whiteNoise: {
        icon: Music,
        label: 'רעש לבן',
        activeLabel: 'רעש לבן',
        color: '#8B5CF6',
        lightColor: '#F3E8FF',
    },
    sos: {
        icon: Heart,
        label: 'SOS',
        activeLabel: 'SOS',
        color: '#EF4444',
        lightColor: '#FEE2E2',
    },
    custom: {
        icon: Plus,
        label: 'הוספה',
        activeLabel: 'הוספה',
        color: '#6B7280',
        lightColor: '#FFFFFF',
        hasBorder: true,
    },
    health: {
        icon: HeartPulse,
        label: 'בריאות',
        activeLabel: 'בריאות',
        color: '#14B8A6',
        lightColor: '#CCFBF1',
    },
    growth: {
        icon: TrendingUp,
        label: 'מעקב גדילה',
        activeLabel: 'מעקב גדילה',
        color: '#10B981',
        lightColor: '#D1FAE5',
    },
    milestones: {
        icon: Award,
        label: 'אבני דרך',
        activeLabel: 'אבני דרך',
        color: '#F59E0B',
        lightColor: '#FEF3C7',
    },
    magicMoments: {
        icon: Sparkles,
        label: 'רגעים קסומים',
        activeLabel: 'רגעים קסומים',
        color: '#A78BFA',
        lightColor: '#EDE9FE',
    },
};

/**
 * Premium Minimalist Quick Actions - Horizontal Slider with Circular Icons
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
    onHealthPress,
    onGrowthPress,
    onMilestonesPress,
    onMagicMomentsPress,
    onCustomPress,
    onFoodTimerStop,
    onSleepTimerStop,
    meds,
    dynamicStyles,
}) => {
    const { theme } = useTheme();
    const sleepTimer = useSleepTimer();
    const foodTimer = useFoodTimer();

    const { isRunning: sleepIsRunning, elapsedSeconds: sleepElapsed, formatTime: sleepFormatTime } = sleepTimer;
    const { pumpingIsRunning, pumpingElapsedSeconds, breastIsRunning, breastElapsedSeconds, breastActiveSide, leftBreastTime, rightBreastTime, formatTime: foodFormatTime, stopPumping, stopBreast } = foodTimer;

    // Check if any food timer is running
    const foodIsRunning = pumpingIsRunning || breastIsRunning;
    const foodTimerType = pumpingIsRunning ? 'pumping' : breastIsRunning ? (breastActiveSide === 'left' ? 'breast_left' : 'breast_right') : null;
    const foodElapsed = pumpingIsRunning ? pumpingElapsedSeconds : breastIsRunning ? breastElapsedSeconds : 0;

    const handlePress = useCallback((callback: () => void) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        callback();
    }, []);

    // Handler for food button - if timer running, stop and save; otherwise open modal
    const handleFoodPress = useCallback(() => {
        if (pumpingIsRunning) {
            if (onFoodTimerStop && pumpingElapsedSeconds > 0) {
                onFoodTimerStop(pumpingElapsedSeconds, 'pumping');
            }
            stopPumping();
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } else if (breastIsRunning) {
            const totalBreastTime = leftBreastTime + rightBreastTime + breastElapsedSeconds;
            if (onFoodTimerStop && totalBreastTime > 0) {
                onFoodTimerStop(totalBreastTime, breastActiveSide === 'left' ? 'breast_left' : 'breast_right');
            }
            stopBreast();
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } else {
            onFoodPress();
        }
    }, [pumpingIsRunning, breastIsRunning, pumpingElapsedSeconds, breastElapsedSeconds, leftBreastTime, rightBreastTime, breastActiveSide, stopPumping, stopBreast, onFoodPress, onFoodTimerStop]);

    // Handler for sleep button - if timer running, stop and save; otherwise open modal
    const handleSleepPress = useCallback(() => {
        if (sleepIsRunning) {
            // Save to timeline before stopping
            if (onSleepTimerStop && sleepElapsed > 0) {
                onSleepTimerStop(sleepElapsed);
            }
            sleepTimer.stop();
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } else {
            onSleepPress();
        }
    }, [sleepIsRunning, sleepTimer, sleepElapsed, onSleepPress, onSleepTimerStop]);

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

    // Single action button component - Circular minimalist design
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
                style={styles.actionItem}
                onPress={() => handlePress(onPress)}
                activeOpacity={0.7}
            >
                {/* Circular Icon */}
                <View style={[
                    styles.iconCircle,
                    { backgroundColor: isActive ? config.color : config.lightColor },
                    (config as any).hasBorder && { borderColor: '#D1D5DB', borderWidth: 1.5, borderStyle: 'dashed' }
                ]}>
                    {isActive ? (
                        <Pause size={18} color="#fff" strokeWidth={2.5} />
                    ) : (
                        <Icon size={18} color={config.color} strokeWidth={2} />
                    )}
                </View>

                {/* Label */}
                <Text style={[styles.actionLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                    {isActive ? config.activeLabel : config.label}
                </Text>

                {/* Time or Badge */}
                {activeTime && isActive ? (
                    <View style={[styles.timerBadge, { backgroundColor: config.color }]}>
                        <Timer size={8} color="#fff" />
                        <Text style={styles.timerText}>{activeTime}</Text>
                    </View>
                ) : lastTime ? (
                    <Text style={[styles.subText, { color: theme.textSecondary }]}>
                        {lastTime}
                    </Text>
                ) : badge ? (
                    <Text style={[styles.subText, { color: config.color }]}>
                        {badge}
                    </Text>
                ) : (
                    <View style={styles.subTextPlaceholder} />
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

            {/* Horizontal Slider */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sliderContent}
            >
                {/* Custom Action - Plus Button */}
                <ActionButton
                    config={ACTIONS.custom}
                    onPress={onCustomPress || (() => { })}
                />

                {/* Health */}
                <ActionButton
                    config={ACTIONS.health}
                    onPress={onHealthPress || (() => { })}
                />

                {/* Growth Tracking */}
                <ActionButton
                    config={ACTIONS.growth}
                    onPress={onGrowthPress || (() => { })}
                />

                {/* Magic Moments */}
                <ActionButton
                    config={ACTIONS.magicMoments}
                    onPress={onMagicMomentsPress || (() => { })}
                />

                {/* Milestones */}
                <ActionButton
                    config={ACTIONS.milestones}
                    onPress={onMilestonesPress || (() => { })}
                />

                {/* SOS */}
                <ActionButton
                    config={ACTIONS.sos}
                    onPress={onSOSPress}
                />

                {/* White Noise */}
                <ActionButton
                    config={ACTIONS.whiteNoise}
                    onPress={onWhiteNoisePress}
                />

                {/* Supplements */}
                <ActionButton
                    config={allTaken ? { ...ACTIONS.supplements, icon: Check } : ACTIONS.supplements}
                    onPress={onSupplementsPress}
                    badge={`${takenCount}/2`}
                />

                {/* Diaper */}
                <ActionButton
                    config={ACTIONS.diaper}
                    onPress={onDiaperPress}
                />

                {/* Sleep */}
                <ActionButton
                    config={ACTIONS.sleep}
                    onPress={handleSleepPress}
                    isActive={sleepIsRunning}
                    activeTime={sleepIsRunning ? sleepFormatTime(sleepElapsed) : undefined}
                    lastTime={!sleepIsRunning ? lastSleepTime : undefined}
                />

                {/* Food */}
                <ActionButton
                    config={ACTIONS.food}
                    onPress={handleFoodPress}
                    isActive={foodIsRunning}
                    activeTime={foodIsRunning ? foodFormatTime(foodElapsed) : undefined}
                    lastTime={!foodIsRunning ? lastFeedTime : undefined}
                />
            </ScrollView>
        </View>
    );
});

QuickActions.displayName = 'QuickActions';

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    // Horizontal Slider
    sliderContent: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        gap: 16,
    },

    // Action Item - Compact circular design
    actionItem: {
        alignItems: 'center',
        width: 56,
    },

    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        position: 'relative',
    },

    actionLabel: {
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 2,
    },

    subText: {
        fontSize: 9,
        fontWeight: '500',
    },

    subTextPlaceholder: {
        height: 12,
    },

    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 6,
    },

    timerText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#fff',
    },

    activeDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#fff',
    },
});

export default QuickActions;

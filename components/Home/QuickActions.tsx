import React, { memo, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { Utensils, Moon, Droplets, Music, Heart, Pill, Check, Timer, Plus, HeartPulse, Pause, TrendingUp, Award, Sparkles, Pencil } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import QuickActionsEditModal from './QuickActionsEditModal';

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
    const { actionOrder, hiddenActions } = useQuickActions();
    const [isEditModalVisible, setEditModalVisible] = useState(false);

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

    // Map action keys to their handlers and data
    const actionHandlers: Record<QuickActionKey, { onPress: () => void; isActive?: boolean; activeTime?: string; lastTime?: string; badge?: string }> = useMemo(() => ({
        food: { onPress: handleFoodPress, isActive: foodIsRunning, activeTime: foodIsRunning ? foodFormatTime(foodElapsed) : undefined, lastTime: !foodIsRunning ? lastFeedTime : undefined },
        sleep: { onPress: handleSleepPress, isActive: sleepIsRunning, activeTime: sleepIsRunning ? sleepFormatTime(sleepElapsed) : undefined, lastTime: !sleepIsRunning ? lastSleepTime : undefined },
        diaper: { onPress: onDiaperPress },
        supplements: { onPress: onSupplementsPress, badge: `${takenCount}/2` },
        whiteNoise: { onPress: onWhiteNoisePress },
        sos: { onPress: onSOSPress },
        health: { onPress: onHealthPress || (() => { }) },
        growth: { onPress: onGrowthPress || (() => { }) },
        milestones: { onPress: onMilestonesPress || (() => { }) },
        magicMoments: { onPress: onMagicMomentsPress || (() => { }) },
        custom: { onPress: onCustomPress || (() => { }) },
    }), [handleFoodPress, handleSleepPress, onDiaperPress, onSupplementsPress, onWhiteNoisePress, onSOSPress, onHealthPress, onGrowthPress, onMilestonesPress, onMagicMomentsPress, onCustomPress, foodIsRunning, sleepIsRunning, foodFormatTime, sleepFormatTime, foodElapsed, sleepElapsed, lastFeedTime, lastSleepTime, takenCount]);

    // Get visible actions in order
    const visibleActions = useMemo(() =>
        actionOrder.filter(key => !hiddenActions.includes(key)),
        [actionOrder, hiddenActions]);

    // Single action button component - Circular minimalist design with Scale & Bounce
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
        const scaleAnim = useRef(new Animated.Value(1)).current;

        const handlePressIn = () => {
            Animated.spring(scaleAnim, {
                toValue: 0.92,
                friction: 4,
                tension: 200,
                useNativeDriver: true,
            }).start();
        };

        const handlePressOut = () => {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3,
                tension: 100,
                useNativeDriver: true,
            }).start();
        };

        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handlePress(onPress)}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={1}
                >
                    {/* Liquid Glass Circle */}
                    <View style={[
                        styles.iconCircle,
                        isActive && { backgroundColor: config.color },
                        (config as any).hasBorder && { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1.5, borderStyle: 'dashed' }
                    ]}>
                        {!isActive && Platform.OS === 'ios' && (
                            <BlurView
                                intensity={40}
                                tint="systemChromeMaterialLight"
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        {!isActive && (
                            <View style={{
                                ...StyleSheet.absoluteFillObject,
                                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                borderRadius: 30,
                            }} />
                        )}
                        {isActive ? (
                            <Pause size={22} color="#fff" strokeWidth={2.5} />
                        ) : (
                            <Icon size={22} color={config.color} strokeWidth={2} />
                        )}
                    </View>

                    {/* Label */}
                    <Text style={[styles.actionLabel, { color: theme.textPrimary }]} numberOfLines={2}>
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
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Section Header with Edit Button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => { setEditModalVisible(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                    <Pencil size={16} color="#9CA3AF" />
                </TouchableOpacity>
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
                {/* Render visible actions in order */}
                {visibleActions.map((actionKey) => {
                    const config = actionKey === 'supplements' && allTaken
                        ? { ...ACTIONS[actionKey], icon: Check }
                        : ACTIONS[actionKey];
                    const handler = actionHandlers[actionKey];

                    return (
                        <ActionButton
                            key={actionKey}
                            config={config}
                            onPress={handler.onPress}
                            isActive={handler.isActive}
                            activeTime={handler.activeTime}
                            lastTime={handler.lastTime}
                            badge={handler.badge}
                        />
                    );
                })}
            </ScrollView>

            {/* Edit Modal */}
            <QuickActionsEditModal
                visible={isEditModalVisible}
                onClose={() => setEditModalVisible(false)}
            />
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
        width: 70,
    },

    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },

    actionLabel: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 2,
    },

    subText: {
        fontSize: 12,
        fontWeight: '500',
    },

    subTextPlaceholder: {
        height: 16,
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

    // Edit Mode Styles
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
    },
    editBtnActive: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 12,
        width: 'auto',
    },
    editBtnDoneText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    resetBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    actionWrapper: {
        position: 'relative',
    },
    editOverlay: {
        position: 'absolute',
        top: -8,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    moveArrows: {
        flexDirection: 'row',
        gap: 2,
    },
    arrowBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hideBtn: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hideBtnHidden: {
        backgroundColor: '#D1FAE5',
    },
    hiddenAction: {
        opacity: 0.4,
    },
});

export default QuickActions;

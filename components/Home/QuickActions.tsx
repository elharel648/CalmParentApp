import React, { memo, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Utensils, Moon, Droplets, Music, Heart, Pill, Check, Timer, Plus, HeartPulse, Pause, TrendingUp, Award, Sparkles, Pencil, LayoutGrid, Smile, Lightbulb } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, { 
    FadeInUp, 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming,
    withRepeat,
    interpolate,
    Extrapolation,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import QuickActionsEditModal from './QuickActionsEditModal';

// Module-level flag to prevent double animation on tab switch
let hasQuickActionsAnimated = false;

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
    onToolsPress?: () => void;
    onTeethPress?: () => void;
    onNightLightPress?: () => void;
    onCustomPress?: () => void;
    onFoodTimerStop?: (seconds: number, timerType: string) => void;
    onSleepTimerStop?: (seconds: number) => void;
    meds?: MedicationsState;
    dynamicStyles: { text: string };
}

// Custom Tooth Icon matching Lucide style - Smooth Organic Shape
const TeethIcon = ({ size, color, strokeWidth = 2 }: { size: number; color: string; strokeWidth?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7.5 22C6.5 22 5.5 21 5.5 19C5.5 15.5 5 12 5 10C5 5.5 8 2 12 2C16 2 19 5.5 19 10C19 12 18.5 15.5 18.5 19C18.5 21 17.5 22 16.5 22C15.5 22 14.5 20.5 14.5 20.5L12 18L9.5 20.5C9.5 20.5 8.5 22 7.5 22Z" />
        <Path d="M9 7C9 7 10.5 8.5 12 8.5C13.5 8.5 15 7 15 7" opacity="0.6" strokeWidth={strokeWidth * 0.8} />
    </Svg>
);

// Action button configuration
const ACTIONS: Record<string, {
    icon: any;
    label: string;
    activeLabel: string;
    color: string;
    lightColor: string;
    hasBorder?: boolean;
}> = {
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
    tools: {
        icon: LayoutGrid,
        label: 'כלים',
        activeLabel: 'כלים',
        color: '#8B5CF6',
        lightColor: '#F3E8FF',
    },
    teeth: {
        icon: TeethIcon,
        label: 'שיניים',
        activeLabel: 'שיניים',
        color: '#EC4899',
        lightColor: '#FDF2F8',
    },
    nightLight: {
        icon: Lightbulb,
        label: 'פנס לילה',
        activeLabel: 'פנס לילה',
        color: '#F59E0B',
        lightColor: '#FEF3C7',
    },
};

/**
 * Premium Minimalist Quick Actions - Apple-inspired design with perfect animations
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
    onToolsPress,
    onTeethPress,
    onNightLightPress,
    onCustomPress,
    onFoodTimerStop,
    onSleepTimerStop,
    meds,
    dynamicStyles,
}) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const sleepTimer = useSleepTimer();
    const foodTimer = useFoodTimer();
    const { actionOrder, hiddenActions } = useQuickActions();
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    
    // Get translated labels
    const getActionLabel = (key: string, isActive: boolean) => {
        const actionKey = `actions.${key}`;
        if (isActive && (key === 'food' || key === 'sleep')) {
            return t(`actions.active.${key}`);
        }
        return t(actionKey);
    };

    const { isRunning: sleepIsRunning, elapsedSeconds: sleepElapsed, formatTime: sleepFormatTime } = sleepTimer;
    const { pumpingIsRunning, pumpingElapsedSeconds, breastIsRunning, breastElapsedSeconds, breastActiveSide, leftBreastTime, rightBreastTime, formatTime: foodFormatTime, stopPumping, stopBreast } = foodTimer;

    const foodIsRunning = pumpingIsRunning || breastIsRunning;
    const foodTimerType = pumpingIsRunning ? 'pumping' : breastIsRunning ? (breastActiveSide === 'left' ? 'breast_left' : 'breast_right') : null;
    const foodElapsed = pumpingIsRunning ? pumpingElapsedSeconds : breastIsRunning ? breastElapsedSeconds : 0;

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

    const handleSleepPress = useCallback(() => {
        if (sleepIsRunning) {
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

    const takenCount = (meds?.vitaminD ? 1 : 0) + (meds?.iron ? 1 : 0);
    const allTaken = takenCount === 2;

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 50);

        if (!hasQuickActionsAnimated) {
            const timer = setTimeout(() => {
                hasQuickActionsAnimated = true;
            }, 400);
            return () => clearTimeout(timer);
        }
    }, []);

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
        tools: { onPress: onToolsPress || (() => { }) },
        teeth: { onPress: onTeethPress || (() => { }) },
        nightLight: { onPress: onNightLightPress || (() => { }) },
        custom: { onPress: onCustomPress || (() => { }) },
    }), [handleFoodPress, handleSleepPress, onDiaperPress, onSupplementsPress, onWhiteNoisePress, onSOSPress, onHealthPress, onGrowthPress, onMilestonesPress, onMagicMomentsPress, onToolsPress, onTeethPress, onNightLightPress, onCustomPress, foodIsRunning, sleepIsRunning, foodFormatTime, sleepFormatTime, foodElapsed, sleepElapsed, lastFeedTime, lastSleepTime, takenCount]);

    const visibleActions = useMemo(() =>
        actionOrder.filter(key => !hiddenActions.includes(key)),
        [actionOrder, hiddenActions]);

    // Premium Action Button with perfect animations
    const ActionButton = ({
        config,
        configKey,
        onPress,
        isActive = false,
        activeTime,
        lastTime,
        badge,
        index,
    }: {
        config: typeof ACTIONS.food;
        configKey: string;
        onPress: () => void;
        isActive?: boolean;
        activeTime?: string;
        lastTime?: string;
        badge?: string;
        index: number;
    }) => {
        const Icon = config.icon;
        const scale = useSharedValue(1);
        const opacity = useSharedValue(1);
        const iconScale = useSharedValue(1);
        const pulseScale = useSharedValue(1);

        // Pulse animation for active state
        useEffect(() => {
            if (isActive) {
                pulseScale.value = withRepeat(
                    withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    -1,
                    true
                );
            } else {
                pulseScale.value = withTiming(1, { duration: 200 });
            }
        }, [isActive]);

        const handlePressIn = useCallback(() => {
            scale.value = withSpring(0.92, {
                damping: 15,
                stiffness: 400,
                mass: 0.5,
            });
            iconScale.value = withSpring(0.9, {
                damping: 15,
                stiffness: 400,
                mass: 0.5,
            });
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }, []);

        const handlePressOut = useCallback(() => {
            scale.value = withSpring(1, {
                damping: 15,
                stiffness: 400,
                mass: 0.5,
            });
            iconScale.value = withSpring(1, {
                damping: 15,
                stiffness: 400,
                mass: 0.5,
            });
        }, []);

        const handlePress = useCallback(() => {
            iconScale.value = withSpring(1.1, {
                damping: 10,
                stiffness: 500,
                mass: 0.3,
            }, () => {
                iconScale.value = withSpring(1, {
                    damping: 15,
                    stiffness: 400,
                    mass: 0.4,
                });
            });
            onPress();
        }, [onPress]);

        const containerStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        }));

        const iconContainerStyle = useAnimatedStyle(() => ({
            transform: [{ scale: iconScale.value * (isActive ? pulseScale.value : 1) }],
        }));

        return (
            <Animated.View
                entering={!hasQuickActionsAnimated ? FadeInUp.duration(400).delay(index * 50).springify() : undefined}
                style={[styles.actionButtonWrapper, containerStyle]}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={styles.actionItem}
                >
                    {/* Premium Glass Icon Circle */}
                    <Animated.View style={iconContainerStyle}>
                        <View style={[
                            styles.iconCircleContainer,
                            isActive && { backgroundColor: config.color },
                            (config as any).hasBorder && styles.iconCircleBorder
                        ]}>
                            {/* Glass effect for inactive state */}
                            {!isActive && (
                                <>
                                    {Platform.OS === 'ios' && (
                                        <BlurView
                                            intensity={60}
                                            tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <View style={[
                                        styles.iconCircleGlass,
                                        { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)' }
                                    ]} />
                                </>
                            )}
                            
                            {/* Icon */}
                            {isActive ? (
                                <Pause size={20} color="#fff" strokeWidth={2.5} />
                            ) : (
                                <Icon size={20} color={config.color} strokeWidth={2} />
                            )}
                        </View>
                    </Animated.View>

                {/* Label */}
                <Text style={[styles.actionLabel, { color: theme.textPrimary }]} numberOfLines={2}>
                        {isActive ? getActionLabel(configKey as string, true) : getActionLabel(configKey as string, false)}
                </Text>

                    {/* Time, Badge, or Last Time */}
                {activeTime && isActive ? (
                    <View style={[styles.timerBadge, { backgroundColor: config.color }]}>
                            <Timer size={7} color="#fff" strokeWidth={2} />
                        <Text style={styles.timerText}>{activeTime}</Text>
                    </View>
                ) : lastTime ? (
                    <Text style={[styles.subText, { color: theme.textSecondary }]}>
                        {lastTime}
                    </Text>
                ) : badge ? (
                        <View style={[styles.badgeContainer, { backgroundColor: config.lightColor }]}>
                            <Text style={[styles.badgeText, { color: config.color }]}>
                        {badge}
                    </Text>
                        </View>
                ) : (
                    <View style={styles.subTextPlaceholder} />
                )}
            </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Section Header */}
            <View style={styles.header}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    {t('home.quickActions')}
                </Text>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => { 
                        setEditModalVisible(true); 
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                    }}
                    activeOpacity={0.7}
                >
                    <Pencil size={13} color={theme.textSecondary} strokeWidth={2} />
                    <Text style={[styles.editBtnText, { color: theme.textSecondary }]}>{t('stats.editOrder')}</Text>
                </TouchableOpacity>
            </View>

            {/* Horizontal Slider */}
            <View style={styles.sliderWrapper}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sliderContent}
                    bounces={true}
                    decelerationRate="fast"
            >
                    {visibleActions.map((actionKey, index) => {
                    const config = actionKey === 'supplements' && allTaken
                        ? { ...ACTIONS[actionKey], icon: Check }
                        : ACTIONS[actionKey];
                    const handler = actionHandlers[actionKey];

                    return (
                        <ActionButton
                            key={actionKey}
                            config={config}
                                configKey={actionKey}
                            onPress={handler.onPress}
                            isActive={handler.isActive}
                            activeTime={handler.activeTime}
                            lastTime={handler.lastTime}
                            badge={handler.badge}
                                index={index}
                        />
                    );
                })}
            </ScrollView>
                {/* Scroll Indicator - Show if more than 4 actions */}
                {visibleActions.length > 4 && (
                    <View style={styles.scrollIndicator}>
                        <View style={[styles.scrollDot, { backgroundColor: theme.textTertiary }]} />
                    </View>
                )}
            </View>

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
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    editBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
    editBtnText: {
        fontSize: 13,
        fontWeight: '500',
    },
    sliderWrapper: {
        position: 'relative',
    },
    sliderContent: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        gap: 16,
    },
    scrollIndicator: {
        position: 'absolute',
        bottom: -8,
        left: '50%',
        transform: [{ translateX: -6 }],
        flexDirection: 'row',
        gap: 4,
    },
    scrollDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        opacity: 0.4,
    },
    actionButtonWrapper: {
        alignItems: 'center',
    },
    actionItem: {
        alignItems: 'center',
        width: 70,
    },
    iconCircleContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden',
        // Premium shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    iconCircleBorder: {
        borderWidth: 1.5,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderStyle: 'dashed',
    },
    iconCircleGlass: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 30,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    subText: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.7,
    },
    subTextPlaceholder: {
        height: 14,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 2,
    },
    timerText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.2,
    },
    badgeContainer: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 2,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
});

export default QuickActions;

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Moon, Utensils, Droplets, Timer, X, Play, Pause, Clock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useFoodTimer } from '../context/FoodTimerContext';
import { useDynamicIsland } from '../context/DynamicIslandContext';
import { useAppleWatch } from '../hooks/useAppleWatch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPACT_WIDTH = 126; // Compact state width (Apple-like)
const EXPANDED_WIDTH = SCREEN_WIDTH - 40; // Expanded state width
const COMPACT_HEIGHT = 37; // Apple's compact height
const EXPANDED_HEIGHT = 88; // Slightly taller for better content display

export default function DynamicIsland() {
    const { theme, isDarkMode } = useTheme();
    const { isRunning: sleepRunning, elapsedSeconds: sleepSeconds, formatTime: formatSleepTime, start: startSleep, stop: stopSleep } = useSleepTimer();
    const { 
        pumpingIsRunning, 
        pumpingElapsedSeconds, 
        breastIsRunning, 
        breastActiveSide,
        leftBreastTime,
        rightBreastTime,
        formatTime: formatFoodTime,
        startPumping,
        stopPumping,
        startBreast,
        stopBreast,
    } = useFoodTimer();
    const { content, isVisible, onDismiss } = useDynamicIsland();
    const { sendTimer, sendClock, stop: stopWatch } = useAppleWatch();
    
    // Real-time clock
    const [currentTime, setCurrentTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    
    const formatClockTime = (date: Date) => {
        return date.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const width = useSharedValue(COMPACT_WIDTH);
    const height = useSharedValue(COMPACT_HEIGHT);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    // Determine active content - prioritize custom content, then timers, then clock (always show clock)
    let activeContent: any = null;
    if (content) {
        activeContent = content;
    } else if (sleepRunning) {
        activeContent = { type: 'sleep', time: sleepSeconds };
    } else if (pumpingIsRunning) {
        activeContent = { type: 'pumping', time: pumpingElapsedSeconds };
    } else if (breastIsRunning) {
        activeContent = { type: 'breast', side: breastActiveSide, leftTime: leftBreastTime, rightTime: rightBreastTime };
    } else {
        // Always show clock when no timers are active
        activeContent = { type: 'clock', time: currentTime };
    }

    // Active if there's content or timers, or always show clock
    const isActive = !!activeContent || isVisible;

    useEffect(() => {
        if (isActive) {
            // Premium expand animation - Apple-like smooth spring
            width.value = withSpring(EXPANDED_WIDTH, {
                damping: 18,
                stiffness: 350,
                mass: 0.7,
            });
            height.value = withSpring(EXPANDED_HEIGHT, {
                damping: 18,
                stiffness: 350,
                mass: 0.7,
            });
            opacity.value = withTiming(1, { duration: 250 });
            scale.value = withSpring(1, {
                damping: 12,
                stiffness: 450,
                mass: 0.6,
            });
        } else {
            // Premium collapse animation
            width.value = withSpring(COMPACT_WIDTH, {
                damping: 18,
                stiffness: 350,
                mass: 0.7,
            });
            height.value = withSpring(COMPACT_HEIGHT, {
                damping: 18,
                stiffness: 350,
                mass: 0.7,
            });
            opacity.value = withTiming(0, { duration: 180 });
            scale.value = withSpring(0.85, {
                damping: 12,
                stiffness: 450,
                mass: 0.6,
            });
            // Stop watch when Dynamic Island collapses
            if (!isActive) {
                stopWatch();
            }
        }
    }, [isActive, stopWatch]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: width.value,
        height: height.value,
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    const getContent = () => {
        if (content) {
            // Sync custom content to Apple Watch if it's a timer
            if (content.type === 'timer' && content.subtitle) {
                sendTimer({
                    title: content.title,
                    time: content.subtitle,
                    isRunning: true,
                    color: content.color || theme.primary,
                });
            }
            
            return {
                icon: content.icon || Clock,
                title: content.title,
                subtitle: content.subtitle,
                color: content.color || theme.primary,
            };
        }

        if (sleepRunning) {
            const sleepTime = formatSleepTime(sleepSeconds);
            // Sync timer to Apple Watch
            sendTimer({
                title: 'שינה',
                time: sleepTime,
                isRunning: true,
                color: '#8B5CF6',
            });
            
            return {
                icon: Moon,
                title: 'שינה',
                subtitle: sleepTime,
                color: '#8B5CF6',
            };
        }

        if (pumpingIsRunning) {
            const pumpingTime = formatFoodTime(pumpingElapsedSeconds);
            // Sync timer to Apple Watch
            sendTimer({
                title: 'שאיבה',
                time: pumpingTime,
                isRunning: true,
                color: '#F59E0B',
            });
            
            return {
                icon: Droplets,
                title: 'שאיבה',
                subtitle: pumpingTime,
                color: '#F59E0B',
            };
        }

        if (breastIsRunning && breastActiveSide) {
            const sideText = breastActiveSide === 'left' ? 'שמאל' : 'ימין';
            const currentTime = breastActiveSide === 'left' ? leftBreastTime : rightBreastTime;
            const breastTime = formatFoodTime(currentTime);
            
            // Sync timer to Apple Watch
            sendTimer({
                title: `הנקה - ${sideText}`,
                time: breastTime,
                isRunning: true,
                color: '#10B981',
            });
            
            return {
                icon: Utensils,
                title: `הנקה - ${sideText}`,
                subtitle: breastTime,
                color: '#10B981',
            };
        }

        // Default: Show clock
        const clockTime = formatClockTime(currentTime);
        const clockDate = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
        
        // Sync clock to Apple Watch
        sendClock(clockTime, clockDate);
        
        return {
            icon: Clock,
            title: clockTime,
            subtitle: clockDate,
            color: '#6366F1',
        };
    };

    const contentData = getContent();
    
    // Always render for debugging - will be hidden with opacity if not active
    // if (!contentData && !isActive) return null;

    const Icon = contentData?.icon || Timer;

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <BlurView
                intensity={Platform.OS === 'ios' ? 80 : 40}
                tint={isDarkMode ? 'dark' : 'extraLight'}
                style={[
                    styles.blurContainer,
                    {
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    },
                ]}
            >
                {/* Content */}
                <View style={styles.content}>
                    {contentData && (
                        <>
                            <View style={[styles.iconContainer, { backgroundColor: contentData.color + '20' }]}>
                                <Icon size={18} color={contentData.color} strokeWidth={2.5} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {contentData.title}
                                </Text>
                                {contentData.subtitle && (
                                    <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {contentData.subtitle}
                                    </Text>
                                )}
                            </View>
                            
                            {/* Control Buttons for Active Timers */}
                            {!content && (sleepRunning || pumpingIsRunning || breastIsRunning) && (
                                <TouchableOpacity
                                    style={[styles.controlButton, { backgroundColor: contentData.color }]}
                                    onPress={() => {
                                        if (sleepRunning) {
                                            stopSleep();
                                        } else if (pumpingIsRunning) {
                                            stopPumping();
                                        } else if (breastIsRunning) {
                                            stopBreast();
                                        }
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Pause size={16} color="#fff" strokeWidth={2.5} />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                    {onDismiss && (
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onDismiss}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={14} color={theme.textSecondary} strokeWidth={2} />
                        </TouchableOpacity>
                    )}
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 12 : 8,
        alignSelf: 'center',
        zIndex: 10000,
    },
    blurContainer: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 30, // More rounded for premium feel
        overflow: 'hidden',
        borderWidth: 0.5,
        // Premium shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        // Subtle inner shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    textContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 20,
        letterSpacing: -0.2, // Tighter letter spacing for premium feel
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 3,
        letterSpacing: -0.1,
        fontVariant: ['tabular-nums'], // Monospaced numbers for timer
    },
    closeButton: {
        padding: 4,
    },
    controlButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        // Premium shadow with glow effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 5,
        // Subtle border for depth
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});


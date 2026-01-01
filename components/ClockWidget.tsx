import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useDynamicIsland } from '../context/DynamicIslandContext';
import { useClockTimer } from '../hooks/useClockTimer';
import { useAppleWatch } from '../hooks/useAppleWatch';
import * as Haptics from 'expo-haptics';

interface ClockWidgetProps {
    initialDuration?: number; // Countdown duration in seconds (0 = stopwatch)
    onComplete?: () => void;
}

export default function ClockWidget({ initialDuration = 0, onComplete }: ClockWidgetProps) {
    const { theme, isDarkMode } = useTheme();
    const { show: showDynamicIsland, hide: hideDynamicIsland, isVisible, updateContent } = useDynamicIsland();
    const { sendTimer, stop: stopWatch } = useAppleWatch();
    const { isRunning, remainingSeconds, elapsedSeconds, start, pause, reset, formatTime } = useClockTimer({
        duration: initialDuration > 0 ? initialDuration : undefined,
        onComplete: () => {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            if (onComplete) {
                onComplete();
            }
            // Auto-hide after completion
            setTimeout(() => {
                hideDynamicIsland();
            }, 2000);
        },
    });

    const currentTime = initialDuration > 0 ? remainingSeconds : elapsedSeconds;
    const isCountdown = initialDuration > 0;

    useEffect(() => {
        // Show in Dynamic Island when timer starts
        if (isRunning) {
            showDynamicIsland({
                type: 'timer',
                title: isCountdown ? 'ספירה לאחור' : 'שעון עצר',
                subtitle: formatTime(currentTime),
                icon: Clock,
                color: '#6366F1',
                duration: 0, // Don't auto-hide
            });
        } else if (!isRunning && isVisible) {
            // Hide when paused
            hideDynamicIsland();
        }
    }, [isRunning, isCountdown, formatTime, showDynamicIsland, hideDynamicIsland, isVisible]);

    // Update Dynamic Island subtitle in real-time and sync to Apple Watch
    useEffect(() => {
        if (isRunning && isVisible) {
            const timeStr = formatTime(currentTime);
            updateContent({
                subtitle: timeStr,
            });
            // Sync to Apple Watch
            sendTimer({
                title: isCountdown ? 'ספירה לאחור' : 'שעון עצר',
                time: timeStr,
                isRunning: true,
                color: '#6366F1',
            });
        } else if (!isRunning) {
            // Stop watch when timer stops
            stopWatch();
        }
    }, [currentTime, isRunning, formatTime, updateContent, isVisible, isCountdown, sendTimer, stopWatch]);

    const handleToggle = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        if (isRunning) {
            pause();
        } else {
            start();
        }
    };

    const handleReset = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        reset();
        hideDynamicIsland();
    };

    return (
        <View style={styles.container}>
            <BlurView
                intensity={Platform.OS === 'ios' ? 80 : 40}
                tint={isDarkMode ? 'dark' : 'extraLight'}
                style={[styles.blurContainer, { borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
            >
                <View style={styles.content}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: '#6366F1' + '20' }]}>
                        <Clock size={20} color="#6366F1" strokeWidth={2.5} />
                    </View>

                    {/* Time Display */}
                    <View style={styles.timeContainer}>
                        <Text style={[styles.timeText, { color: theme.textPrimary }]}>
                            {formatTime(currentTime)}
                        </Text>
                        <Text style={[styles.labelText, { color: theme.textSecondary }]}>
                            {isCountdown ? 'ספירה לאחור' : 'שעון עצר'}
                        </Text>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: isRunning ? '#EF4444' : '#10B981' }]}
                            onPress={handleToggle}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            {isRunning ? (
                                <Pause size={16} color="#fff" strokeWidth={2.5} />
                            ) : (
                                <Play size={16} color="#fff" strokeWidth={2.5} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: '#6B7280' }]}
                            onPress={handleReset}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <RotateCcw size={14} color="#fff" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginTop: 20,
    },
    blurContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 0.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    timeText: {
        fontSize: 24,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.5,
    },
    labelText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    controls: {
        flexDirection: 'row',
        gap: 8,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 5,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});


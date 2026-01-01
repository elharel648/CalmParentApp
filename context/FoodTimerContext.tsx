import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { liveActivityService } from '../services/liveActivityService';

interface FoodTimerContextType {
    // Pumping Timer
    pumpingIsRunning: boolean;
    pumpingElapsedSeconds: number;
    startPumping: () => void;
    stopPumping: () => void;
    resetPumping: () => void;

    // Breastfeeding Timer
    breastIsRunning: boolean;
    breastActiveSide: 'left' | 'right' | null;
    breastElapsedSeconds: number;
    leftBreastTime: number;
    rightBreastTime: number;
    startBreast: (side: 'left' | 'right') => void;
    stopBreast: () => void;
    resetBreast: () => void;

    // Utility
    formatTime: (seconds: number) => string;
}

const FoodTimerContext = createContext<FoodTimerContextType | undefined>(undefined);

export const useFoodTimer = () => {
    const context = useContext(FoodTimerContext);
    if (!context) {
        throw new Error('useFoodTimer must be used within FoodTimerProvider');
    }
    return context;
};

interface FoodTimerProviderProps {
    children: ReactNode;
}

export const FoodTimerProvider = ({ children }: FoodTimerProviderProps) => {
    // === PUMPING TIMER ===
    const [pumpingIsRunning, setPumpingIsRunning] = useState(false);
    const [pumpingElapsedSeconds, setPumpingElapsedSeconds] = useState(0);
    const pumpingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pumpingActivityIdRef = useRef<string | undefined>(undefined);

    // Pumping timer effect with Live Activity updates
    useEffect(() => {
        if (pumpingIsRunning) {
            pumpingTimerRef.current = setInterval(() => {
                setPumpingElapsedSeconds(prev => {
                    const newSeconds = prev + 1;
                    // Update Live Activity every second
                    if (Platform.OS === 'ios' && pumpingActivityIdRef.current) {
                        liveActivityService.updatePumpingTimer(newSeconds).catch(() => {
                            // Silently fail if update doesn't work
                        });
                    }
                    return newSeconds;
                });
            }, 1000);
        } else {
            if (pumpingTimerRef.current) {
                clearInterval(pumpingTimerRef.current);
                pumpingTimerRef.current = null;
            }
        }
        return () => {
            if (pumpingTimerRef.current) clearInterval(pumpingTimerRef.current);
        };
    }, [pumpingIsRunning]);

    const startPumping = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPumpingIsRunning(true);
        setPumpingElapsedSeconds(0);

        // Start iOS Live Activity (ActivityKit)
        if (Platform.OS === 'ios') {
            try {
                const activityId = await liveActivityService.startPumpingTimer();
                if (activityId) {
                    pumpingActivityIdRef.current = activityId;
                    if (__DEV__) console.log('✅ Live Activity started:', activityId);
                }
            } catch (error) {
                if (__DEV__) console.warn('⚠️ Live Activity not supported:', error);
            }
        }
    }, []);

    const stopPumping = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPumpingIsRunning(false);
        
        // Stop iOS Live Activity (ActivityKit)
        if (Platform.OS === 'ios' && pumpingActivityIdRef.current) {
            try {
                await liveActivityService.stopPumpingTimer();
                pumpingActivityIdRef.current = undefined;
                if (__DEV__) console.log('✅ Live Activity stopped');
            } catch (error) {
                if (__DEV__) console.warn('⚠️ Error stopping Live Activity:', error);
            }
        }
    }, []);

    const resetPumping = useCallback(() => {
        setPumpingIsRunning(false);
        setPumpingElapsedSeconds(0);
    }, []);

    // === BREASTFEEDING TIMER ===
    const [breastIsRunning, setBreastIsRunning] = useState(false);
    const [breastActiveSide, setBreastActiveSide] = useState<'left' | 'right' | null>(null);
    const [breastElapsedSeconds, setBreastElapsedSeconds] = useState(0);
    const [leftBreastTime, setLeftBreastTime] = useState(0);
    const [rightBreastTime, setRightBreastTime] = useState(0);
    const breastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const breastActivityIdRef = useRef<string | undefined>(undefined);

    // Breast timer effect
    useEffect(() => {
        if (breastIsRunning && breastActiveSide) {
            breastTimerRef.current = setInterval(() => {
                setBreastElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (breastTimerRef.current) {
                clearInterval(breastTimerRef.current);
                breastTimerRef.current = null;
            }
        }
        return () => {
            if (breastTimerRef.current) clearInterval(breastTimerRef.current);
        };
    }, [breastIsRunning, breastActiveSide]);

    const startBreast = useCallback((side: 'left' | 'right') => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // If switching sides, accumulate current time first
        if (breastIsRunning && breastActiveSide && breastActiveSide !== side) {
            if (breastActiveSide === 'left') {
                setLeftBreastTime(prev => prev + breastElapsedSeconds);
            } else {
                setRightBreastTime(prev => prev + breastElapsedSeconds);
            }
        }

        setBreastActiveSide(side);
        setBreastIsRunning(true);
        setBreastElapsedSeconds(0);

        // Start iOS Live Activity
        if (Platform.OS === 'ios') {
            try {
                // Stop existing activity first
                if (breastActivityIdRef.current) {
                    LiveActivity.stopActivity(breastActivityIdRef.current, {
                        title: 'הנקה',
                        subtitle: '',
                    });
                }
                const sideText = side === 'left' ? 'שמאל' : 'ימין';
                const activityId = LiveActivity.startActivity(
                    {
                        title: `הנקה ${sideText}`,
                        subtitle: '',
                        progressBar: { date: Date.now() },
                    },
                    {
                        backgroundColor: '#EC4899',
                        titleColor: '#FFFFFF',
                        subtitleColor: '#FBCFE8',
                        progressViewTint: '#F472B6',
                        progressViewLabelColor: '#FFFFFF',
                        deepLinkUrl: '/home',
                        timerType: 'digital',
                    }
                );
                if (activityId) breastActivityIdRef.current = activityId;
            } catch (error) {
                if (__DEV__) console.log('Live Activity not supported:', error);
            }
        }
    }, [breastIsRunning, breastActiveSide, breastElapsedSeconds]);

    const stopBreast = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Accumulate time before stopping
        if (breastActiveSide === 'left') {
            setLeftBreastTime(prev => prev + breastElapsedSeconds);
        } else if (breastActiveSide === 'right') {
            setRightBreastTime(prev => prev + breastElapsedSeconds);
        }

        setBreastIsRunning(false);
        setBreastElapsedSeconds(0);

        // Stop iOS Live Activity
        if (Platform.OS === 'ios' && breastActivityIdRef.current) {
            try {
                LiveActivity.stopActivity(breastActivityIdRef.current, {
                    title: 'הנקה הסתיימה',
                    subtitle: '',
                });
                breastActivityIdRef.current = undefined;
            } catch (error) {
                if (__DEV__) console.log('Error stopping Live Activity:', error);
            }
        }
    }, [breastActiveSide, breastElapsedSeconds]);

    const resetBreast = useCallback(() => {
        setBreastIsRunning(false);
        setBreastActiveSide(null);
        setBreastElapsedSeconds(0);
        setLeftBreastTime(0);
        setRightBreastTime(0);
    }, []);

    // === UTILITY ===
    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return (
        <FoodTimerContext.Provider
            value={{
                // Pumping
                pumpingIsRunning,
                pumpingElapsedSeconds,
                startPumping,
                stopPumping,
                resetPumping,
                // Breastfeeding
                breastIsRunning,
                breastActiveSide,
                breastElapsedSeconds,
                leftBreastTime,
                rightBreastTime,
                startBreast,
                stopBreast,
                resetBreast,
                // Utility
                formatTime,
            }}
        >
            {children}
        </FoodTimerContext.Provider>
    );
};

export default FoodTimerProvider;

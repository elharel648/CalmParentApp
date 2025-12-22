import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as LiveActivity from 'expo-live-activity';

interface SleepTimerContextType {
    isRunning: boolean;
    elapsedSeconds: number;
    startTime: Date | null;
    start: () => void;
    stop: () => void;
    reset: () => void;
    formatTime: (seconds: number) => string;
}

const SleepTimerContext = createContext<SleepTimerContextType | undefined>(undefined);

export const useSleepTimer = () => {
    const context = useContext(SleepTimerContext);
    if (!context) {
        throw new Error('useSleepTimer must be used within SleepTimerProvider');
    }
    return context;
};

interface SleepTimerProviderProps {
    children: ReactNode;
}

export const SleepTimerProvider = ({ children }: SleepTimerProviderProps) => {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activityIdRef = useRef<string | undefined>(undefined);

    // Timer effect
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRunning]);

    const start = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        setIsRunning(true);
        setStartTime(new Date());
        setElapsedSeconds(0);

        // Start iOS Live Activity for Dynamic Island
        if (Platform.OS === 'ios') {
            try {
                const activityId = LiveActivity.startActivity(
                    {
                        title: 'שינה',
                        subtitle: 'התינוק ישן',
                        progressBar: {
                            date: Date.now() + (8 * 60 * 60 * 1000), // 8 hours max
                        },
                        imageName: 'sleep',
                        dynamicIslandImageName: 'sleep',
                    },
                    {
                        backgroundColor: '#6366F1',
                        titleColor: '#FFFFFF',
                        subtitleColor: '#E0E7FF',
                        progressViewTint: '#A5B4FC',
                        progressViewLabelColor: '#FFFFFF',
                        deepLinkUrl: '/home',
                        timerType: 'digital',
                    }
                );
                if (activityId) {
                    activityIdRef.current = activityId;
                }
            } catch (error) {
                if (__DEV__) console.log('Live Activity not supported:', error);
            }
        }
    }, []);

    const stop = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setIsRunning(false);

        // Stop iOS Live Activity
        if (Platform.OS === 'ios' && activityIdRef.current) {
            try {
                LiveActivity.stopActivity(activityIdRef.current, {
                    title: 'שינה הסתיימה',
                    subtitle: 'התינוק התעורר',
                    imageName: 'sleep',
                });
                activityIdRef.current = undefined;
            } catch (error) {
                if (__DEV__) console.log('Error stopping Live Activity:', error);
            }
        }
    }, []);

    const reset = useCallback(() => {
        setIsRunning(false);
        setElapsedSeconds(0);
        setStartTime(null);
    }, []);

    const formatTime = useCallback((seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return (
        <SleepTimerContext.Provider
            value={{
                isRunning,
                elapsedSeconds,
                startTime,
                start,
                stop,
                reset,
                formatTime,
            }}
        >
            {children}
        </SleepTimerContext.Provider>
    );
};

export default SleepTimerProvider;

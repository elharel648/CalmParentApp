import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface FoodTimerContextType {
    isRunning: boolean;
    elapsedSeconds: number;
    timerType: 'pumping' | 'breast_left' | 'breast_right' | null;
    start: (type: 'pumping' | 'breast_left' | 'breast_right') => void;
    stop: () => void;
    reset: () => void;
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
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerType, setTimerType] = useState<'pumping' | 'breast_left' | 'breast_right' | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    const start = useCallback((type: 'pumping' | 'breast_left' | 'breast_right') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setTimerType(type);
        setIsRunning(true);
        setElapsedSeconds(0);
    }, []);

    const stop = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        setIsRunning(false);
        setElapsedSeconds(0);
        setTimerType(null);
    }, []);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return (
        <FoodTimerContext.Provider
            value={{
                isRunning,
                elapsedSeconds,
                timerType,
                start,
                stop,
                reset,
                formatTime,
            }}
        >
            {children}
        </FoodTimerContext.Provider>
    );
};

export default FoodTimerProvider;

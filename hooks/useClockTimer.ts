import { useState, useEffect, useCallback } from 'react';

export interface ClockTimerConfig {
    duration?: number; // Countdown duration in seconds
    onComplete?: () => void;
    autoStart?: boolean;
}

export function useClockTimer(config: ClockTimerConfig = {}) {
    const { duration, onComplete, autoStart = false } = config;
    const [isRunning, setIsRunning] = useState(autoStart);
    const [remainingSeconds, setRemainingSeconds] = useState(duration || 0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        if (isRunning) {
            interval = setInterval(() => {
                if (duration) {
                    // Countdown mode
                    setRemainingSeconds((prev) => {
                        if (prev <= 1) {
                            setIsRunning(false);
                            if (onComplete) {
                                onComplete();
                            }
                            return 0;
                        }
                        return prev - 1;
                    });
                } else {
                    // Stopwatch mode
                    setElapsedSeconds((prev) => prev + 1);
                }
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, duration, onComplete]);

    const start = useCallback(() => {
        setIsRunning(true);
    }, []);

    const pause = useCallback(() => {
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        setIsRunning(false);
        setRemainingSeconds(duration || 0);
        setElapsedSeconds(0);
    }, [duration]);

    const formatTime = useCallback((seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        isRunning,
        remainingSeconds,
        elapsedSeconds,
        start,
        pause,
        reset,
        formatTime,
    };
}


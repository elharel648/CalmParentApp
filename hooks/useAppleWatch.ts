import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { watchService } from '../services/watchService';

interface UseAppleWatchResult {
    isAvailable: boolean;
    isConnected: boolean;
    sendTimer: (data: { title: string; time: string; isRunning: boolean; color?: string }) => Promise<void>;
    sendClock: (time: string, date?: string) => Promise<void>;
    stop: () => Promise<void>;
}

/**
 * Hook for Apple Watch integration
 * Automatically syncs timers and clock to Apple Watch
 */
export function useAppleWatch(): UseAppleWatchResult {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'ios') {
            checkWatchAvailability();
        }
    }, []);

    const checkWatchAvailability = async () => {
        const available = await watchService.isWatchAvailable();
        setIsAvailable(available);
        setIsConnected(available);
    };

    const sendTimer = useCallback(async (data: { title: string; time: string; isRunning: boolean; color?: string }) => {
        if (isAvailable) {
            await watchService.sendTimer(data);
        }
    }, [isAvailable]);

    const sendClock = useCallback(async (time: string, date?: string) => {
        if (isAvailable) {
            await watchService.sendClock(time, date);
        }
    }, [isAvailable]);

    const stop = useCallback(async () => {
        if (isAvailable) {
            await watchService.stop();
        }
    }, [isAvailable]);

    return {
        isAvailable,
        isConnected,
        sendTimer,
        sendClock,
        stop,
    };
}


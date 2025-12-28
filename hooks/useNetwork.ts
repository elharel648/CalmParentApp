import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NetworkStatus {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: string;
}

interface UseNetworkReturn {
    isOnline: boolean;
    isOffline: boolean;
    networkType: string;
    checkConnection: () => Promise<boolean>;
}

const OFFLINE_QUEUE_KEY = '@offline_queue';

/**
 * Hook for monitoring network connectivity
 */
export function useNetwork(): UseNetworkReturn {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isConnected: true,
        isInternetReachable: true,
        type: 'unknown',
    });

    useEffect(() => {
        // Subscribe to network state updates
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setNetworkStatus({
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            });
        });

        // Check initial state
        NetInfo.fetch().then((state) => {
            setNetworkStatus({
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            });
        });

        return () => unsubscribe();
    }, []);

    const checkConnection = useCallback(async (): Promise<boolean> => {
        const state = await NetInfo.fetch();
        return state.isConnected ?? false;
    }, []);

    return {
        isOnline: networkStatus.isConnected && networkStatus.isInternetReachable !== false,
        isOffline: !networkStatus.isConnected || networkStatus.isInternetReachable === false,
        networkType: networkStatus.type,
        checkConnection,
    };
}

/**
 * Queue for offline actions
 */
interface QueuedAction {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
}

export async function queueOfflineAction(type: string, payload: any): Promise<void> {
    try {
        const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue: QueuedAction[] = existing ? JSON.parse(existing) : [];

        queue.push({
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            payload,
            timestamp: Date.now(),
        });

        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('Error queuing offline action:', error);
    }
}

export async function getOfflineQueue(): Promise<QueuedAction[]> {
    try {
        const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        return existing ? JSON.parse(existing) : [];
    } catch (error) {
        console.error('Error getting offline queue:', error);
        return [];
    }
}

export async function clearOfflineQueue(): Promise<void> {
    try {
        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
        console.error('Error clearing offline queue:', error);
    }
}

export async function removeFromQueue(id: string): Promise<void> {
    try {
        const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!existing) return;

        const queue: QueuedAction[] = JSON.parse(existing);
        const filtered = queue.filter(item => item.id !== id);

        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error removing from queue:', error);
    }
}

export default useNetwork;

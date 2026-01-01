import { NativeModules, Platform } from 'react-native';

const { ActivityKitManager } = NativeModules;

interface LiveActivityService {
    startPumpingTimer: () => Promise<string>;
    updatePumpingTimer: (elapsedSeconds: number) => Promise<boolean>;
    stopPumpingTimer: () => Promise<boolean>;
    isLiveActivitySupported: () => Promise<boolean>;
}

class LiveActivityServiceClass implements LiveActivityService {
    private isSupported: boolean = false;
    private activityId: string | null = null;

    constructor() {
        if (Platform.OS === 'ios') {
            this.checkSupport();
        }
    }

    private async checkSupport() {
        try {
            if (ActivityKitManager) {
                this.isSupported = await ActivityKitManager.isLiveActivitySupported();
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('Live Activity not supported:', error);
            }
            this.isSupported = false;
        }
    }

    async startPumpingTimer(): Promise<string> {
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const id = await ActivityKitManager.startPumpingTimer();
            this.activityId = id;
            return id;
        } catch (error: any) {
            if (__DEV__) {
                console.error('Failed to start Live Activity:', error);
            }
            throw error;
        }
    }

    async updatePumpingTimer(elapsedSeconds: number): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            await ActivityKitManager.updatePumpingTimer(elapsedSeconds);
            return true;
        } catch (error: any) {
            if (__DEV__) {
                console.error('Failed to update Live Activity:', error);
            }
            return false;
        }
    }

    async stopPumpingTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopPumpingTimer();
            this.activityId = null;
            return true;
        } catch (error: any) {
            if (__DEV__) {
                console.error('Failed to stop Live Activity:', error);
            }
            return false;
        }
    }

    async isLiveActivitySupported(): Promise<boolean> {
        return this.isSupported;
    }
}

export const liveActivityService = new LiveActivityServiceClass();


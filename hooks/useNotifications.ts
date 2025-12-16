import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService, NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '../services/notificationService';

interface UseNotificationsReturn {
    settings: NotificationSettings;
    isInitialized: boolean;
    hasPermission: boolean;
    updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
    scheduleFeedingReminder: (lastFeedingTime: Date) => Promise<void>;
    scheduleSupplementReminder: () => Promise<void>;
    scheduleVaccineReminder: (date: Date, name: string) => Promise<void>;
    sendTestNotification: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();

    // Initialize on mount
    useEffect(() => {
        const init = async () => {
            const success = await notificationService.initialize();
            setHasPermission(success);
            setSettings(notificationService.getSettings());
            setIsInitialized(true);

            // Schedule recurring notifications
            if (success) {
                await notificationService.scheduleSupplementReminder();
                await notificationService.scheduleDailySummary();
            }
        };

        init();

        // Listeners for when app is open
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('🔔 Notification received:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('🔔 Notification tapped:', response);
            // Handle navigation based on notification type
            const type = response.notification.request.content.data?.type;
            // You can add navigation logic here
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    // Update settings
    const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
        await notificationService.saveSettings(newSettings);
        setSettings(prev => ({ ...prev, ...newSettings }));

        // Reschedule notifications based on new settings
        if (newSettings.supplementReminder !== undefined || newSettings.supplementTime !== undefined) {
            if (newSettings.supplementReminder === false) {
                await notificationService.cancelNotification('supplement_reminder');
            } else {
                await notificationService.scheduleSupplementReminder();
            }
        }

        if (newSettings.dailySummary !== undefined || newSettings.dailySummaryTime !== undefined) {
            if (newSettings.dailySummary === false) {
                await notificationService.cancelNotification('daily_summary');
            } else {
                await notificationService.scheduleDailySummary();
            }
        }

        // If all notifications disabled, cancel all
        if (newSettings.enabled === false) {
            await notificationService.cancelAll();
        }
    }, []);

    // Schedule feeding reminder
    const scheduleFeedingReminder = useCallback(async (lastFeedingTime: Date) => {
        await notificationService.scheduleFeedingReminder(lastFeedingTime);
    }, []);

    // Schedule supplement reminder
    const scheduleSupplementReminder = useCallback(async () => {
        await notificationService.scheduleSupplementReminder();
    }, []);

    // Schedule vaccine reminder
    const scheduleVaccineReminder = useCallback(async (date: Date, name: string) => {
        await notificationService.scheduleVaccineReminder(date, name);
    }, []);

    // Send test notification
    const sendTestNotification = useCallback(async () => {
        await notificationService.sendImmediate('feeding_reminder', 'זו התראת בדיקה! 🎉');
    }, []);

    return {
        settings,
        isInitialized,
        hasPermission,
        updateSettings,
        scheduleFeedingReminder,
        scheduleSupplementReminder,
        scheduleVaccineReminder,
        sendTestNotification,
    };
};

export default useNotifications;

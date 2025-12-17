import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---
export type NotificationType =
    | 'feeding_reminder'
    | 'diaper_reminder'
    | 'sleep_reminder'
    | 'supplement_reminder'
    | 'vaccine_reminder'
    | 'daily_summary';

export interface NotificationSettings {
    enabled: boolean;
    feedingReminder: boolean;
    feedingIntervalHours: 1 | 2 | 3 | 4;
    feedingStartTime: string; // HH:MM format
    diaperReminder: boolean;
    diaperIntervalHours: 2 | 3 | 4;
    sleepReminder: boolean;
    sleepTime: string; // HH:MM format
    supplementReminder: boolean;
    supplementTime: string; // HH:MM format
    vaccineReminder: boolean;
    dailySummary: boolean;
    dailySummaryTime: string; // HH:MM format
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    enabled: true,
    feedingReminder: true,
    feedingIntervalHours: 3,
    feedingStartTime: '08:00',
    diaperReminder: true,
    diaperIntervalHours: 3,
    sleepReminder: true,
    sleepTime: '20:00',
    supplementReminder: true,
    supplementTime: '09:00',
    vaccineReminder: true,
    dailySummary: false,
    dailySummaryTime: '20:00',
};

const NOTIFICATION_CONTENT = {
    feeding_reminder: {
        title: '🍼 זמן לארוחה',
        body: 'עברו {hours} שעות מהאכלה האחרונה',
    },
    diaper_reminder: {
        title: '🔄 זמן להחלפת חיתול',
        body: 'כדאי לבדוק את התינוק',
    },
    sleep_reminder: {
        title: '😴 הגיע זמן לישון',
        body: 'שעת השינה המומלצת',
    },
    supplement_reminder: {
        title: '💊 תזכורת תוספים',
        body: 'לא לשכוח ויטמין D וברזל!',
    },
    vaccine_reminder: {
        title: '💉 תזכורת חיסון',
        body: 'יש חיסון מתוכנן בקרוב!',
    },
    daily_summary: {
        title: '📊 סיכום היום',
        body: 'לחץ לצפייה בסיכום היומי',
    },
};

// --- Configure Notifications ---
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// --- Service Class ---
class NotificationService {
    private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;
    private scheduledNotifications: Map<string, string> = new Map(); // type -> notificationId

    // Initialize
    async initialize(): Promise<boolean> {
        try {
            // Load saved settings
            await this.loadSettings();

            // Request permissions
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                console.log('Notification permissions not granted');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
            return false;
        }
    }

    // Request permissions
    async requestPermissions(): Promise<boolean> {
        if (!Device.isDevice) {
            console.log('Notifications only work on physical devices');
            return false;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return false;
        }

        // Android specific channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'CalmParent',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6366F1',
            });
        }

        return true;
    }

    // Load settings from AsyncStorage
    async loadSettings(): Promise<NotificationSettings> {
        try {
            const saved = await AsyncStorage.getItem('notification_settings');
            if (saved) {
                this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        }
        return this.settings;
    }

    // Save settings to AsyncStorage
    async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
        try {
            this.settings = { ...this.settings, ...settings };
            await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save notification settings:', error);
        }
    }

    // Get current settings
    getSettings(): NotificationSettings {
        return this.settings;
    }

    // --- Schedule Notifications ---

    // Schedule feeding reminder
    async scheduleFeedingReminder(lastFeedingTime: Date): Promise<void> {
        if (!this.settings.enabled || !this.settings.feedingReminder) return;

        // Cancel existing
        await this.cancelNotification('feeding_reminder');

        const triggerTime = new Date(lastFeedingTime);
        triggerTime.setHours(triggerTime.getHours() + this.settings.feedingIntervalHours);

        // Only schedule if in the future
        if (triggerTime > new Date()) {
            const id = await Notifications.scheduleNotificationAsync({
                content: {
                    title: NOTIFICATION_CONTENT.feeding_reminder.title,
                    body: NOTIFICATION_CONTENT.feeding_reminder.body.replace('{hours}', String(this.settings.feedingIntervalHours)),
                    data: { type: 'feeding_reminder' },
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerTime },
            });

            this.scheduledNotifications.set('feeding_reminder', id);
        }
    }

    // Schedule daily supplement reminder
    async scheduleSupplementReminder(): Promise<void> {
        if (!this.settings.enabled || !this.settings.supplementReminder) return;

        await this.cancelNotification('supplement_reminder');

        const [hours, minutes] = this.settings.supplementTime.split(':').map(Number);

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: NOTIFICATION_CONTENT.supplement_reminder.title,
                body: NOTIFICATION_CONTENT.supplement_reminder.body,
                data: { type: 'supplement_reminder' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
            },
        });

        this.scheduledNotifications.set('supplement_reminder', id);
    }

    // Schedule diaper reminder (repeating every X hours)
    async scheduleDiaperReminder(): Promise<void> {
        if (!this.settings.enabled || !this.settings.diaperReminder) return;

        await this.cancelNotification('diaper_reminder');

        // Schedule repeating notification every X hours
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: NOTIFICATION_CONTENT.diaper_reminder.title,
                body: NOTIFICATION_CONTENT.diaper_reminder.body,
                data: { type: 'diaper_reminder' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: this.settings.diaperIntervalHours * 60 * 60,
                repeats: true,
            },
        });

        this.scheduledNotifications.set('diaper_reminder', id);
    }

    // Schedule sleep reminder (daily at bedtime)
    async scheduleSleepReminder(): Promise<void> {
        if (!this.settings.enabled || !this.settings.sleepReminder) return;

        await this.cancelNotification('sleep_reminder');

        const [hours, minutes] = this.settings.sleepTime.split(':').map(Number);

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: NOTIFICATION_CONTENT.sleep_reminder.title,
                body: NOTIFICATION_CONTENT.sleep_reminder.body,
                data: { type: 'sleep_reminder' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
            },
        });

        this.scheduledNotifications.set('sleep_reminder', id);
    }

    // Schedule daily summary
    async scheduleDailySummary(): Promise<void> {
        if (!this.settings.enabled || !this.settings.dailySummary) return;

        await this.cancelNotification('daily_summary');

        const [hours, minutes] = this.settings.dailySummaryTime.split(':').map(Number);

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: NOTIFICATION_CONTENT.daily_summary.title,
                body: NOTIFICATION_CONTENT.daily_summary.body,
                data: { type: 'daily_summary' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
            },
        });

        this.scheduledNotifications.set('daily_summary', id);
    }

    // Schedule vaccine reminder (7 days before)
    async scheduleVaccineReminder(vaccineDate: Date, vaccineName: string): Promise<void> {
        if (!this.settings.enabled || !this.settings.vaccineReminder) return;

        const reminderDate = new Date(vaccineDate);
        reminderDate.setDate(reminderDate.getDate() - 7);
        reminderDate.setHours(10, 0, 0, 0);

        if (reminderDate > new Date()) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💉 תזכורת חיסון',
                    body: `בעוד שבוע: ${vaccineName}`,
                    data: { type: 'vaccine_reminder', vaccineName },
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
            });
        }
    }

    // Send immediate notification
    async sendImmediate(type: NotificationType, customBody?: string): Promise<void> {
        const content = NOTIFICATION_CONTENT[type];

        await Notifications.scheduleNotificationAsync({
            content: {
                title: content.title,
                body: customBody || content.body,
                data: { type },
            },
            trigger: null, // Immediate
        });
    }

    // Cancel specific notification
    async cancelNotification(type: NotificationType): Promise<void> {
        const id = this.scheduledNotifications.get(type);
        if (id) {
            await Notifications.cancelScheduledNotificationAsync(id);
            this.scheduledNotifications.delete(type);
        }
    }

    // Cancel all notifications
    async cancelAll(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
        this.scheduledNotifications.clear();
    }

    // Get all scheduled notifications
    async getScheduled(): Promise<Notifications.NotificationRequest[]> {
        return await Notifications.getAllScheduledNotificationsAsync();
    }
}

// Export singleton
export const notificationService = new NotificationService();
export default notificationService;

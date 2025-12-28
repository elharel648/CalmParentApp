import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

// --- Pattern Analysis Types ---
export interface PatternData {
    feedingTimes: number[]; // Hour of day (0-23)
    sleepTimes: number[];   // Hour of day (0-23)
    avgFeedingHour: number | null;
    avgSleepHour: number | null;
    feedingCount: number;
    sleepCount: number;
}

// --- Pattern Analyzer ---
class PatternAnalyzer {
    /**
     * Analyze last 7 days of events to find patterns
     */
    async analyzePatterns(childId: string): Promise<PatternData> {
        const result: PatternData = {
            feedingTimes: [],
            sleepTimes: [],
            avgFeedingHour: null,
            avgSleepHour: null,
            feedingCount: 0,
            sleepCount: 0,
        };

        if (!childId) return result;

        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const eventsQuery = query(
                collection(db, 'events'),
                where('childId', '==', childId),
                where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo)),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(eventsQuery);

            snapshot.forEach((doc) => {
                const data = doc.data();
                const timestamp = data.timestamp instanceof Timestamp
                    ? data.timestamp.toDate()
                    : new Date(data.timestamp);
                const hour = timestamp.getHours();

                if (data.type === 'feeding' || data.type === 'food') {
                    result.feedingTimes.push(hour);
                    result.feedingCount++;
                }

                if (data.type === 'sleep') {
                    result.sleepTimes.push(hour);
                    result.sleepCount++;
                }
            });

            // Calculate averages
            if (result.feedingTimes.length > 0) {
                const sum = result.feedingTimes.reduce((a, b) => a + b, 0);
                result.avgFeedingHour = Math.round(sum / result.feedingTimes.length);
            }

            if (result.sleepTimes.length > 0) {
                const sum = result.sleepTimes.reduce((a, b) => a + b, 0);
                result.avgSleepHour = Math.round(sum / result.sleepTimes.length);
            }

        } catch (error) {
            if (__DEV__) console.log('Pattern analysis failed:', error);
        }

        return result;
    }

    /**
     * Get most common times for each activity
     */
    getMostCommonTimes(times: number[]): number[] {
        if (times.length === 0) return [];

        // Count occurrences of each hour
        const counts: { [hour: number]: number } = {};
        times.forEach(h => { counts[h] = (counts[h] || 0) + 1; });

        // Sort by frequency, take top 3
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => parseInt(hour));
    }

    /**
     * Calculate reminder time (30 minutes before average)
     */
    getReminderTime(avgHour: number | null): { hour: number; minute: number } | null {
        if (avgHour === null) return null;

        // 30 minutes before
        let reminderHour = avgHour;
        let reminderMinute = 30;

        if (reminderMinute < 30) {
            reminderHour = (reminderHour - 1 + 24) % 24;
            reminderMinute = 30;
        } else {
            reminderMinute = 0;
        }

        return { hour: reminderHour, minute: reminderMinute };
    }
}

export const patternAnalyzer = new PatternAnalyzer();

// --- Types ---
export type NotificationType =
    | 'feeding_reminder'
    | 'sleep_reminder'
    | 'supplement_reminder'
    | 'vaccine_reminder'
    | 'daily_summary';

export interface NotificationSettings {
    enabled: boolean;
    feedingReminder: boolean;
    feedingIntervalHours: 1 | 2 | 3 | 4;
    feedingStartTime: string; // HH:MM format
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
                if (__DEV__) console.log('Notification permissions not granted');
                return false;
            }

            // CLEANUP: Cancel any legacy diaper notifications (feature removed)
            await this.cancelLegacyDiaperNotifications();

            return true;
        } catch (error) {
            if (__DEV__) console.log('Failed to initialize notifications:', error);
            return false;
        }
    }

    // Cancel legacy diaper notifications (after feature removal)
    private async cancelLegacyDiaperNotifications(): Promise<void> {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            for (const notification of scheduled) {
                if (notification.content.data?.type === 'diaper_reminder') {
                    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                    if (__DEV__) console.log('🗑️ Cancelled legacy diaper notification');
                }
            }
        } catch (error) {
            if (__DEV__) console.log('Failed to cancel legacy diaper notifications:', error);
        }
    }

    // Request permissions
    async requestPermissions(): Promise<boolean> {
        if (!Device.isDevice) {
            if (__DEV__) console.log('Notifications only work on physical devices');
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
            if (__DEV__) console.log('Failed to load notification settings:', error);
        }
        return this.settings;
    }

    // Save settings to AsyncStorage
    async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
        try {
            this.settings = { ...this.settings, ...settings };
            await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
        } catch (error) {
            if (__DEV__) console.log('Failed to save notification settings:', error);
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

    // Schedule smart reminders based on patterns
    async scheduleSmartReminders(childId: string): Promise<void> {
        if (!this.settings.enabled) return;
        if (!childId) return;

        try {
            // Analyze user patterns
            const patterns = await patternAnalyzer.analyzePatterns(childId);

            // Schedule feeding reminder based on pattern
            if (this.settings.feedingReminder && patterns.avgFeedingHour !== null) {
                await this.cancelNotification('feeding_reminder');

                // 30 minutes before average feeding time
                let reminderHour = patterns.avgFeedingHour;
                let reminderMinute = 30;
                if (reminderHour === 0) {
                    reminderHour = 23;
                    reminderMinute = 30;
                } else {
                    reminderHour -= 1;
                    reminderMinute = 30;
                }

                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '🍼 הכנה לארוחה',
                        body: `בדרך כלל את/ה מאכיל/ה בסביבות ${patterns.avgFeedingHour}:00`,
                        data: { type: 'feeding_reminder' },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DAILY,
                        hour: reminderHour,
                        minute: reminderMinute,
                    },
                });
                this.scheduledNotifications.set('feeding_reminder', id);

                if (__DEV__) console.log(`🔔 Smart feeding reminder scheduled for ${reminderHour}:${reminderMinute}`);
            }

            // Schedule sleep reminder based on pattern
            if (this.settings.sleepReminder && patterns.avgSleepHour !== null) {
                await this.cancelNotification('sleep_reminder');

                // 30 minutes before average sleep time
                let reminderHour = patterns.avgSleepHour;
                let reminderMinute = 30;
                if (reminderHour === 0) {
                    reminderHour = 23;
                    reminderMinute = 30;
                } else {
                    reminderHour -= 1;
                    reminderMinute = 30;
                }

                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '😴 הכנה לשינה',
                        body: `בדרך כלל התינוק/ת נרדם/ת בסביבות ${patterns.avgSleepHour}:00`,
                        data: { type: 'sleep_reminder' },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DAILY,
                        hour: reminderHour,
                        minute: reminderMinute,
                    },
                });
                this.scheduledNotifications.set('sleep_reminder', id);

                if (__DEV__) console.log(`🔔 Smart sleep reminder scheduled for ${reminderHour}:${reminderMinute}`);
            }

        } catch (error) {
            if (__DEV__) console.log('Failed to schedule smart reminders:', error);
        }
    }
}

// Export singleton
export const notificationService = new NotificationService();
export default notificationService;

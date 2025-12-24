import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Bell, ChevronRight, Clock, Utensils, Moon, Pill, CheckCircle2, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

interface Notification {
    id: string;
    type: 'feed' | 'sleep' | 'medication' | 'reminder' | 'achievement';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    isUrgent?: boolean;
}

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const { isDarkMode } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    // Sample notifications - in production, this would come from a context or Firebase
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            type: 'feed',
            title: 'זמן האכלה',
            message: 'עברו 3 שעות מהאכלה אחרונה',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
            isRead: false,
            isUrgent: true,
        },
        {
            id: '2',
            type: 'medication',
            title: 'ויטמין D',
            message: 'לא שכחת לתת ויטמין היום?',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            isRead: false,
        },
        {
            id: '3',
            type: 'achievement',
            title: 'כל הכבוד! 🎉',
            message: 'הגעת ל-7 ימים רצופים של מעקב',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            isRead: true,
        },
    ]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'feed': return Utensils;
            case 'sleep': return Moon;
            case 'medication': return Pill;
            case 'achievement': return CheckCircle2;
            default: return Bell;
        }
    };

    const getIconColor = (type: Notification['type']) => {
        switch (type) {
            case 'feed': return '#F59E0B';
            case 'sleep': return '#8B5CF6';
            case 'medication': return '#EF4444';
            case 'achievement': return '#10B981';
            default: return '#6366F1';
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `לפני ${minutes} דקות`;
        if (hours < 24) return `לפני ${hours} שעות`;
        return `לפני ${days} ימים`;
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const onRefresh = async () => {
        setRefreshing(true);
        // Simulate refresh
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronRight size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>התראות</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                        <Text style={styles.markAllText}>סמן הכל כנקרא</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Notifications List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>אין התראות</Text>
                        <Text style={styles.emptySubtitle}>כאן יופיעו התראות ותזכורות</Text>
                    </View>
                ) : (
                    notifications.map((notification) => {
                        const Icon = getIcon(notification.type);
                        const iconColor = getIconColor(notification.type);

                        return (
                            <TouchableOpacity
                                key={notification.id}
                                style={[
                                    styles.notificationCard,
                                    !notification.isRead && styles.notificationUnread,
                                    notification.isUrgent && styles.notificationUrgent,
                                    isDarkMode && styles.cardDark,
                                ]}
                                onPress={() => markAsRead(notification.id)}
                                activeOpacity={0.7}
                            >
                                {/* Icon */}
                                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                                    <Icon size={20} color={iconColor} />
                                </View>

                                {/* Content */}
                                <View style={styles.notificationContent}>
                                    <Text style={[styles.notificationTitle, isDarkMode && styles.textDark]}>
                                        {notification.title}
                                    </Text>
                                    <Text style={styles.notificationMessage}>
                                        {notification.message}
                                    </Text>
                                    <View style={styles.notificationMeta}>
                                        <Clock size={12} color="#9CA3AF" />
                                        <Text style={styles.notificationTime}>
                                            {formatTime(notification.timestamp)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Unread dot */}
                                {!notification.isRead && (
                                    <View style={styles.unreadDot} />
                                )}

                                {/* Dismiss button */}
                                <TouchableOpacity
                                    style={styles.dismissBtn}
                                    onPress={() => dismissNotification(notification.id)}
                                >
                                    <X size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#1C1C1E',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    textDark: {
        color: '#FFFFFF',
    },
    markAllBtn: {
        padding: 8,
    },
    markAllText: {
        fontSize: 13,
        color: '#6366F1',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 4,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    notificationUnread: {
        backgroundColor: '#F0F9FF',
    },
    notificationUrgent: {
        borderLeftWidth: 3,
        borderLeftColor: '#EF4444',
    },
    cardDark: {
        backgroundColor: '#2C2C2E',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 2,
    },
    notificationMessage: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 6,
    },
    notificationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    notificationTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginRight: 8,
    },
    dismissBtn: {
        padding: 8,
    },
});

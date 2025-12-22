import React, { memo, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, ScrollView, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { Camera, Cloud, Plus, X, Link2, UserPlus, Moon, Utensils, Baby as BabyIcon, Pill, Bell, Award, Heart } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ChildProfile, MedicationsState } from '../../types/home';
import { useWeather } from '../../hooks/useWeather';
import { useTheme } from '../../context/ThemeContext';
import { useActiveChild, ActiveChild } from '../../context/ActiveChildContext';

interface DailyStats {
    feedCount: number;
    sleepMinutes: number;
    diaperCount: number;
}

interface HeaderSectionProps {
    greeting: string;
    profile: ChildProfile;
    onProfileUpdate?: () => void;
    dynamicStyles: { text: string; textSub: string };
    dailyStats?: DailyStats;
    lastFeedTime?: string;
    lastSleepTime?: string;
    meds?: MedicationsState;
    navigation?: any;
    onAddChild?: () => void;
    onJoinWithCode?: () => void;
}

/**
 * Premium Minimalist Header - With child avatars row
 */
const HeaderSection = memo<HeaderSectionProps>(({
    greeting,
    profile,
    onProfileUpdate,
    dynamicStyles,
    dailyStats,
    lastFeedTime,
    lastSleepTime,
    meds,
    navigation,
    onAddChild,
    onJoinWithCode,
}) => {
    const { theme } = useTheme();
    const { allChildren, activeChild, setActiveChild } = useActiveChild();
    const [uploading, setUploading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const { weather } = useWeather();

    // Calculate age
    const ageText = useMemo(() => {
        if (!profile.birthDate) return '';
        let birth: Date;
        if ((profile.birthDate as any)?.seconds) {
            birth = new Date((profile.birthDate as any).seconds * 1000);
        } else if (profile.birthDate instanceof Date) {
            birth = profile.birthDate;
        } else {
            return '';
        }
        const now = new Date();
        const diffMs = now.getTime() - birth.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return `${diffDays} ימים`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} שבועות`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} חודשים`;
        return 'שנה+';
    }, [profile.birthDate]);

    // Photo upload handler
    const handlePhotoPress = async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('שגיאה', 'נדרשת הרשאה לגלריה');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0].uri) {
                setUploading(true);
                const user = auth.currentUser;
                if (user && profile.id) {
                    await updateDoc(doc(db, 'children', profile.id), {
                        photoUrl: result.assets[0].uri,
                    });
                    onProfileUpdate?.();
                }
                setUploading(false);
            }
        } catch (e) {
            if (__DEV__) console.error(e);
            setUploading(false);
        }
    };

    // Handle child selection
    const handleSelectChild = (child: ActiveChild) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveChild(child);
    };

    // Handle plus button
    const handlePlusPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowAddModal(true);
    };

    // Handle add new child
    const handleAddNewChild = () => {
        setShowAddModal(false);
        onAddChild?.();
    };

    // Handle join with code
    const handleJoinWithCode = () => {
        setShowAddModal(false);
        onJoinWithCode?.();
    };

    // Get initials from name
    const getInitials = (name: string) => {
        return name?.charAt(0) || '?';
    };

    // Format sleep time
    const sleepHours = dailyStats?.sleepMinutes
        ? `${Math.floor(dailyStats.sleepMinutes / 60)}:${String(dailyStats.sleepMinutes % 60).padStart(2, '0')}`
        : '0:00';

    // Smart Reminders & Achievements Cards
    const smartCards = useMemo(() => {
        const cards: Array<{
            type: string;
            icon: any;
            color: string;
            bgColor: string;
            title: string;
            subtitle: string;
            isUrgent?: boolean;
        }> = [];

        // Calculate time since last feed
        const getTimeSinceLastFeed = () => {
            if (!lastFeedTime || lastFeedTime === '--:--') return null;
            const [hours, minutes] = lastFeedTime.split(':').map(Number);
            const now = new Date();
            const lastFeed = new Date();
            lastFeed.setHours(hours, minutes, 0, 0);
            if (lastFeed > now) lastFeed.setDate(lastFeed.getDate() - 1);
            const diffMs = now.getTime() - lastFeed.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return { hours: diffHours, mins: diffMins };
        };

        // 1. Next Feed Reminder
        const feedTime = getTimeSinceLastFeed();
        if (feedTime) {
            const isOverdue = feedTime.hours >= 3;
            cards.push({
                type: 'feed_reminder',
                icon: Utensils,
                color: isOverdue ? '#EF4444' : '#F59E0B',
                bgColor: isOverdue ? '#FEE2E2' : '#FEF3C7',
                title: isOverdue ? 'הגיע הזמן להאכיל!' : 'האכלה אחרונה',
                subtitle: `לפני ${feedTime.hours > 0 ? `${feedTime.hours} שעות ` : ''}${feedTime.mins} דקות`,
                isUrgent: isOverdue,
            });
        } else {
            cards.push({
                type: 'feed_reminder',
                icon: Utensils,
                color: '#F59E0B',
                bgColor: '#FEF3C7',
                title: 'האכלה ראשונה',
                subtitle: 'עדיין לא תועד היום',
            });
        }

        // 2. Vitamin D Reminder
        if (!meds?.vitaminD) {
            cards.push({
                type: 'vitamin_reminder',
                icon: Pill,
                color: '#8B5CF6',
                bgColor: '#F3E8FF',
                title: 'ויטמין D',
                subtitle: 'לא ניתן עדיין היום',
                isUrgent: true,
            });
        } else {
            cards.push({
                type: 'vitamin_done',
                icon: Pill,
                color: '#10B981',
                bgColor: '#D1FAE5',
                title: 'ויטמין D ✓',
                subtitle: 'ניתן היום!',
            });
        }

        // 3. Achievement / Sleep Streak
        const sleepMins = dailyStats?.sleepMinutes || 0;
        if (sleepMins >= 420) { // 7+ hours
            cards.push({
                type: 'achievement',
                icon: Award,
                color: '#F59E0B',
                bgColor: '#FEF3C7',
                title: 'מלך/ת השינה!',
                subtitle: `${sleepHours} שעות שינה`,
            });
        } else if ((dailyStats?.feedCount || 0) >= 5) {
            cards.push({
                type: 'achievement',
                icon: Award,
                color: '#10B981',
                bgColor: '#D1FAE5',
                title: 'יום מזין!',
                subtitle: `${dailyStats?.feedCount} האכלות`,
            });
        } else {
            // Default: Iron reminder or encouraging message
            if (!meds?.iron) {
                cards.push({
                    type: 'iron_reminder',
                    icon: Pill,
                    color: '#EF4444',
                    bgColor: '#FEE2E2',
                    title: 'ברזל',
                    subtitle: 'לא ניתן עדיין היום',
                });
            } else {
                cards.push({
                    type: 'encouragement',
                    icon: Heart,
                    color: '#EC4899',
                    bgColor: '#FCE7F3',
                    title: 'יום נהדר!',
                    subtitle: 'המשיכו ככה',
                });
            }
        }

        return cards;
    }, [lastFeedTime, meds, dailyStats, sleepHours]);

    // Single toast notification - rotating index
    const [toastIndex, setToastIndex] = useState(0);

    // Animations for toast slide-up effect
    const toastTranslateY = useRef(new Animated.Value(30)).current;
    const toastOpacity = useRef(new Animated.Value(0)).current;

    // Smooth slide-up animation for toast notifications
    useEffect(() => {
        // Initial entry animation
        Animated.parallel([
            Animated.timing(toastTranslateY, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }),
            Animated.timing(toastOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Rotate notifications every 4 seconds
        const rotationInterval = setInterval(() => {
            // Slide out + fade
            Animated.parallel([
                Animated.timing(toastTranslateY, {
                    toValue: -15,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Change content
                setToastIndex((prev) => (prev + 1) % smartCards.length);
                // Reset position for entry
                toastTranslateY.setValue(30);
                // Slide in from bottom
                Animated.parallel([
                    Animated.timing(toastTranslateY, {
                        toValue: 0,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.timing(toastOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }, 4000);

        return () => clearInterval(rotationInterval);
    }, [smartCards.length, toastTranslateY, toastOpacity]);

    // Get current notification
    const currentNotification = smartCards[toastIndex];
    const NotificationIcon = currentNotification.icon;


    return (
        <View style={styles.container}>
            {/* Top Row: Greeting + Weather */}
            <View style={styles.topRow}>
                <View style={styles.greetingSection}>
                    <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                        {greeting} {profile.name}
                    </Text>
                </View>

                {/* Weather + Notification Group */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Notification Bell */}
                    <TouchableOpacity style={styles.notificationBell} activeOpacity={0.7}>
                        <Bell size={18} color="#9CA3AF" strokeWidth={1.5} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>

                    {weather && (
                        <View style={styles.weatherBadge}>
                            <Cloud size={14} color="#6B7280" />
                            <Text style={styles.weatherText}>{weather.temp}°</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Children Avatars Row - RTL aligned to right */}
            <View style={styles.childrenRow}>
                {/* Avatars container in horizontal ScrollView for many children */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.avatarsScrollContent}
                    style={styles.avatarsScrollView}
                >
                    {allChildren.map((child) => {
                        const isActive = activeChild?.childId === child.childId;
                        return (
                            <TouchableOpacity
                                key={child.childId}
                                style={[
                                    styles.childAvatar,
                                    isActive && styles.childAvatarActive
                                ]}
                                onPress={() => handleSelectChild(child)}
                                activeOpacity={0.7}
                            >
                                {child.photoUrl ? (
                                    <Image source={{ uri: child.photoUrl }} style={styles.childAvatarImage} />
                                ) : (
                                    <View style={[
                                        styles.childAvatarPlaceholder,
                                        { backgroundColor: isActive ? '#374151' : '#E5E7EB' }
                                    ]}>
                                        <Text style={[
                                            styles.childInitial,
                                            { color: isActive ? '#fff' : '#6B7280' }
                                        ]}>
                                            {getInitials(child.childName)}
                                        </Text>
                                    </View>
                                )}
                                {isActive && (
                                    <View style={styles.activeIndicator} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Plus Button second in row-reverse = appears on left */}
                <TouchableOpacity
                    style={styles.addChildBtn}
                    onPress={handlePlusPress}
                    activeOpacity={0.7}
                >
                    <Plus size={18} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            {/* Toast-Style Notification - Single Pill */}
            <Animated.View
                style={[
                    styles.toastNotification,
                    {
                        opacity: toastOpacity,
                        transform: [{ translateY: toastTranslateY }],
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                    }
                ]}
            >
                {/* Icon */}
                <View style={[styles.toastIcon, { backgroundColor: currentNotification.bgColor }]}>
                    <NotificationIcon size={16} color={currentNotification.color} strokeWidth={2} />
                </View>

                {/* Content */}
                <View style={styles.toastContent}>
                    <Text style={[styles.toastTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {currentNotification.title}
                    </Text>
                </View>

                {/* Time Badge */}
                <Text style={[styles.toastTime, { color: theme.textSecondary }]} numberOfLines={1}>
                    {currentNotification.subtitle}
                </Text>
            </Animated.View>


            {/* Add Child Modal */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowAddModal(false)}
                        >
                            <X size={20} color="#6B7280" />
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>הוספת ילד</Text>

                        {/* Option 1: New Child */}
                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={handleAddNewChild}
                        >
                            <View style={[styles.modalOptionIcon, { backgroundColor: '#EEF2FF' }]}>
                                <UserPlus size={24} color="#6366F1" />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={styles.modalOptionTitle}>רישום ילד חדש</Text>
                                <Text style={styles.modalOptionSubtitle}>צור פרופיל חדש לילד</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Option 2: Join with Code */}
                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={handleJoinWithCode}
                        >
                            <View style={[styles.modalOptionIcon, { backgroundColor: '#D1FAE5' }]}>
                                <Link2 size={24} color="#10B981" />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={styles.modalOptionTitle}>הצטרפות עם קוד</Text>
                                <Text style={styles.modalOptionSubtitle}>קיבלת קוד מהשותף?</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View >
    );
});

HeaderSection.displayName = 'HeaderSection';

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },

    // Top Row
    topRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    greetingSection: {
        alignItems: 'flex-end',
    },
    greeting: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Weather
    weatherBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    weatherText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },

    // Children Row - RTL aligned to right side
    childrenRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarsContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    avatarsScrollView: {
        flex: 1,
    },
    avatarsScrollContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },

    // Adjust children scroll content spacing for names
    childrenScrollContent: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        gap: 10,
    },
    childAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    childAvatarActive: {
        borderWidth: 2,
        borderColor: '#374151',
    },
    childAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
    },
    childAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    childInitial: {
        fontSize: 16,
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -3,
        left: '50%',
        marginLeft: -3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    addChildBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        marginLeft: 8,
    },

    // Toast Notification - Single Pill Style
    toastNotification: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 24,
        borderWidth: 1,
        gap: 10,
    },
    toastIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    toastTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    toastTime: {
        fontSize: 12,
        fontWeight: '500',
    },
    notificationBell: {
        padding: 6,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#3B82F6',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
    },
    modalClose: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalOption: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        marginBottom: 12,
    },
    modalOptionIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOptionText: {
        flex: 1,
        marginRight: 14,
        alignItems: 'flex-end',
    },
    modalOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalOptionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
});

export default HeaderSection;

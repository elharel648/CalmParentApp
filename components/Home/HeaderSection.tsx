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
            console.error(e);
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
                subtitle: 'לא ניתן עדיין היום 💧',
                isUrgent: true,
            });
        } else {
            cards.push({
                type: 'vitamin_done',
                icon: Pill,
                color: '#10B981',
                bgColor: '#D1FAE5',
                title: 'ויטמין D ✓',
                subtitle: 'ניתן היום! 🎉',
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
                title: 'מלך/ת השינה! 👑',
                subtitle: `${sleepHours} שעות שינה היום`,
            });
        } else if ((dailyStats?.feedCount || 0) >= 5) {
            cards.push({
                type: 'achievement',
                icon: Award,
                color: '#10B981',
                bgColor: '#D1FAE5',
                title: 'יום מזין! 🍼',
                subtitle: `${dailyStats?.feedCount} האכלות היום`,
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
                    title: 'יום נהדר! 💕',
                    subtitle: 'המשיכו ככה!',
                });
            }
        }

        return cards;
    }, [lastFeedTime, meds, dailyStats, sleepHours]);

    // 3 Card rotation states - each rotates independently at different intervals
    const [card1Index, setCard1Index] = useState(0);
    const [card2Index, setCard2Index] = useState(1);
    const [card3Index, setCard3Index] = useState(2);

    // Fade + Scale animations for elegant transitions
    const fade1 = useRef(new Animated.Value(1)).current;
    const fade2 = useRef(new Animated.Value(1)).current;
    const fade3 = useRef(new Animated.Value(1)).current;
    const scale1 = useRef(new Animated.Value(1)).current;
    const scale2 = useRef(new Animated.Value(1)).current;
    const scale3 = useRef(new Animated.Value(1)).current;

    // Elegant rotation effect with scale + fade
    useEffect(() => {
        const rotateCard = (
            fadeAnim: Animated.Value,
            scaleAnim: Animated.Value,
            setIndex: React.Dispatch<React.SetStateAction<number>>
        ) => {
            // Fade out + Scale down
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.85,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIndex((prev) => (prev + 1) % smartCards.length);
                // Fade in + Scale up
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 8,
                        tension: 100,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        };

        const interval1 = setInterval(() => rotateCard(fade1, scale1, setCard1Index), 3500);
        const interval2 = setInterval(() => rotateCard(fade2, scale2, setCard2Index), 4200);
        const interval3 = setInterval(() => rotateCard(fade3, scale3, setCard3Index), 5000);

        return () => {
            clearInterval(interval1);
            clearInterval(interval2);
            clearInterval(interval3);
        };
    }, [smartCards.length, fade1, fade2, fade3, scale1, scale2, scale3]);

    // Get cards - ensure no duplicates by using unique indices
    const getUniqueIndex = (baseIndex: number, offset: number, total: number) => {
        return (baseIndex + offset) % total;
    };
    const card1 = smartCards[getUniqueIndex(card1Index, 0, smartCards.length)];
    const card2 = smartCards.length > 1 ? smartCards[getUniqueIndex(card1Index, 1, smartCards.length)] : card1;
    const card3 = smartCards.length > 2 ? smartCards[getUniqueIndex(card1Index, 2, smartCards.length)] : card1;
    const Card1Icon = card1.icon;
    const Card2Icon = card2.icon;
    const Card3Icon = card3.icon;

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
                {/* Avatars container first in row-reverse = appears on right */}
                <View style={styles.avatarsContainer}>
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
                </View>

                {/* Plus Button second in row-reverse = appears on left */}
                <TouchableOpacity
                    style={styles.addChildBtn}
                    onPress={handlePlusPress}
                    activeOpacity={0.7}
                >
                    <Plus size={18} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            {/* 3 Smart Cards: Reminders & Achievements */}
            <View style={styles.statsCardsRow}>
                {/* Card 1 */}
                <Animated.View style={[styles.statCard, { opacity: fade1, transform: [{ scale: scale1 }] }]}>
                    <View style={[styles.statCardIcon, { backgroundColor: card1.bgColor }]}>
                        <Card1Icon size={18} color={card1.color} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.statCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>{card1.title}</Text>
                    <Text style={[styles.statCardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{card1.subtitle}</Text>
                </Animated.View>

                {/* Card 2 */}
                <Animated.View style={[styles.statCard, { opacity: fade2, transform: [{ scale: scale2 }] }]}>
                    <View style={[styles.statCardIcon, { backgroundColor: card2.bgColor }]}>
                        <Card2Icon size={18} color={card2.color} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.statCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>{card2.title}</Text>
                    <Text style={[styles.statCardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{card2.subtitle}</Text>
                </Animated.View>

                {/* Card 3 */}
                <Animated.View style={[styles.statCard, { opacity: fade3, transform: [{ scale: scale3 }] }]}>
                    <View style={[styles.statCardIcon, { backgroundColor: card3.bgColor }]}>
                        <Card3Icon size={18} color={card3.color} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.statCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>{card3.title}</Text>
                    <Text style={[styles.statCardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{card3.subtitle}</Text>
                </Animated.View>
            </View>

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

    // 3 Rotating Stat Cards
    statsCardsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        minHeight: 85,
    },
    statCardIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    statCardTitle: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 2,
    },
    statCardSubtitle: {
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8,
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

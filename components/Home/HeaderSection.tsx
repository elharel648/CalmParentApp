import React, { memo, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, ScrollView, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { Camera, Cloud, Plus, X, Link2, UserPlus, Moon, Utensils, Baby as BabyIcon, Pill } from 'lucide-react-native';
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

    // Banner rotation state
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Define banners data
    const banners = useMemo(() => {
        // Calculate supplements taken
        const supplementsTaken = (meds?.vitaminD ? 1 : 0) + (meds?.iron ? 1 : 0);

        const items = [
            {
                type: 'sleep',
                icon: Moon,
                color: '#8B5CF6',
                bgColor: '#F3F0FF',
                label: 'שינה',
                value: sleepHours !== '0:00' ? sleepHours : null,
                noDataText: 'אין נתונים',
                lastTime: lastSleepTime,
            },
            {
                type: 'feed',
                icon: Utensils,
                color: '#F59E0B',
                bgColor: '#FEF9E7',
                label: 'האכלות',
                value: dailyStats?.feedCount || null,
                noDataText: 'אין נתונים',
                lastTime: lastFeedTime,
            },
            {
                type: 'diaper',
                icon: BabyIcon,
                color: '#10B981',
                bgColor: '#ECFDF5',
                label: 'החתלות',
                value: dailyStats?.diaperCount || null,
                noDataText: 'אין נתונים',
                lastTime: null,
            },
            {
                type: 'supplements',
                icon: Pill,
                color: '#0EA5E9',
                bgColor: '#E0F2FE',
                label: 'תוספים',
                value: `${supplementsTaken}/2`,
                noDataText: '0/2',
                lastTime: null,
            },
        ];
        return items;
    }, [sleepHours, dailyStats, lastSleepTime, lastFeedTime, meds]);

    // Banner rotation effect
    useEffect(() => {
        const interval = setInterval(() => {
            // Fade out + slide out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: -20,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Change banner
                setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
                // Reset position
                slideAnim.setValue(20);
                // Fade in + slide in
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [banners.length, fadeAnim, slideAnim]);

    const currentBanner = banners[currentBannerIndex];
    const BannerIcon = currentBanner.icon;

    return (
        <View style={styles.container}>
            {/* Top Row: Greeting + Weather */}
            <View style={styles.topRow}>
                <View style={styles.greetingSection}>
                    <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                        {greeting} {profile.name}
                    </Text>
                </View>

                {/* Weather Badge */}
                {weather && (
                    <View style={[styles.weatherBadge, { backgroundColor: theme.card }]}>
                        <Cloud size={14} color="#6B7280" />
                        <Text style={styles.weatherText}>{weather.temp}°</Text>
                    </View>
                )}
            </View>

            {/* Children Avatars Row */}
            <View style={styles.childrenRow}>
                {/* Child avatars (on right) */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.childrenScrollContent}
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

                {/* Plus Button - Add Child */}
                <TouchableOpacity
                    style={styles.addChildBtn}
                    onPress={handlePlusPress}
                    activeOpacity={0.7}
                >
                    <Plus size={18} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            {/* Minimalist Rotating Banner */}
            <View style={[styles.bannerContainer, { backgroundColor: theme.card }]}>
                <Animated.View
                    style={[
                        styles.bannerInner,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Left side: Time */}
                    <View style={styles.bannerTimeSection}>
                        <Text style={[styles.bannerTime, { color: theme.textSecondary }]}>
                            {currentBanner.lastTime && currentBanner.lastTime !== '--:--' ? currentBanner.lastTime : ''}
                        </Text>
                    </View>

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Right side: Label + Value + Icon */}
                    <View style={styles.bannerRightSection}>
                        <Text style={[styles.bannerValue, { color: theme.textPrimary }]}>
                            {currentBanner.value !== null ? currentBanner.value : '-'}
                        </Text>
                        <Text style={[styles.bannerLabel, { color: currentBanner.color }]}>
                            {currentBanner.label}
                        </Text>
                        <View style={[styles.bannerIcon, { backgroundColor: currentBanner.bgColor }]}>
                            <BannerIcon size={16} color={currentBanner.color} />
                        </View>
                    </View>
                </Animated.View>

                {/* Dots indicator */}
                <View style={styles.dotsContainer}>
                    {banners.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: index === currentBannerIndex ? currentBanner.color : '#E5E7EB',
                                },
                            ]}
                        />
                    ))}
                </View>
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

    // Children Row - aligned to right side
    childrenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 16,
    },

    // Adjust children scroll content spacing for names
    childrenScrollContent: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        gap: 10,
        flexGrow: 1,
        justifyContent: 'flex-end',
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

    // Minimalist Banner - Matching Quick Actions Style
    bannerContainer: {
        borderRadius: 20,
        padding: 14,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
        minHeight: 56,
    },
    bannerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
    },
    bannerTimeSection: {
        width: 38,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    bannerTime: {
        fontSize: 10,
        fontWeight: '500',
    },
    bannerRightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bannerLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    bannerValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    bannerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        marginTop: 10,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
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

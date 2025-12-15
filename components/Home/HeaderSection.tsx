import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, Animated, Easing } from 'react-native';
import { Camera, Utensils, Moon, Baby, Pill, Sun } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ChildProfile, MedicationsState } from '../../types/home';

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
}

interface BannerData {
    title: string;
    summary: string;
    lastAction: string;
    icon: any;
    color: string;
    bgGradient: [string, string];
}

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
}) => {
    const [uploading, setUploading] = useState(false);
    const [currentBanner, setCurrentBanner] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current; // For vertical slide

    // Generate banners
    const banners: BannerData[] = [
        {
            title: 'האכלות',
            summary: dailyStats?.feedCount ? `${dailyStats.feedCount} פעמים היום` : 'אין נתונים',
            lastAction: lastFeedTime && lastFeedTime !== '--:--' ? `פעולה אחרונה: ${lastFeedTime}` : '',
            icon: Utensils,
            color: '#F59E0B',
            bgGradient: ['#FFFBEB', '#FEF3C7'],
        },
        {
            title: 'שינה',
            summary: dailyStats?.sleepMinutes
                ? `${Math.floor(dailyStats.sleepMinutes / 60)}:${String(dailyStats.sleepMinutes % 60).padStart(2, '0')} שעות היום`
                : 'אין נתונים',
            lastAction: lastSleepTime && lastSleepTime !== '--:--' ? `פעולה אחרונה: ${lastSleepTime}` : '',
            icon: Moon,
            color: '#8B5CF6',
            bgGradient: ['#F5F3FF', '#EDE9FE'],
        },
        {
            title: 'החתלות',
            summary: dailyStats?.diaperCount ? `${dailyStats.diaperCount} החלפות היום` : 'אין נתונים',
            lastAction: '',
            icon: Baby,
            color: '#6366F1',
            bgGradient: ['#EEF2FF', '#E0E7FF'],
        },
    ];

    // Add Supplement Banner if meds exist
    if (meds) {
        const takenCount = (meds.vitaminD ? 1 : 0) + (meds.iron ? 1 : 0);
        let summaryText = 'לא נלקח היום';
        if (takenCount === 2) summaryText = 'ויטמין D + ברזל';
        else if (meds.vitaminD) summaryText = 'ויטמין D נלקח';
        else if (meds.iron) summaryText = 'ברזל נלקח';

        banners.push({
            title: 'תוספי תזונה',
            summary: summaryText,
            lastAction: takenCount > 0 ? 'הושלם' : 'לביצוע',
            icon: Sun,
            color: '#0EA5E9', // Sky Blue
            bgGradient: ['#E0F2FE', '#BAE6FD'],
        });
    }

    // Auto-rotate banners with smooth slide animation
    useEffect(() => {
        const interval = setInterval(() => {
            // Slide out down + fade out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                }),
                Animated.timing(slideAnim, {
                    toValue: 30, // Slide down 30px
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                }),
            ]).start(() => {
                // Change banner and reset slide position
                setCurrentBanner(prev => (prev + 1) % banners.length);
                slideAnim.setValue(-30); // Reset to slide from top

                // Slide in from top + fade in
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                        easing: Easing.bezier(0.0, 0.0, 0.2, 1),
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0, // Slide to original position
                        duration: 500,
                        useNativeDriver: true,
                        easing: Easing.bezier(0.0, 0.0, 0.2, 1),
                    }),
                ]).start();
            });
        }, 5500); // 5.5 seconds interval

        return () => clearInterval(interval);
    }, [banners.length]);

    // Calculate age
    const getAgeText = () => {
        if (!profile.birthDate) return '';

        let birth: Date;
        if (profile.birthDate?.seconds) {
            birth = new Date(profile.birthDate.seconds * 1000);
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
        return 'שנה';
    };

    // Photo upload
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
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0]) {
                setUploading(true);
                const user = auth.currentUser;
                if (user) {
                    await updateDoc(doc(db, 'babies', user.uid), {
                        photoUrl: result.assets[0].uri,
                    });

                    if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }

                    onProfileUpdate?.();
                }
                setUploading(false);
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            setUploading(false);
        }
    };

    const banner = banners[currentBanner] || banners[0]; // Fallback
    const BannerIcon = banner.icon;

    return (
        <View style={styles.container}>
            {/* Top Section: Profile on Right, Greeting + Weather on Left */}
            <View style={styles.profileRow}>
                {/* Left: Greeting + Weather */}
                <View style={styles.greetingSection}>
                    <View style={styles.greetingRow}>
                        {(() => {
                            const hour = new Date().getHours();
                            if (hour >= 5 && hour < 12) return <Sun size={18} color="#F59E0B" strokeWidth={2.5} />;
                            if (hour >= 12 && hour < 18) return <Sun size={18} color="#F97316" strokeWidth={2.5} />;
                            return <Moon size={18} color="#8B5CF6" strokeWidth={2.5} />;
                        })()}
                        <Text style={[styles.greeting, { color: dynamicStyles.text }]}>
                            {greeting}
                        </Text>
                    </View>
                    {/* Weather placeholder */}
                    <Text style={styles.weatherText}>☁️ טוען מזג אוויר...</Text>
                </View>

                {/* Right: Avatar + Name + Age */}
                <View style={styles.profileInfo}>
                    <View style={styles.nameSection}>
                        <Text style={[styles.babyName, { color: dynamicStyles.text }]}>
                            {profile.name}
                        </Text>
                        <Text style={styles.ageText}>{getAgeText()}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => navigation?.navigate('פרופיל')}
                        style={styles.avatarWrapper}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.avatarGradient}
                        >
                            {profile.photoUrl ? (
                                <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarEmoji}>👶</Text>
                            )}
                        </LinearGradient>
                        <View style={styles.cameraBadge}>
                            <Camera size={8} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Summary Banner - RTL Layout with Slide Animation */}
            <Animated.View style={[
                styles.bannerWrapper,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}>
                <LinearGradient
                    colors={banner.bgGradient}
                    style={styles.banner}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 0 }}
                >
                    {/* Icon on RIGHT */}
                    <View style={[styles.bannerIconWrapper, { backgroundColor: banner.color }]}>
                        <BannerIcon size={20} color="#fff" />
                    </View>

                    {/* Content in middle */}
                    <View style={styles.bannerContent}>
                        <Text style={[styles.bannerTitle, { color: banner.color }]}>
                            {banner.title}
                        </Text>
                        <Text style={styles.bannerSummary}>{banner.summary}</Text>
                    </View>

                    {/* Last Action on LEFT */}
                    {banner.lastAction ? (
                        <View style={[styles.bannerLastAction, { backgroundColor: `${banner.color}15` }]}>
                            <Text style={[styles.lastActionText, { color: banner.color }]}>
                                {banner.lastAction}
                            </Text>
                        </View>
                    ) : null}
                </LinearGradient>

                {/* Pagination */}
                <View style={styles.pagination}>
                    {banners.map((_, idx) => (
                        <TouchableOpacity
                            key={idx}
                            onPress={() => setCurrentBanner(idx)}
                        >
                            <View
                                style={[
                                    styles.dot,
                                    idx === currentBanner && {
                                        backgroundColor: banners[currentBanner].color,
                                        width: 20
                                    }
                                ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>
        </View>
    );
});

HeaderSection.displayName = 'HeaderSection';

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },

    // Profile Row
    profileRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    greetingSection: {
        gap: 4,
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    greeting: {
        fontSize: 16,
        fontWeight: '700',
    },
    weatherText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameSection: {
        alignItems: 'flex-end',
        marginRight: 12,
    },
    babyName: {
        fontSize: 17,
        fontWeight: '700',
    },
    ageText: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        padding: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarEmoji: {
        fontSize: 22,
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#6366F1',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },

    // Banner - RTL
    bannerWrapper: {
        alignItems: 'center',
    },
    banner: {
        flexDirection: 'row-reverse', // RTL
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    bannerIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    bannerContent: {
        flex: 1,
        marginRight: 14,
        alignItems: 'flex-end',
    },
    bannerTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    bannerSummary: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 2,
        letterSpacing: -0.2,
    },
    bannerLastAction: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    lastActionText: {
        fontSize: 11,
        fontWeight: '600',
    },
    pagination: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
});

export default HeaderSection;

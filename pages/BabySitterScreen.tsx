// pages/BabySitterScreen.tsx - Minimalist Parent Sitter Search
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    Platform,
    ActivityIndicator,
} from 'react-native';
import {
    Search, Briefcase, Star, ChevronLeft,
    User, Award, UserPlus
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import useSitters, { Sitter } from '../hooks/useSitters';

const BabySitterScreen = ({ navigation }: any) => {
    const { theme } = useTheme();

    // Hooks
    const { sitters, isLoading, refetch } = useSitters();

    // State
    const [userMode, setUserMode] = useState<'parent' | 'sitter'>('parent');
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance'>('rating');
    const [isSitterRegistered, setIsSitterRegistered] = useState<boolean | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Get user photo
    const userPhoto = auth.currentUser?.photoURL;

    // Check if user is registered as sitter
    const checkSitterStatus = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setIsSitterRegistered(false);
            return;
        }

        setCheckingStatus(true);
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setIsSitterRegistered(data.isSitter === true);
            } else {
                setIsSitterRegistered(false);
            }
        } catch {
            setIsSitterRegistered(false);
        } finally {
            setCheckingStatus(false);
        }
    };

    useEffect(() => {
        if (userMode === 'sitter' && isSitterRegistered === null) {
            checkSitterStatus();
        }
    }, [userMode]);

    // Refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Sort sitters
    const sortedSitters = [...sitters].sort((a, b) => {
        switch (sortBy) {
            case 'rating': return b.rating - a.rating;
            case 'price': return a.pricePerHour - b.pricePerHour;
            case 'distance': return (a.distance || 0) - (b.distance || 0);
            default: return 0;
        }
    });

    // Handle sitter press
    const handleSitterPress = (sitter: Sitter) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('SitterProfile', { sitterData: sitter });
    };

    // ========== COMPONENTS ==========

    // Minimalist Sitter Card
    const SitterCard = ({ sitter }: { sitter: Sitter }) => (
        <TouchableOpacity
            style={[styles.sitterCard, { backgroundColor: theme.card }]}
            onPress={() => handleSitterPress(sitter)}
            activeOpacity={0.7}
        >
            <View style={styles.sitterCardContent}>
                {sitter.photoUrl ? (
                    <Image source={{ uri: sitter.photoUrl }} style={styles.sitterPhoto} />
                ) : (
                    <View style={[styles.sitterPhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                        <User size={24} color={theme.textSecondary} />
                    </View>
                )}
                <View style={styles.sitterInfo}>
                    <View style={styles.sitterHeader}>
                        <Text style={[styles.sitterName, { color: theme.textPrimary }]}>{sitter.name}</Text>
                        {sitter.isVerified && (
                            <Award size={14} color="#10B981" strokeWidth={1.5} />
                        )}
                    </View>
                    <View style={styles.sitterMeta}>
                        {sitter.rating > 0 && (
                            <View style={styles.ratingBadge}>
                                <Star size={12} color="#FBBF24" fill="#FBBF24" />
                                <Text style={styles.ratingText}>{sitter.rating.toFixed(1)}</Text>
                            </View>
                        )}
                        {sitter.experience && (
                            <Text style={[styles.experienceText, { color: theme.textSecondary }]}>
                                {sitter.experience}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.priceSection}>
                    <Text style={[styles.priceAmount, { color: theme.textPrimary }]}>₪{sitter.pricePerHour}</Text>
                    <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>לשעה</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // Sort Pills
    const SortPills = () => (
        <View style={styles.sortRow}>
            {(['rating', 'price', 'distance'] as const).map((sort) => (
                <TouchableOpacity
                    key={sort}
                    style={[
                        styles.sortPill,
                        {
                            backgroundColor: sortBy === sort ? theme.textPrimary : 'transparent',
                            borderColor: theme.border,
                        }
                    ]}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSortBy(sort);
                    }}
                >
                    <Text style={[styles.sortPillText, { color: sortBy === sort ? theme.card : theme.textSecondary }]}>
                        {sort === 'rating' ? 'דירוג' : sort === 'price' ? 'מחיר' : 'מרחק'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // Sitter Registration CTA (for non-registered users)
    const SitterRegistrationCTA = () => (
        <View style={styles.registrationContainer}>
            <View style={[styles.registrationCard, { backgroundColor: theme.card }]}>
                <UserPlus size={48} color={theme.textSecondary} strokeWidth={1} />
                <Text style={[styles.registrationTitle, { color: theme.textPrimary }]}>
                    הצטרף כסיטר/ית
                </Text>
                <Text style={[styles.registrationSubtitle, { color: theme.textSecondary }]}>
                    הרוויח/י כסף ועזור/י להורים באזור שלך
                </Text>
                <TouchableOpacity
                    style={[styles.registrationBtn, { backgroundColor: theme.textPrimary }]}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.navigate('SitterRegistration');
                    }}
                >
                    <Text style={[styles.registrationBtnText, { color: theme.card }]}>
                        התחל הרשמה
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Sitter Dashboard CTA (for registered users)
    const SitterDashboardCTA = () => (
        <View style={styles.sitterModeContainer}>
            <Briefcase size={48} color={theme.textSecondary} strokeWidth={1} />
            <Text style={[styles.sitterModeTitle, { color: theme.textPrimary }]}>מצב סיטר</Text>
            <Text style={[styles.sitterModeSubtitle, { color: theme.textSecondary }]}>
                עבור לדשבורד שלך לצפייה בהזמנות
            </Text>
            <TouchableOpacity
                style={[styles.dashboardBtn, { backgroundColor: theme.textPrimary }]}
                onPress={() => navigation.navigate('SitterDashboard')}
            >
                <Text style={[styles.dashboardBtnText, { color: theme.card }]}>עבור לדשבורד ←</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>מצא סיטר</Text>
                    {userPhoto ? (
                        <Image source={{ uri: userPhoto }} style={styles.userPhoto} />
                    ) : (
                        <View style={[styles.userPhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                            <User size={16} color={theme.textSecondary} />
                        </View>
                    )}
                </View>

                {/* Mode Toggle */}
                <View style={[styles.modeToggle, { backgroundColor: theme.cardSecondary }]}>
                    <TouchableOpacity
                        style={[styles.modeBtn, userMode === 'parent' && [styles.modeBtnActive, { backgroundColor: theme.card }]]}
                        onPress={() => setUserMode('parent')}
                    >
                        <Search size={16} color={userMode === 'parent' ? theme.textPrimary : theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.modeBtnText, { color: userMode === 'parent' ? theme.textPrimary : theme.textSecondary }]}>
                            מצב הורה
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeBtn, userMode === 'sitter' && [styles.modeBtnActive, { backgroundColor: theme.card }]]}
                        onPress={() => setUserMode('sitter')}
                    >
                        <Briefcase size={16} color={userMode === 'sitter' ? theme.textPrimary : theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.modeBtnText, { color: userMode === 'sitter' ? theme.textPrimary : theme.textSecondary }]}>
                            מצב סיטר
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Parent Mode Content */}
            {userMode === 'parent' && (
                <>
                    {/* Sort & Count */}
                    <View style={styles.filterSection}>
                        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
                            {sortedSitters.length} סיטרים זמינים
                        </Text>
                        <SortPills />
                    </View>

                    {/* Sitters List */}
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#6366F1" />
                        </View>
                    ) : sortedSitters.length === 0 ? (
                        <View style={styles.emptyState}>
                            <User size={48} color={theme.border} strokeWidth={1} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>אין סיטרים זמינים כרגע</Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                            }
                            contentContainerStyle={styles.scrollContent}
                        >
                            {sortedSitters.map((sitter) => (
                                <SitterCard key={sitter.id} sitter={sitter} />
                            ))}
                            <View style={{ height: 100 }} />
                        </ScrollView>
                    )}
                </>
            )}

            {/* Sitter Mode */}
            {userMode === 'sitter' && (
                <>
                    {checkingStatus ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>בודק סטטוס...</Text>
                        </View>
                    ) : isSitterRegistered ? (
                        <SitterDashboardCTA />
                    ) : (
                        <SitterRegistrationCTA />
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    userPhoto: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    userPhotoPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Mode Toggle
    modeToggle: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modeBtnActive: {},
    modeBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Filter Section
    filterSection: {
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    resultsCount: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
        marginBottom: 10,
    },
    sortRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    sortPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    sortPillText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Sitter Card
    scrollContent: {
        paddingHorizontal: 20,
    },
    sitterCard: {
        borderRadius: 14,
        marginBottom: 10,
        padding: 14,
    },
    sitterCardContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    sitterPhoto: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    sitterPhotoPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sitterInfo: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    sitterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sitterName: {
        fontSize: 15,
        fontWeight: '600',
    },
    sitterMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#92400E',
    },
    experienceText: {
        fontSize: 12,
    },
    priceSection: {
        alignItems: 'center',
    },
    priceAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    priceLabel: {
        fontSize: 11,
    },

    // Loading & Empty
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },

    // Registration CTA
    registrationContainer: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    registrationCard: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 20,
        gap: 12,
    },
    registrationTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginTop: 8,
    },
    registrationSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    registrationBtn: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginTop: 8,
    },
    registrationBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Sitter Mode
    sitterModeContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    sitterModeTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    sitterModeSubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    dashboardBtn: {
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 12,
        marginTop: 8,
    },
    dashboardBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default BabySitterScreen;

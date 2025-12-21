// pages/SitterDashboardScreen.tsx - Real Sitter Dashboard with Firebase Data
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    Platform,
} from 'react-native';
import {
    Calendar, Clock, Users, DollarSign, CheckCircle,
    XCircle, ChevronLeft, Star, MessageSquare, Settings,
    User, Baby
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useActiveChild } from '../context/ActiveChildContext';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SitterProfile {
    id: string;
    name: string;
    photoUrl: string | null;
    rating: number;
    reviewCount: number;
    pricePerHour: number;
    isVerified: boolean;
}

interface Booking {
    id: string;
    parentId: string;
    parentName: string;
    parentPhoto: string | null;
    date: Date;
    startTime: string;
    endTime: string;
    childrenCount: number;
    totalPrice: number;
    status: 'pending' | 'accepted' | 'completed' | 'cancelled';
    childId?: string;
}

interface Stats {
    monthlyEarnings: number;
    completedBookings: number;
    pendingBookings: number;
    totalHours: number;
}

const SitterDashboardScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

    const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<Stats>({
        monthlyEarnings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        totalHours: 0,
    });

    // Fetch sitter profile
    const fetchSitterProfile = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return null;

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    id: userId,
                    name: data.displayName || auth.currentUser?.displayName || 'סיטר',
                    photoUrl: data.photoUrl || auth.currentUser?.photoURL || null,
                    rating: data.sitterRating || 0,
                    reviewCount: data.sitterReviewCount || 0,
                    pricePerHour: data.sitterPrice || 50,
                    isVerified: data.sitterVerified || false,
                };
            }
        } catch {
            // Silent fail
        }

        // Fallback to auth user
        return {
            id: userId,
            name: auth.currentUser?.displayName || 'סיטר',
            photoUrl: auth.currentUser?.photoURL || null,
            rating: 0,
            reviewCount: 0,
            pricePerHour: 50,
            isVerified: false,
        };
    };

    // Fetch bookings
    const fetchBookings = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return [];

        try {
            const q = query(
                collection(db, 'bookings'),
                where('sitterId', '==', userId),
                orderBy('date', 'desc')
            );

            const snapshot = await getDocs(q);
            const fetchedBookings: Booking[] = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();

                // Get parent info
                let parentName = 'הורה';
                let parentPhoto = null;
                if (data.parentId) {
                    try {
                        const parentDoc = await getDoc(doc(db, 'users', data.parentId));
                        if (parentDoc.exists()) {
                            parentName = parentDoc.data().displayName || 'הורה';
                            parentPhoto = parentDoc.data().photoUrl || null;
                        }
                    } catch {
                        // Silent
                    }
                }

                fetchedBookings.push({
                    id: docSnap.id,
                    parentId: data.parentId,
                    parentName,
                    parentPhoto,
                    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
                    startTime: data.startTime || '--:--',
                    endTime: data.endTime || '--:--',
                    childrenCount: data.childrenCount || 1,
                    totalPrice: data.totalPrice || 0,
                    status: data.status || 'pending',
                    childId: data.childId,
                });
            }

            return fetchedBookings;
        } catch {
            return [];
        }
    };

    // Calculate stats
    const calculateStats = (bookingsList: Booking[]): Stats => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        let monthlyEarnings = 0;
        let completedBookings = 0;
        let pendingBookings = 0;

        bookingsList.forEach(booking => {
            if (booking.status === 'completed') {
                completedBookings++;
                if (booking.date >= monthStart && booking.date <= monthEnd) {
                    monthlyEarnings += booking.totalPrice;
                }
            } else if (booking.status === 'pending') {
                pendingBookings++;
            }
        });

        return {
            monthlyEarnings,
            completedBookings,
            pendingBookings,
            totalHours: 0,
        };
    };

    // Load all data
    const loadData = async () => {
        setLoading(true);

        const profile = await fetchSitterProfile();
        setSitterProfile(profile);

        const fetchedBookings = await fetchBookings();
        setBookings(fetchedBookings);
        setStats(calculateStats(fetchedBookings));

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    // Handle booking actions
    const handleAcceptBooking = async (bookingId: string) => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'accepted'
            });
            loadData();
        } catch {
            // Silent
        }
    };

    const handleDeclineBooking = async (bookingId: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled'
            });
            loadData();
        } catch {
            // Silent
        }
    };

    // Filter bookings by tab
    const filteredBookings = bookings.filter(b =>
        activeTab === 'pending'
            ? (b.status === 'pending' || b.status === 'accepted')
            : b.status === 'completed'
    );

    // ========== COMPONENTS ==========

    // Minimalist Stat Card
    const StatCard = ({ icon: Icon, value, label }: any) => (
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.cardSecondary }]}>
                <Icon size={18} color={theme.textSecondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
        </View>
    );

    // Booking Card
    const BookingCard = ({ booking }: { booking: Booking }) => (
        <View style={[styles.bookingCard, { backgroundColor: theme.card }]}>
            <View style={styles.bookingHeader}>
                {booking.parentPhoto ? (
                    <Image source={{ uri: booking.parentPhoto }} style={styles.parentPhoto} />
                ) : (
                    <View style={[styles.parentPhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                        <User size={20} color={theme.textSecondary} />
                    </View>
                )}
                <View style={styles.bookingInfo}>
                    <Text style={[styles.parentName, { color: theme.textPrimary }]}>
                        {booking.parentName}
                    </Text>
                    <Text style={[styles.bookingDate, { color: theme.textSecondary }]}>
                        {format(booking.date, 'd/M/yy', { locale: he })} • {booking.startTime}-{booking.endTime}
                    </Text>
                </View>
                <View style={styles.bookingPrice}>
                    <Text style={[styles.priceAmount, { color: theme.textPrimary }]}>₪{booking.totalPrice}</Text>
                </View>
            </View>

            <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                    <Baby size={14} color={theme.textSecondary} strokeWidth={1.5} />
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>{booking.childrenCount} ילדים</Text>
                </View>
            </View>

            {booking.status === 'pending' && (
                <View style={styles.bookingActions}>
                    <TouchableOpacity
                        style={[styles.declineBtn, { backgroundColor: theme.cardSecondary }]}
                        onPress={() => handleDeclineBooking(booking.id)}
                    >
                        <XCircle size={16} color="#9CA3AF" strokeWidth={1.5} />
                        <Text style={styles.declineBtnText}>דחה</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptBooking(booking.id)}
                    >
                        <CheckCircle size={16} color="#fff" strokeWidth={1.5} />
                        <Text style={styles.acceptBtnText}>אשר</Text>
                    </TouchableOpacity>
                </View>
            )}

            {booking.status === 'accepted' && (
                <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.statusText, { color: '#2563EB' }]}>מאושר</Text>
                </View>
            )}

            {booking.status === 'completed' && (
                <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                    <CheckCircle size={14} color="#059669" strokeWidth={1.5} />
                    <Text style={[styles.statusText, { color: '#059669' }]}>הושלם</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {/* Minimalist Header */}
                <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>מצב סיטר</Text>
                        <TouchableOpacity>
                            <Settings size={22} color={theme.textSecondary} strokeWidth={1.5} />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        {sitterProfile?.photoUrl ? (
                            <Image source={{ uri: sitterProfile.photoUrl }} style={styles.profilePhoto} />
                        ) : (
                            <View style={[styles.profilePhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                                <User size={32} color={theme.textSecondary} />
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                                {sitterProfile?.name || 'סיטר'}
                            </Text>
                            {sitterProfile?.rating ? (
                                <View style={styles.ratingRow}>
                                    <Star size={14} color="#FBBF24" fill="#FBBF24" />
                                    <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
                                        {sitterProfile.rating.toFixed(1)} ({sitterProfile.reviewCount})
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        {sitterProfile?.isVerified && (
                            <View style={styles.verifiedBadge}>
                                <CheckCircle size={16} color="#10B981" fill="#D1FAE5" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard icon={DollarSign} value={`₪${stats.monthlyEarnings}`} label="החודש" />
                    <StatCard icon={CheckCircle} value={stats.completedBookings} label="הושלמו" />
                    <StatCard icon={Clock} value={stats.pendingBookings} label="ממתינות" />
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: theme.card }]}>
                        <Calendar size={20} color={theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>זמינות</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: theme.card }]}>
                        <MessageSquare size={20} color={theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>הודעות</Text>
                    </TouchableOpacity>
                </View>

                {/* Bookings Section */}
                <View style={styles.bookingsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>הזמנות</Text>

                    {/* Tabs */}
                    <View style={[styles.tabs, { backgroundColor: theme.cardSecondary }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'pending' && [styles.tabActive, { backgroundColor: theme.card }]]}
                            onPress={() => setActiveTab('pending')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'pending' ? theme.textPrimary : theme.textSecondary }]}>
                                ממתינות ({bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'completed' && [styles.tabActive, { backgroundColor: theme.card }]]}
                            onPress={() => setActiveTab('completed')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'completed' ? theme.textPrimary : theme.textSecondary }]}>
                                הושלמו
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Booking Cards */}
                    {filteredBookings.length > 0 ? (
                        filteredBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} />
                        ))
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                            <Calendar size={36} color={theme.textSecondary} strokeWidth={1} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                {activeTab === 'pending' ? 'אין הזמנות ממתינות' : 'אין הזמנות שהושלמו'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: 20 },

    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    profileSection: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    profilePhoto: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    profilePhotoPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: {
        flex: 1,
        marginRight: 14,
        alignItems: 'flex-end',
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 13,
    },
    verifiedBadge: {
        marginLeft: 8,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginTop: 20,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 24,
    },
    quickActionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 6,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Bookings Section
    bookingsSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 14,
    },
    tabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 14,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {},
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Booking Card
    bookingCard: {
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    bookingHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 10,
    },
    parentPhoto: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    parentPhotoPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookingInfo: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    parentName: {
        fontSize: 15,
        fontWeight: '600',
    },
    bookingDate: {
        fontSize: 12,
        marginTop: 2,
    },
    bookingPrice: {
        alignItems: 'center',
    },
    priceAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    bookingDetails: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 12,
    },
    bookingActions: {
        flexDirection: 'row',
        gap: 8,
    },
    declineBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    declineBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    acceptBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#374151',
    },
    acceptBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 14,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default SitterDashboardScreen;

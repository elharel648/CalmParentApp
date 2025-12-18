import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Mock data for demo
const MOCK_SITTER_DATA = {
    name: 'נועה כהן',
    age: 24,
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    rating: 4.9,
    reviewCount: 47,
    pricePerHour: 55,
    isVerified: true,
    totalEarnings: 3450,
    monthlyEarnings: 1280,
    completedBookings: 32,
    pendingBookings: 2,
};

const MOCK_BOOKINGS = [
    {
        id: 1,
        parentName: 'משפחת לוי',
        parentPhoto: 'https://randomuser.me/api/portraits/men/45.jpg',
        date: '2024-12-19',
        time: '18:00-22:00',
        childrenCount: 2,
        totalPrice: 220,
        status: 'pending',
    },
    {
        id: 2,
        parentName: 'משפחת כהן',
        parentPhoto: 'https://randomuser.me/api/portraits/women/65.jpg',
        date: '2024-12-20',
        time: '10:00-14:00',
        childrenCount: 1,
        totalPrice: 220,
        status: 'pending',
    },
    {
        id: 3,
        parentName: 'משפחת אברהם',
        parentPhoto: 'https://randomuser.me/api/portraits/men/32.jpg',
        date: '2024-12-15',
        time: '17:00-21:00',
        childrenCount: 2,
        totalPrice: 220,
        status: 'completed',
    },
];

const SitterDashboardScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending'); // pending, completed

    const sitter = MOCK_SITTER_DATA;

    const filteredBookings = useMemo(() =>
        MOCK_BOOKINGS.filter(b => b.status === activeTab),
        [activeTab]
    );

    const onRefresh = async () => {
        setRefreshing(true);
        // TODO: Fetch from Firebase
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    const handleAcceptBooking = (bookingId) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // TODO: Update in Firebase
        console.log('Accepted booking:', bookingId);
    };

    const handleDeclineBooking = (bookingId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // TODO: Update in Firebase
        console.log('Declined booking:', bookingId);
    };

    // Stats Card Component
    const StatCard = ({ icon, value, label, color, gradient }) => (
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <LinearGradient colors={gradient} style={styles.statIconBg}>
                <Ionicons name={icon} size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
        </View>
    );

    // Booking Card Component
    const BookingCard = ({ booking }) => (
        <View style={[styles.bookingCard, { backgroundColor: theme.card }]}>
            <View style={styles.bookingHeader}>
                <Image source={{ uri: booking.parentPhoto }} style={styles.parentPhoto} />
                <View style={styles.bookingInfo}>
                    <Text style={[styles.parentName, { color: theme.textPrimary }]}>
                        {booking.parentName}
                    </Text>
                    <Text style={[styles.bookingDate, { color: theme.textSecondary }]}>
                        {booking.date} • {booking.time}
                    </Text>
                </View>
                <View style={styles.bookingPrice}>
                    <Text style={styles.priceAmount}>₪{booking.totalPrice}</Text>
                </View>
            </View>

            <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                    <Ionicons name="people" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{booking.childrenCount} ילדים</Text>
                </View>
            </View>

            {booking.status === 'pending' && (
                <View style={styles.bookingActions}>
                    <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDeclineBooking(booking.id)}
                    >
                        <Text style={styles.declineBtnText}>דחה</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptBooking(booking.id)}
                    >
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.acceptBtnGradient}>
                            <Text style={styles.acceptBtnText}>אשר הזמנה</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {booking.status === 'completed' && (
                <View style={[styles.completedBadge, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text style={styles.completedText}>הושלם</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header Profile */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        style={styles.headerGradient}
                    >
                        <View style={styles.profileSection}>
                            <Image source={{ uri: sitter.photoUrl }} style={styles.profilePhoto} />
                            {sitter.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                </View>
                            )}
                        </View>
                        <Text style={styles.profileName}>{sitter.name}, {sitter.age}</Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={16} color="#FFC107" />
                            <Text style={styles.ratingText}>{sitter.rating} ({sitter.reviewCount} ביקורות)</Text>
                        </View>
                        <TouchableOpacity style={styles.editProfileBtn}>
                            <Ionicons name="pencil" size={16} color="#fff" />
                            <Text style={styles.editProfileText}>ערוך פרופיל</Text>
                        </TouchableOpacity>

                        {/* Switch to Parent Mode */}
                        <TouchableOpacity
                            style={styles.switchModeBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="search" size={16} color="#6366F1" />
                            <Text style={styles.switchModeText}>חזור למצב הורה</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="wallet"
                        value={`₪${sitter.monthlyEarnings}`}
                        label="החודש"
                        gradient={['#10B981', '#059669']}
                    />
                    <StatCard
                        icon="calendar-outline"
                        value={sitter.completedBookings}
                        label="הזמנות שהושלמו"
                        gradient={['#6366F1', '#8B5CF6']}
                    />
                    <StatCard
                        icon="time-outline"
                        value={sitter.pendingBookings}
                        label="ממתינות"
                        gradient={['#F59E0B', '#D97706']}
                    />
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: theme.card }]}>
                        <Ionicons name="calendar" size={22} color="#6366F1" />
                        <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>זמינות</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: theme.card }]}>
                        <Ionicons name="chatbubbles" size={22} color="#10B981" />
                        <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>הודעות</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: theme.card }]}>
                        <Ionicons name="card" size={22} color="#F59E0B" />
                        <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>תשלומים</Text>
                    </TouchableOpacity>
                </View>

                {/* Bookings Section */}
                <View style={styles.bookingsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>הזמנות</Text>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                            onPress={() => setActiveTab('pending')}
                        >
                            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                                ממתינות ({MOCK_BOOKINGS.filter(b => b.status === 'pending').length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
                            onPress={() => setActiveTab('completed')}
                        >
                            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
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
                            <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                {activeTab === 'pending' ? 'אין הזמנות ממתינות' : 'אין הזמנות שהושלמו'}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },

    // Header
    header: {
        marginBottom: 20,
    },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    profileSection: {
        position: 'relative',
        marginBottom: 12,
    },
    profilePhoto: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#fff',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: -5,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    editProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    editProfileText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    switchModeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 10,
    },
    switchModeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366F1',
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
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
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Bookings Section
    bookingsSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'right',
    },
    tabs: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    tabActive: {
        backgroundColor: '#6366F1',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#fff',
    },

    // Booking Card
    bookingCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    bookingHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 12,
    },
    parentPhoto: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    bookingInfo: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    parentName: {
        fontSize: 16,
        fontWeight: '700',
    },
    bookingDate: {
        fontSize: 13,
        marginTop: 2,
    },
    bookingPrice: {
        alignItems: 'center',
    },
    priceAmount: {
        fontSize: 18,
        fontWeight: '800',
        color: '#10B981',
    },
    bookingDetails: {
        flexDirection: 'row-reverse',
        gap: 16,
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 13,
        color: '#6B7280',
    },
    bookingActions: {
        flexDirection: 'row',
        gap: 10,
    },
    declineBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
    },
    declineBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#DC2626',
    },
    acceptBtn: {
        flex: 2,
    },
    acceptBtnGradient: {
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    acceptBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 10,
    },
    completedText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#059669',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        padding: 40,
        borderRadius: 16,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default SitterDashboardScreen;

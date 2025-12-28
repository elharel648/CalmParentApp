// pages/SitterDashboardScreen.tsx - Real Sitter Dashboard with Firebase Data
import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
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
    Modal,
    TextInput,
    Switch,
    Alert,
    KeyboardAvoidingView,
} from 'react-native';
import {
    Calendar, Clock, Users, CheckCircle,
    XCircle, ChevronRight, Star, MessageSquare, Settings,
    User, Baby, MapPin, Phone, Mail, Bell, X, Trash2, Edit3, Send
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

// Helper function to format relative time in Hebrew
const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    return `לפני ${diffDays} ימים`;
};

const SitterDashboardScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [settingsVisible, setSettingsVisible] = useState(false);

    // Settings state
    const [preferredLocation, setPreferredLocation] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [availableForBookings, setAvailableForBookings] = useState(true);
    const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
    const [messagesModalVisible, setMessagesModalVisible] = useState(false);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [availableDays, setAvailableDays] = useState<string[]>(['0', '1', '2', '3', '4']); // Sun-Thu

    // Mock messages for DEV mode
    const mockMessages = __DEV__ ? [
        {
            id: 'msg_1',
            parentName: 'שירה לוי',
            parentPhoto: 'https://i.pravatar.cc/100?img=5',
            lastMessage: 'היי! האם את זמינה ביום שישי בערב?',
            timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
            unread: true,
        },
        {
            id: 'msg_2',
            parentName: 'יוסי כהן',
            parentPhoto: 'https://i.pravatar.cc/100?img=12',
            lastMessage: 'מעולה, אישרתי את ההזמנה. תודה!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            unread: true,
        },
        {
            id: 'msg_3',
            parentName: 'רונית אברהם',
            parentPhoto: 'https://i.pravatar.cc/100?img=25',
            lastMessage: 'הילדים נהנו מאוד! תודה רבה 💕',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
            unread: false,
        },
        {
            id: 'msg_4',
            parentName: 'נועה רוזנברג',
            parentPhoto: 'https://i.pravatar.cc/100?img=45',
            lastMessage: 'האם תוכלי להישאר שעה נוספת?',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            unread: false,
        },
    ] : [];

    // Mock chat history for each conversation
    const mockChatHistory: { [key: string]: { id: string; text: string; fromMe: boolean; time: string }[] } = {
        'msg_1': [
            { id: 'c1', text: 'היי! ראיתי את הפרופיל שלך ואת נראית מעולה!', fromMe: false, time: '14:20' },
            { id: 'c2', text: 'תודה רבה! 😊', fromMe: true, time: '14:25' },
            { id: 'c3', text: 'האם את זמינה ביום שישי בערב?', fromMe: false, time: '14:30' },
        ],
        'msg_2': [
            { id: 'c1', text: 'שלום, אשמח להזמין אותך ליום שלישי', fromMe: false, time: '10:00' },
            { id: 'c2', text: 'בשמחה! באיזה שעות?', fromMe: true, time: '10:15' },
            { id: 'c3', text: '18:00-22:00, מתאים?', fromMe: false, time: '10:20' },
            { id: 'c4', text: 'מושלם! אני שם 👍', fromMe: true, time: '10:22' },
            { id: 'c5', text: 'מעולה, אישרתי את ההזמנה. תודה!', fromMe: false, time: '10:25' },
        ],
        'msg_3': [
            { id: 'c1', text: 'איך היה אתמול?', fromMe: false, time: '09:00' },
            { id: 'c2', text: 'היה נהדר! הילדים ממש מתוקים', fromMe: true, time: '09:30' },
            { id: 'c3', text: 'הילדים נהנו מאוד! תודה רבה 💕', fromMe: false, time: '09:45' },
        ],
        'msg_4': [
            { id: 'c1', text: 'היי, יש לי בקשה קטנה...', fromMe: false, time: '16:00' },
            { id: 'c2', text: 'כן, מה קורה?', fromMe: true, time: '16:05' },
            { id: 'c3', text: 'האם תוכלי להישאר שעה נוספת?', fromMe: false, time: '16:10' },
        ],
    };

    const activeChat = mockMessages.find(m => m.id === activeChatId);

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

        // 🔧 DEV MOCK: Return mock data in development mode
        if (__DEV__) {
            console.log('🔧 DEV MOCK: Loading mock sitter dashboard data...');

            // Mock sitter profile with good stats
            const mockProfile: SitterProfile = {
                id: auth.currentUser?.uid || 'mock_sitter',
                name: auth.currentUser?.displayName || 'הראל אליהו',
                photoUrl: auth.currentUser?.photoURL || 'https://i.pravatar.cc/200?img=68',
                rating: 4.8,
                reviewCount: 15,
                pricePerHour: 60,
                isVerified: true,
            };
            setSitterProfile(mockProfile);

            // Mock bookings
            const now = new Date();
            const mockBookings: Booking[] = [
                {
                    id: 'booking_1',
                    parentId: 'parent_1',
                    parentName: 'שירה לוי',
                    parentPhoto: 'https://i.pravatar.cc/100?img=5',
                    date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                    startTime: '17:00',
                    endTime: '21:00',
                    childrenCount: 2,
                    totalPrice: 240,
                    status: 'pending',
                },
                {
                    id: 'booking_2',
                    parentId: 'parent_2',
                    parentName: 'יוסי כהן',
                    parentPhoto: 'https://i.pravatar.cc/100?img=12',
                    date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                    startTime: '18:30',
                    endTime: '23:00',
                    childrenCount: 1,
                    totalPrice: 270,
                    status: 'accepted',
                },
                {
                    id: 'booking_3',
                    parentId: 'parent_3',
                    parentName: 'מיכל דוד',
                    parentPhoto: 'https://i.pravatar.cc/100?img=9',
                    date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
                    startTime: '16:00',
                    endTime: '20:00',
                    childrenCount: 3,
                    totalPrice: 320,
                    status: 'pending',
                },
                {
                    id: 'booking_4',
                    parentId: 'parent_4',
                    parentName: 'רונית אברהם',
                    parentPhoto: 'https://i.pravatar.cc/100?img=25',
                    date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                    startTime: '19:00',
                    endTime: '23:30',
                    childrenCount: 2,
                    totalPrice: 360,
                    status: 'completed',
                },
                {
                    id: 'booking_5',
                    parentId: 'parent_5',
                    parentName: 'אורי מזרחי',
                    parentPhoto: 'https://i.pravatar.cc/100?img=15',
                    date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Week ago
                    startTime: '15:00',
                    endTime: '19:00',
                    childrenCount: 1,
                    totalPrice: 240,
                    status: 'completed',
                },
                {
                    id: 'booking_6',
                    parentId: 'parent_6',
                    parentName: 'נועה רוזנברג',
                    parentPhoto: 'https://i.pravatar.cc/100?img=45',
                    date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                    startTime: '18:00',
                    endTime: '22:00',
                    childrenCount: 2,
                    totalPrice: 280,
                    status: 'completed',
                },
                {
                    id: 'booking_7',
                    parentId: 'parent_7',
                    parentName: 'דניאל גולדשטיין',
                    parentPhoto: 'https://i.pravatar.cc/100?img=33',
                    date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
                    startTime: '17:30',
                    endTime: '21:30',
                    childrenCount: 1,
                    totalPrice: 240,
                    status: 'completed',
                },
            ];
            setBookings(mockBookings);

            // Mock stats
            setStats({
                monthlyEarnings: 1120, // Sum of completed bookings
                completedBookings: 4,
                pendingBookings: 2,
                totalHours: 18,
            });

            setLoading(false);
            setRefreshing(false);
            console.log('🔧 DEV MOCK: Dashboard loaded with', mockBookings.length, 'bookings');
            return;
        }

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
    const StatCard = ({ icon, value, label }: any) => (
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.cardSecondary }]}>
                {typeof icon === 'string' ? (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textSecondary }}>₪</Text>
                ) : (
                    React.createElement(icon, { size: 18, color: theme.textSecondary, strokeWidth: 1.5 })
                )}
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
            {/* Background Gradient - Apple Style */}
            <LinearGradient
                colors={['#FAFAFA', '#F5F5F5', '#FAFAFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

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
                            <ChevronRight size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>מצב סיטר</Text>
                        <TouchableOpacity onPress={() => setSettingsVisible(true)}>
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
                    <StatCard icon="shekel" value={`₪${stats.monthlyEarnings}`} label="החודש" />
                    <StatCard icon={CheckCircle} value={stats.completedBookings} label="הושלמו" />
                    <StatCard icon={Clock} value={stats.pendingBookings} label="ממתינות" />
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.card }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAvailabilityModalVisible(true);
                        }}
                    >
                        <Calendar size={20} color={theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>זמינות</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.card }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMessagesModalVisible(true);
                        }}
                    >
                        <View>
                            <MessageSquare size={20} color={theme.textSecondary} strokeWidth={1.5} />
                            {mockMessages.filter(m => m.unread).length > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadBadgeText}>{mockMessages.filter(m => m.unread).length}</Text>
                                </View>
                            )}
                        </View>
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

            {/* Settings Modal */}
            <Modal
                visible={settingsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSettingsVisible(false)}
            >
                <View style={styles.settingsOverlay}>
                    <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
                        {/* Header */}
                        <View style={styles.settingsHeader}>
                            <View style={{ width: 24 }} />
                            <Text style={[styles.settingsTitle, { color: theme.textPrimary }]}>הגדרות סיטר</Text>
                            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContent}>
                            {/* Location */}
                            <View style={styles.settingsSection}>
                                <View style={styles.settingRow}>
                                    <MapPin size={18} color={theme.textSecondary} />
                                    <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>מיקום מועדף</Text>
                                </View>
                                <TextInput
                                    style={[styles.settingsInput, { backgroundColor: theme.cardSecondary, color: theme.textPrimary }]}
                                    value={preferredLocation}
                                    onChangeText={setPreferredLocation}
                                    placeholder="עיר או שכונה..."
                                    placeholderTextColor={theme.textSecondary}
                                    textAlign="right"
                                />
                            </View>

                            {/* Phone */}
                            <View style={styles.settingsSection}>
                                <View style={styles.settingRow}>
                                    <Phone size={18} color={theme.textSecondary} />
                                    <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>טלפון ליצירת קשר</Text>
                                </View>
                                <TextInput
                                    style={[styles.settingsInput, { backgroundColor: theme.cardSecondary, color: theme.textPrimary }]}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    placeholder="050-0000000"
                                    placeholderTextColor={theme.textSecondary}
                                    keyboardType="phone-pad"
                                    textAlign="right"
                                />
                            </View>

                            {/* Toggle Settings */}
                            <View style={styles.settingsSection}>
                                <View style={styles.settingToggleRow}>
                                    <Switch
                                        value={notificationsEnabled}
                                        onValueChange={setNotificationsEnabled}
                                        trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
                                        thumbColor={notificationsEnabled ? '#6366F1' : '#9CA3AF'}
                                    />
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>התראות</Text>
                                        <Bell size={18} color={theme.textSecondary} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.settingsSection}>
                                <View style={styles.settingToggleRow}>
                                    <Switch
                                        value={availableForBookings}
                                        onValueChange={setAvailableForBookings}
                                        trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                                        thumbColor={availableForBookings ? '#10B981' : '#9CA3AF'}
                                    />
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>זמין להזמנות</Text>
                                        <Calendar size={18} color={theme.textSecondary} />
                                    </View>
                                </View>
                            </View>

                            {/* Save Button */}
                            <TouchableOpacity
                                style={styles.saveSettingsBtn}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    setSettingsVisible(false);
                                    Alert.alert('נשמר!', 'ההגדרות נשמרו בהצלחה');
                                }}
                            >
                                <Text style={styles.saveSettingsBtnText}>שמור הגדרות</Text>
                            </TouchableOpacity>

                            {/* Edit Profile */}
                            <TouchableOpacity
                                style={styles.editProfileBtn}
                                onPress={() => {
                                    setSettingsVisible(false);
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    navigation.navigate('SitterRegistration');
                                }}
                            >
                                <Edit3 size={16} color="#6366F1" strokeWidth={1.5} />
                                <Text style={styles.editProfileBtnText}>ערוך פרופיל סיטר</Text>
                            </TouchableOpacity>

                            {/* Delete Account */}
                            <TouchableOpacity
                                style={styles.deleteAccountBtn}
                                onPress={() => {
                                    Alert.alert(
                                        'מחיקת חשבון סיטר',
                                        'האם אתה בטוח שברצונך למחוק את חשבון הסיטר שלך? לא ניתן לשחזר פעולה זו.',
                                        [
                                            { text: 'ביטול', style: 'cancel' },
                                            {
                                                text: 'מחק',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    const userId = auth.currentUser?.uid;
                                                    if (userId) {
                                                        try {
                                                            await updateDoc(doc(db, 'users', userId), {
                                                                isSitter: false,
                                                                sitterActive: false,
                                                                sitterVerified: false,
                                                            });
                                                            setSettingsVisible(false);
                                                            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                            Alert.alert('נמחק', 'חשבון הסיטר נמחק. תוכל להירשם מחדש בכל עת.');
                                                            navigation.replace('SitterList');
                                                        } catch {
                                                            Alert.alert('שגיאה', 'לא ניתן למחוק, נסה שוב');
                                                        }
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Trash2 size={16} color="#EF4444" strokeWidth={1.5} />
                                <Text style={styles.deleteAccountBtnText}>מחק חשבון סיטר</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Availability Modal */}
            <Modal
                visible={availabilityModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAvailabilityModalVisible(false)}
            >
                <View style={styles.settingsOverlay}>
                    <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
                        {/* Header */}
                        <View style={styles.settingsHeader}>
                            <View style={{ width: 24 }} />
                            <Text style={[styles.settingsTitle, { color: theme.textPrimary }]}>זמינות שבועית</Text>
                            <TouchableOpacity onPress={() => setAvailabilityModalVisible(false)}>
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContent}>
                            <Text style={[styles.availabilityInfo, { color: theme.textSecondary }]}>
                                בחר את הימים בהם אתה זמין לקבל הזמנות:
                            </Text>

                            {/* Day Toggles */}
                            {[
                                { key: '0', label: 'ראשון' },
                                { key: '1', label: 'שני' },
                                { key: '2', label: 'שלישי' },
                                { key: '3', label: 'רביעי' },
                                { key: '4', label: 'חמישי' },
                                { key: '5', label: 'שישי' },
                                { key: '6', label: 'שבת' },
                            ].map((day) => (
                                <TouchableOpacity
                                    key={day.key}
                                    style={[
                                        styles.dayRow,
                                        { backgroundColor: availableDays.includes(day.key) ? '#E8F5E9' : theme.cardSecondary }
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setAvailableDays(prev =>
                                            prev.includes(day.key)
                                                ? prev.filter(d => d !== day.key)
                                                : [...prev, day.key]
                                        );
                                    }}
                                >
                                    <Text style={[styles.dayLabel, { color: theme.textPrimary }]}>{day.label}</Text>
                                    <View style={[
                                        styles.dayCheckbox,
                                        { backgroundColor: availableDays.includes(day.key) ? '#10B981' : '#E5E7EB' }
                                    ]}>
                                        {availableDays.includes(day.key) && (
                                            <CheckCircle size={16} color="#fff" strokeWidth={2} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {/* Save Button */}
                            <TouchableOpacity
                                style={styles.saveSettingsBtn}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    setAvailabilityModalVisible(false);
                                    Alert.alert('נשמר!', `הזמינות עודכנה ל-${availableDays.length} ימים בשבוע`);
                                }}
                            >
                                <Text style={styles.saveSettingsBtnText}>שמור זמינות</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Messages Modal */}
            <Modal
                visible={messagesModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMessagesModalVisible(false)}
            >
                <View style={styles.settingsOverlay}>
                    <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
                        {/* Header */}
                        <View style={styles.settingsHeader}>
                            <View style={{ width: 24 }} />
                            <Text style={[styles.settingsTitle, { color: theme.textPrimary }]}>הודעות</Text>
                            <TouchableOpacity onPress={() => setMessagesModalVisible(false)}>
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContent}>
                            {mockMessages.length === 0 ? (
                                <View style={styles.emptyMessages}>
                                    <MessageSquare size={48} color={theme.textSecondary} strokeWidth={1} />
                                    <Text style={[styles.emptyMessagesText, { color: theme.textSecondary }]}>
                                        אין הודעות עדיין
                                    </Text>
                                </View>
                            ) : (
                                mockMessages.map((message) => (
                                    <TouchableOpacity
                                        key={message.id}
                                        style={[
                                            styles.messageRow,
                                            { backgroundColor: message.unread ? '#F0FDF4' : theme.cardSecondary }
                                        ]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setActiveChatId(message.id);
                                        }}
                                    >
                                        <Image source={{ uri: message.parentPhoto }} style={styles.messageAvatar} />
                                        <View style={styles.messageContent}>
                                            <View style={styles.messageHeader}>
                                                <Text style={[styles.messageName, { color: theme.textPrimary }]}>
                                                    {message.parentName}
                                                </Text>
                                                <Text style={[styles.messageTime, { color: theme.textSecondary }]}>
                                                    {formatRelativeTime(message.timestamp)}
                                                </Text>
                                            </View>
                                            <Text
                                                style={[
                                                    styles.messagePreview,
                                                    { color: message.unread ? theme.textPrimary : theme.textSecondary }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {message.lastMessage}
                                            </Text>
                                        </View>
                                        {message.unread && <View style={styles.unreadDot} />}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Chat Modal */}
            <Modal
                visible={activeChatId !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setActiveChatId(null)}
            >
                <View style={styles.chatOverlay}>
                    <View style={[styles.chatModal, { backgroundColor: theme.card }]}>
                        {/* Chat Header */}
                        <View style={[styles.chatHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    setActiveChatId(null);
                                    setChatInput('');
                                }}
                                style={styles.chatBackBtn}
                            >
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                            {activeChat && (
                                <View style={styles.chatHeaderInfo}>
                                    <Image source={{ uri: activeChat.parentPhoto }} style={styles.chatAvatar} />
                                    <Text style={[styles.chatName, { color: theme.textPrimary }]}>{activeChat.parentName}</Text>
                                </View>
                            )}
                            <View style={{ width: 22 }} />
                        </View>

                        {/* Messages */}
                        <ScrollView
                            style={styles.chatMessages}
                            contentContainerStyle={styles.chatMessagesContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {activeChatId && mockChatHistory[activeChatId]?.map((msg) => (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.chatBubble,
                                        msg.fromMe ? styles.chatBubbleMine : styles.chatBubbleTheirs,
                                        { backgroundColor: msg.fromMe ? '#10B981' : theme.cardSecondary }
                                    ]}
                                >
                                    <Text style={[
                                        styles.chatBubbleText,
                                        { color: msg.fromMe ? '#fff' : theme.textPrimary }
                                    ]}>
                                        {msg.text}
                                    </Text>
                                    <Text style={[
                                        styles.chatBubbleTime,
                                        { color: msg.fromMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
                                    ]}>
                                        {msg.time}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Input Area */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            keyboardVerticalOffset={100}
                        >
                            <View style={[styles.chatInputContainer, { borderTopColor: theme.border }]}>
                                <TextInput
                                    style={[styles.chatInput, { backgroundColor: theme.cardSecondary, color: theme.textPrimary }]}
                                    placeholder="הקלד הודעה..."
                                    placeholderTextColor={theme.textSecondary}
                                    value={chatInput}
                                    onChangeText={setChatInput}
                                    multiline
                                    textAlign="right"
                                />
                                <TouchableOpacity
                                    style={[styles.chatSendBtn, { opacity: chatInput.trim() ? 1 : 0.5 }]}
                                    onPress={() => {
                                        if (chatInput.trim()) {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            Alert.alert('נשלח!', `ההודעה "${chatInput}" נשלחה בהצלחה`);
                                            setChatInput('');
                                        }
                                    }}
                                    disabled={!chatInput.trim()}
                                >
                                    <Send size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </View>
            </Modal>
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

    // Settings Modal
    settingsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    settingsModal: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '75%',
        paddingBottom: 40,
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    settingsTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    settingsContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    settingsSection: {
        marginBottom: 20,
    },
    settingRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    settingsInput: {
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
    },
    settingToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    saveSettingsBtn: {
        backgroundColor: '#374151',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    saveSettingsBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    editProfileBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#6366F1',
        marginBottom: 12,
    },
    editProfileBtnText: {
        color: '#6366F1',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteAccountBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        marginBottom: 20,
    },
    deleteAccountBtnText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },

    // Availability Modal Styles
    availabilityInfo: {
        fontSize: 14,
        textAlign: 'right',
        marginBottom: 16,
    },
    dayRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    dayLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    dayCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Messages Modal Styles
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    emptyMessages: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 16,
    },
    emptyMessagesText: {
        fontSize: 16,
    },
    messageRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    messageAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    messageContent: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    messageName: {
        fontSize: 15,
        fontWeight: '600',
    },
    messageTime: {
        fontSize: 12,
    },
    messagePreview: {
        fontSize: 14,
        textAlign: 'right',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },

    // Chat Modal Styles
    chatOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    chatModal: {
        height: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    chatHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    chatBackBtn: {
        padding: 4,
    },
    chatHeaderInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    chatAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    chatName: {
        fontSize: 17,
        fontWeight: '600',
    },
    chatMessages: {
        flex: 1,
    },
    chatMessagesContent: {
        padding: 16,
        gap: 10,
    },
    chatBubble: {
        maxWidth: '78%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    chatBubbleMine: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    chatBubbleTheirs: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    chatBubbleText: {
        fontSize: 15,
        textAlign: 'right',
        lineHeight: 21,
    },
    chatBubbleTime: {
        fontSize: 11,
        marginTop: 4,
        textAlign: 'left',
    },
    chatInputContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 10,
        borderTopWidth: 1,
    },
    chatInput: {
        flex: 1,
        minHeight: 42,
        maxHeight: 100,
        borderRadius: 21,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
    },
    chatSendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SitterDashboardScreen;

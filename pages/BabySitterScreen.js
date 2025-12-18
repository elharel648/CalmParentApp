import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks
import useLocation from '../hooks/useLocation';
import useSitters from '../hooks/useSitters';
import useFilters from '../hooks/useFilters';

// Components
import SearchBar from '../components/BabySitter/SearchBar';
import FilterBar from '../components/BabySitter/FilterBar';
import SitterCard from '../components/BabySitter/SitterCard';
import SitterMapView from '../components/BabySitter/SitterMapView';
import CalendarModal from '../components/BabySitter/CalendarModal';

// Constants
import { VIEW_MODES } from '../constants/babySitter';

/**
 * מסך ראשי לחיפוש בייביסיטרים
 * משתמש בארכיטקטורה מודולרית עם custom hooks וקומפוננטות נפרדות
 */
const BabySitterScreen = ({ navigation }) => {
    // Custom Hooks
    const { address, coordinates, isLoading: isLoadingLocation } = useLocation();
    const { sitters, isLoading: isLoadingSitters } = useSitters();
    const { sortBy, setSortBy, sortedData, availableFilters } = useFilters(sitters);

    // Local State
    const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [userMode, setUserMode] = useState('parent'); // 'parent' or 'sitter'
    const [isRegisteredSitter, setIsRegisteredSitter] = useState(true); // TODO: Check from Firebase

    // Handlers
    const handleSitterPress = useCallback((sitter) => {
        navigation.navigate('SitterProfile', { sitterData: sitter });
    }, [navigation]);

    const handlePlayVideo = useCallback((sitter) => {
        Alert.alert(
            'וידאו היכרות',
            `כאן יתנגן סרטון קצר של ${sitter.name} מציגה את עצמה 🎥`
        );
    }, []);

    const handleDateConfirm = useCallback((newDate) => {
        setSelectedDate(newDate);
        setShowCalendar(false);
    }, []);

    const toggleViewMode = useCallback(() => {
        setViewMode((prev) =>
            prev === VIEW_MODES.LIST ? VIEW_MODES.MAP : VIEW_MODES.LIST
        );
    }, []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>היי, הורה 👋</Text>
                    <Text style={styles.subTitle}>בוא נמצא את האחת המושלמת</Text>
                </View>
                <TouchableOpacity
                    style={styles.profileBtn}
                    accessible={true}
                    accessibilityLabel="פרופיל משתמש"
                    accessibilityRole="button"
                >
                    <Image
                        source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
                        style={styles.profileImg}
                    />
                </TouchableOpacity>
            </View>

            {/* Mode Toggle - Only show if registered as sitter */}
            {isRegisteredSitter ? (
                <View style={styles.modeToggle}>
                    <TouchableOpacity
                        style={[styles.modeBtn, userMode === 'parent' && styles.modeBtnActive]}
                        onPress={() => setUserMode('parent')}
                    >
                        <Ionicons name="search" size={18} color={userMode === 'parent' ? '#fff' : '#6366F1'} />
                        <Text style={[styles.modeBtnText, userMode === 'parent' && styles.modeBtnTextActive]}>
                            מצב הורה
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeBtn, userMode === 'sitter' && styles.modeBtnActive]}
                        onPress={() => setUserMode('sitter')}
                    >
                        <Ionicons name="briefcase" size={18} color={userMode === 'sitter' ? '#fff' : '#6366F1'} />
                        <Text style={[styles.modeBtnText, userMode === 'sitter' && styles.modeBtnTextActive]}>
                            מצב סיטר
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* Join as Sitter Banner - Show for non-sitters */
                <TouchableOpacity
                    style={styles.sitterBanner}
                    onPress={() => navigation.navigate('SitterRegistration')}
                    activeOpacity={0.9}
                >
                    <View style={styles.sitterBannerContent}>
                        <Text style={styles.sitterBannerText}>את בייביסיטר? 💼</Text>
                        <Text style={styles.sitterBannerLink}>הצטרפי אלינו ←</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* PARENT MODE CONTENT */}
            {userMode === 'parent' && (
                <>
                    {/* Search Bar */}
                    <SearchBar
                        address={address}
                        isLoadingLocation={isLoadingLocation}
                        selectedDate={selectedDate}
                        onDatePress={() => setShowCalendar(true)}
                    />

                    {/* Content: List or Map View */}
                    {viewMode === VIEW_MODES.LIST ? (
                        <View style={styles.contentContainer}>
                            {/* Filter Bar */}
                            <FilterBar
                                resultsCount={sortedData.length}
                                filters={availableFilters}
                                selectedFilter={sortBy}
                                onFilterChange={setSortBy}
                            />

                            {/* Sitters List */}
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {sortedData.map((sitter) => (
                                    <SitterCard
                                        key={sitter.id}
                                        sitter={sitter}
                                        onPress={handleSitterPress}
                                        onPlayVideo={handlePlayVideo}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    ) : (
                        // Map View
                        <SitterMapView
                            sitters={sortedData}
                            userLocation={coordinates}
                            onMarkerPress={handleSitterPress}
                        />
                    )}
                </>
            )}

            {/* SITTER MODE - Redirect to Dashboard */}
            {userMode === 'sitter' && (
                <View style={styles.sitterModeContainer}>
                    <View style={styles.sitterModeContent}>
                        <Ionicons name="briefcase" size={60} color="#6366F1" />
                        <Text style={styles.sitterModeTitle}>מצב סיטר</Text>
                        <Text style={styles.sitterModeSubtitle}>עברי לדשבורד שלך לראות הזמנות והכנסות</Text>
                        <TouchableOpacity
                            style={styles.dashboardBtn}
                            onPress={() => navigation.navigate('SitterDashboard')}
                        >
                            <Text style={styles.dashboardBtnText}>עברי לדשבורד ←</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Floating Toggle Button (List/Map) */}
            <View style={styles.floatingBtnContainer}>
                <TouchableOpacity
                    style={styles.mapToggleBtn}
                    onPress={toggleViewMode}
                    accessible={true}
                    accessibilityLabel={`עבור ל${viewMode === VIEW_MODES.LIST ? 'מפה' : 'רשימה'}`}
                    accessibilityRole="button"
                >
                    <Text style={styles.mapToggleText}>
                        {viewMode === VIEW_MODES.LIST ? 'מפה' : 'רשימה'}
                    </Text>
                    <Ionicons
                        name={viewMode === VIEW_MODES.LIST ? 'map' : 'list'}
                        size={18}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>

            {/* Calendar Modal */}
            <CalendarModal
                visible={showCalendar}
                selectedDate={selectedDate}
                onConfirm={handleDateConfirm}
                onClose={() => setShowCalendar(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        paddingTop: 60,
    },

    // Header
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A1A',
        textAlign: 'right',
    },
    subTitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
        textAlign: 'right',
    },
    profileBtn: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        borderRadius: 20,
    },
    profileImg: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },

    // Content
    contentContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingHorizontal: 20,
    },

    // Floating Button
    floatingBtnContainer: {
        position: 'absolute',
        bottom: 30,
        width: '100%',
        alignItems: 'center',
        zIndex: 100,
    },
    mapToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    mapToggleText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Sitter Banner
    sitterBanner: {
        marginHorizontal: 24,
        marginBottom: 12,
        backgroundColor: '#EEF2FF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    sitterBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    sitterBannerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4338CA',
    },
    sitterBannerLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1',
    },

    // Mode Toggle
    modeToggle: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginBottom: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        padding: 4,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
    },
    modeBtnActive: {
        backgroundColor: '#6366F1',
    },
    modeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },
    modeBtnTextActive: {
        color: '#fff',
    },

    // Sitter Mode
    sitterModeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    sitterModeContent: {
        alignItems: 'center',
        gap: 16,
    },
    sitterModeTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    sitterModeSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    dashboardBtn: {
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 14,
        marginTop: 8,
    },
    dashboardBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});

export default BabySitterScreen;
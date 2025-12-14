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
});

export default BabySitterScreen;
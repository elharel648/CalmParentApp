import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Hooks
import { useChildProfile } from '../hooks/useChildProfile';
import { useHomeData } from '../hooks/useHomeData';
import { useMedications } from '../hooks/useMedications';
import { useGuardian } from '../hooks/useGuardian';

// Components
import {
    HeaderSection,
    GuardianSelector,
    QuickActions,
    MedicationsTracker,
    ShareStatusButton,
    HealthCard,
    SmartStatusCard,
} from '../components/Home';

import DailyTimeline from '../components/DailyTimeline';
import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';
import WhiteNoiseModal from '../components/WhiteNoiseModal';

// Services
import { auth } from '../services/firebaseConfig';
import { saveEventToFirebase, formatTimeFromTimestamp } from '../services/firebaseService';

// Types
import { TrackingType, DynamicStyles } from '../types/home';

/**
 * HomeScreen - Main dashboard with modular architecture
 * Reduced from 535 lines to ~180 lines
 */
export default function HomeScreen({ navigation }: any) {
    // --- Custom Hooks ---
    const { profile, greeting, loading: profileLoading } = useChildProfile();
    const {
        lastFeedTime,
        lastSleepTime,
        refresh: refreshHomeData,
    } = useHomeData(profile.id, profile.name, profile.ageMonths);
    const { meds, toggleMed, syncStatus, refresh: refreshMeds } = useMedications(profile.id);
    const { currentGuardian, setCurrentGuardian, availableRoles, isPremium } = useGuardian();

    // --- Local State ---
    const [isNightMode, setIsNightMode] = useState(false);
    const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
    const [isWhiteNoiseOpen, setIsWhiteNoiseOpen] = useState(false);
    const [trackingModalType, setTrackingModalType] = useState<TrackingType>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [timelineRefresh, setTimelineRefresh] = useState(0);

    const user = auth.currentUser;

    // --- Dynamic Styles ---
    const dynamicStyles: DynamicStyles = useMemo(() => ({
        bg: isNightMode ? '#000000' : '#f9fafb',
        text: isNightMode ? '#EF4444' : '#111827',
        textSub: isNightMode ? '#7F1D1D' : '#6b7280',
        aiBg: isNightMode ? '#1A0000' : '#f5f3ff',
        aiBorder: isNightMode ? '#550000' : '#ddd6fe',
        aiTextNight: isNightMode ? '#FCA5A5' : '#5b21b6',
    }), [isNightMode]);

    // --- Pull to Refresh ---
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            refreshHomeData(),
            refreshMeds(),
        ]);
        setRefreshing(false);
    }, [refreshHomeData, refreshMeds]);

    // --- Focus Effect ---
    useFocusEffect(
        useCallback(() => {
            if (profile.id) {
                refreshHomeData();
                refreshMeds();
            }
        }, [profile.id, refreshHomeData, refreshMeds])
    );

    // --- Handlers ---
    const handleSaveTracking = useCallback(async (data: any) => {
        console.log('🔍 handleSaveTracking called');
        console.log('🔍 user:', user?.uid);
        console.log('🔍 profile.id:', profile.id);

        if (!user) {
            Alert.alert('שגיאה', 'יש להתחבר למערכת');
            return;
        }

        if (!profile.id) {
            Alert.alert('שגיאה', 'לא נמצא פרופיל ילד. אנא צור פרופיל בהגדרות.');
            console.log('❌ No profile.id - cannot save!');
            return;
        }

        try {
            console.log('💾 Saving to Firebase...');
            await saveEventToFirebase(user.uid, profile.id, data);
            console.log('✅ Saved successfully!');
            Alert.alert('מעולה!', 'התיעוד נשמר בהצלחה ✅');

            refreshHomeData();
            setTimelineRefresh(prev => prev + 1); // Trigger timeline refresh
        } catch {
            Alert.alert('שגיאה בשמירה');
        }
    }, [user, profile.id, refreshHomeData]);

    const shareStatus = useCallback(async () => {
        const message = `עדכון מ-CalmParent:\n👶 ${profile.name}\n🍼 אכל/ה לאחרונה: ${lastFeedTime}\n😴 ישן/ה לאחרונה: ${lastSleepTime}`;
        await Share.share({ message });
    }, [profile.name, lastFeedTime, lastSleepTime]);

    // --- Loading State ---
    if (profileLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    // --- Render ---
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: dynamicStyles.bg }]}>
            <StatusBar barStyle={isNightMode ? 'light-content' : 'dark-content'} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <HeaderSection
                    greeting={greeting}
                    profile={profile}
                    isNightMode={isNightMode}
                    onNightModeToggle={() => setIsNightMode(!isNightMode)}
                    dynamicStyles={dynamicStyles}
                />

                <SmartStatusCard
                    babyName={profile.name}
                    birthDate={profile.birthDate}
                    lastFeedTime={lastFeedTime}
                    lastSleepTime={lastSleepTime}
                />

                <GuardianSelector
                    currentGuardian={currentGuardian}
                    availableRoles={availableRoles}
                    isPremium={isPremium}
                    onSelect={setCurrentGuardian}
                    onUpgradePress={() => navigation.navigate('Subscription')}
                    dynamicStyles={dynamicStyles}
                />

                <QuickActions
                    lastFeedTime={lastFeedTime}
                    lastSleepTime={lastSleepTime}
                    onFoodPress={() => setTrackingModalType('food')}
                    onSleepPress={() => setTrackingModalType('sleep')}
                    onDiaperPress={() => setTrackingModalType('diaper')}
                    onWhiteNoisePress={() => setIsWhiteNoiseOpen(true)}
                    onSOSPress={() => setIsCalmModeOpen(true)}
                    dynamicStyles={dynamicStyles}
                />

                <HealthCard dynamicStyles={dynamicStyles} />

                <MedicationsTracker
                    meds={meds}
                    onToggle={toggleMed}
                    syncStatus={syncStatus}
                    dynamicStyles={dynamicStyles}
                />

                <ShareStatusButton onShare={shareStatus} />

                {!isNightMode && <DailyTimeline refreshTrigger={timelineRefresh} />}
            </ScrollView>

            {/* Modals */}
            <CalmModeModal visible={isCalmModeOpen} onClose={() => setIsCalmModeOpen(false)} />
            <WhiteNoiseModal visible={isWhiteNoiseOpen} onClose={() => setIsWhiteNoiseOpen(false)} />
            <TrackingModal
                visible={!!trackingModalType}
                type={trackingModalType}
                onClose={() => setTrackingModalType(null)}
                onSave={handleSaveTracking}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 120,
    },
});
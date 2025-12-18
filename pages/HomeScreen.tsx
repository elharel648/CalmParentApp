import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Hooks
import { useHomeData } from '../hooks/useHomeData';
import { useMedications } from '../hooks/useMedications';
import { useGuardian } from '../hooks/useGuardian';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { useActiveChild } from '../context/ActiveChildContext';

// Components
import HeaderSection from '../components/Home/HeaderSection';
import QuickActions from '../components/Home/QuickActions';
import MedicationsTracker from '../components/Home/MedicationsTracker';
import ShareStatusButton from '../components/Home/ShareStatusButton';
import HealthCard from '../components/Home/HealthCard';
import FamilyStatusIndicator from '../components/Home/FamilyStatusIndicator';
import ChildPicker from '../components/Home/ChildPicker';
import AddBabyPlaceholder from '../components/Home/AddBabyPlaceholder';

import DailyTimeline from '../components/DailyTimeline';
import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';
import WhiteNoiseModal from '../components/WhiteNoiseModal';
import SupplementsModal from '../components/Home/SupplementsModal';
import AddCustomActionModal, { CustomAction } from '../components/Home/AddCustomActionModal';
import { JoinFamilyModal } from '../components/Family/JoinFamilyModal';

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
    // --- Theme ---
    const { theme, isDarkMode } = useTheme();

    // --- Active Child from Context ---
    const { activeChild, allChildren } = useActiveChild();

    // Derive profile from active child
    const profile = useMemo(() => {
        if (!activeChild) {
            return { id: '', name: 'הבייבי שלי', birthDate: new Date(), ageMonths: 0, photoUrl: undefined, parentId: '' };
        }
        return {
            id: activeChild.childId,
            name: activeChild.childName,
            birthDate: new Date(), // Will be fetched separately if needed
            ageMonths: 0,
            photoUrl: activeChild.photoUrl,
            parentId: auth.currentUser?.uid || '',
        };
    }, [activeChild]);

    // Calculate greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'בוקר טוב';
        if (hour >= 12 && hour < 18) return 'צהריים טובים';
        return 'ערב טוב';
    }, []);

    // --- Custom Hooks (using active child ID) ---
    const {
        lastFeedTime,
        lastSleepTime,
        dailyStats,
        refresh: refreshHomeData,
    } = useHomeData(profile.id, profile.name, profile.ageMonths, profile.parentId);
    const { meds, toggleMed, syncStatus, refresh: refreshMeds } = useMedications(profile.id);
    const { currentGuardian, setCurrentGuardian, availableRoles, isPremium } = useGuardian();
    const { scheduleFeedingReminder } = useNotifications();

    // --- Local State ---
    const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
    const [isWhiteNoiseOpen, setIsWhiteNoiseOpen] = useState(false);
    const [isSupplementsOpen, setIsSupplementsOpen] = useState(false);
    const [isHealthOpen, setIsHealthOpen] = useState(false);
    const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
    const [customActions, setCustomActions] = useState<CustomAction[]>([]);
    const [trackingModalType, setTrackingModalType] = useState<TrackingType>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [timelineRefresh, setTimelineRefresh] = useState(0);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

    const user = auth.currentUser;

    // Refresh data when active child changes
    useEffect(() => {
        if (activeChild?.childId) {
            refreshHomeData();
            refreshMeds();
            setTimelineRefresh(prev => prev + 1);
        }
    }, [activeChild?.childId]);

    // --- Dynamic Styles (now from global theme) ---
    const dynamicStyles: DynamicStyles = useMemo(() => ({
        bg: theme.background,
        text: theme.textPrimary,
        textSub: theme.textSecondary,
        aiBg: isDarkMode ? '#1A0000' : '#f5f3ff',
        aiBorder: isDarkMode ? '#550000' : '#ddd6fe',
        aiTextNight: isDarkMode ? '#FCA5A5' : '#5b21b6',
    }), [theme, isDarkMode]);



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

            // Schedule feeding reminder if this was a food event
            if (data.type === 'food') {
                scheduleFeedingReminder(new Date());
            }

            refreshHomeData();
            setTimelineRefresh(prev => prev + 1);
        } catch {
            Alert.alert('שגיאה בשמירה');
        }
    }, [user, profile.id, refreshHomeData, scheduleFeedingReminder]);

    const shareMessage = useMemo(() =>
        `עדכון מ-CalmParent:\n👶 ${profile.name}\n🍼 אכל/ה לאחרונה: ${lastFeedTime}\n😴 ישן/ה לאחרונה: ${lastSleepTime}`,
        [profile.name, lastFeedTime, lastSleepTime]
    );

    const shareStatus = useCallback(async () => {
        await Share.share({ message: shareMessage });
    }, [shareMessage]);

    // --- Loading State ---
    const { isLoading: contextLoading } = useActiveChild();
    if (contextLoading && !profile.id) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    // --- Render ---
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: dynamicStyles.bg }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* When NO baby profile - show only Add Baby Placeholder */}
                {!profile.id && (
                    <AddBabyPlaceholder
                        onCreateBaby={() => navigation.navigate('CreateBaby')}
                        onJoinWithCode={() => setIsJoinModalOpen(true)}
                    />
                )}

                {/* When HAVE baby profile - show full home screen */}
                {profile.id && (
                    <>
                        <HeaderSection
                            greeting={greeting}
                            profile={profile}
                            onProfileUpdate={onRefresh}
                            dynamicStyles={dynamicStyles}
                            dailyStats={dailyStats}
                            lastFeedTime={lastFeedTime}
                            lastSleepTime={lastSleepTime}
                            meds={meds}
                            navigation={navigation}
                            onAddChild={() => navigation.navigate('CreateBaby')}
                            onJoinWithCode={() => setIsJoinModalOpen(true)}
                        />

                        {/* Family Status - who's online */}
                        <FamilyStatusIndicator onPress={() => navigation.navigate('הגדרות')} />

                        <QuickActions
                            lastFeedTime={lastFeedTime}
                            lastSleepTime={lastSleepTime}
                            onFoodPress={() => setTrackingModalType('food')}
                            onSleepPress={() => setTrackingModalType('sleep')}
                            onDiaperPress={() => setTrackingModalType('diaper')}
                            onWhiteNoisePress={() => setIsWhiteNoiseOpen(true)}
                            onSOSPress={() => setIsCalmModeOpen(true)}
                            onSupplementsPress={() => setIsSupplementsOpen(true)}
                            onHealthPress={() => setIsHealthOpen(true)}
                            onCustomPress={() => setIsAddCustomOpen(true)}
                            meds={meds}
                            dynamicStyles={dynamicStyles}
                        />

                        <HealthCard dynamicStyles={dynamicStyles} visible={isHealthOpen} onClose={() => setIsHealthOpen(false)} />

                        <DailyTimeline refreshTrigger={timelineRefresh} childId={profile.id} />

                        <ShareStatusButton onShare={shareStatus} message={shareMessage} />
                    </>
                )}
            </ScrollView>

            {/* Modals */}
            <CalmModeModal visible={isCalmModeOpen} onClose={() => setIsCalmModeOpen(false)} />
            <WhiteNoiseModal visible={isWhiteNoiseOpen} onClose={() => setIsWhiteNoiseOpen(false)} />
            <SupplementsModal
                visible={isSupplementsOpen}
                onClose={() => setIsSupplementsOpen(false)}
                meds={meds}
                onToggle={toggleMed}
            />
            <TrackingModal
                visible={!!trackingModalType}
                type={trackingModalType}
                onClose={() => setTrackingModalType(null)}
                onSave={handleSaveTracking}
            />
            <JoinFamilyModal
                visible={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                onSuccess={() => {
                    setIsJoinModalOpen(false);
                    onRefresh();
                }}
            />
            <AddCustomActionModal
                visible={isAddCustomOpen}
                onClose={() => setIsAddCustomOpen(false)}
                onAdd={(action) => {
                    setCustomActions(prev => [...prev, action]);
                    Alert.alert('נוסף! ✅', `הפעולה "${action.name}" נוספה בהצלחה`);
                }}
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
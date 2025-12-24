import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, ActivityIndicator, StatusBar, RefreshControl, Animated } from 'react-native';
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
import ChildPicker from '../components/Home/ChildPicker';
import AddBabyPlaceholder from '../components/Home/AddBabyPlaceholder';

import DailyTimeline from '../components/DailyTimeline';
import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';
import WhiteNoiseModal from '../components/WhiteNoiseModal';
import SupplementsModal from '../components/Home/SupplementsModal';
import GrowthModal from '../components/Home/GrowthModal';
import MilestonesModal from '../components/Home/MilestonesModal';
import AddCustomActionModal, { CustomAction } from '../components/Home/AddCustomActionModal';
import { JoinFamilyModal } from '../components/Family/JoinFamilyModal';
import MagicMomentsModal from '../components/Home/MagicMomentsModal';
import { EditBasicInfoModal } from '../components/Profile';

// Services
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
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
    const [isGrowthOpen, setIsGrowthOpen] = useState(false);
    const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
    const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
    const [isMagicMomentsOpen, setIsMagicMomentsOpen] = useState(false);
    const [customActions, setCustomActions] = useState<CustomAction[]>([]);
    const [trackingModalType, setTrackingModalType] = useState<TrackingType>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [timelineRefresh, setTimelineRefresh] = useState(0);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<any>(null);
    const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);

    // Staggered entrance animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const quickActionsAnim = useRef(new Animated.Value(0)).current;
    const timelineAnim = useRef(new Animated.Value(0)).current;

    // Trigger entrance animations on mount and when screen comes into focus
    useEffect(() => {
        // Reset animations
        headerAnim.setValue(0);
        quickActionsAnim.setValue(0);
        timelineAnim.setValue(0);

        // Run staggered animation sequence
        Animated.stagger(150, [
            Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(quickActionsAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(timelineAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
    }, [profile.id]);

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
        if (!user) {
            Alert.alert('שגיאה', 'יש להתחבר למערכת');
            return;
        }

        if (!profile.id) {
            Alert.alert('שגיאה', 'לא נמצא פרופיל ילד. אנא צור פרופיל בהגדרות.');
            return;
        }

        try {
            await saveEventToFirebase(user.uid, profile.id, data);
            // Alert removed - TrackingModal now shows checkmark animation

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
                        {/* Animated Header */}
                        <Animated.View style={{
                            opacity: headerAnim,
                            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
                        }}>
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
                                onEditChild={(child) => {
                                    setEditingChild(child);
                                    setIsEditChildModalOpen(true);
                                }}
                            />
                        </Animated.View>

                        {/* Animated Quick Actions */}
                        <Animated.View style={{
                            opacity: quickActionsAnim,
                            transform: [{ translateY: quickActionsAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
                        }}>
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
                                onGrowthPress={() => setIsGrowthOpen(true)}
                                onMilestonesPress={() => setIsMilestonesOpen(true)}
                                onMagicMomentsPress={() => setIsMagicMomentsOpen(true)}
                                onCustomPress={() => setIsAddCustomOpen(true)}
                                onFoodTimerStop={async (seconds, timerType) => {
                                    const mins = Math.floor(seconds / 60);
                                    const secs = seconds % 60;
                                    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                    const subTypeMap: Record<string, string> = {
                                        'breast_left': 'breast',
                                        'breast_right': 'breast',
                                        'pumping': 'pumping'
                                    };
                                    const subType = subTypeMap[timerType] || 'breast';
                                    const side = timerType === 'breast_left' ? 'שמאל' : timerType === 'breast_right' ? 'ימין' : '';
                                    await handleSaveTracking({
                                        type: 'food',
                                        subType,
                                        note: side ? `${side}: ${timeStr}` : `זמן: ${timeStr}`,
                                        timestamp: new Date()
                                    });
                                }}
                                onSleepTimerStop={async (seconds) => {
                                    const mins = Math.floor(seconds / 60);
                                    const secs = seconds % 60;
                                    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                    await handleSaveTracking({
                                        type: 'sleep',
                                        note: `משך שינה: ${timeStr}`,
                                        duration: seconds,
                                        timestamp: new Date()
                                    });
                                }}
                                meds={meds}
                                dynamicStyles={dynamicStyles}
                            />
                        </Animated.View>

                        <HealthCard dynamicStyles={dynamicStyles} visible={isHealthOpen} onClose={() => setIsHealthOpen(false)} />

                        {/* Animated Timeline */}
                        <Animated.View style={{
                            opacity: timelineAnim,
                            transform: [{ translateY: timelineAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
                        }}>
                            <DailyTimeline refreshTrigger={timelineRefresh} childId={profile.id} />
                        </Animated.View>

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
                onRefresh={() => setTimelineRefresh(prev => prev + 1)}
            />
            <GrowthModal
                visible={isGrowthOpen}
                onClose={() => setIsGrowthOpen(false)}
            />
            <MilestonesModal
                visible={isMilestonesOpen}
                onClose={() => setIsMilestonesOpen(false)}
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
            {editingChild && (
                <EditBasicInfoModal
                    visible={isEditChildModalOpen}
                    initialData={{
                        name: editingChild.childName || '',
                        gender: editingChild.gender || 'boy',
                        birthDate: editingChild.birthDate ? new Date(editingChild.birthDate) : new Date(),
                        photoUrl: editingChild.photoUrl,
                    }}
                    onSave={async (data) => {
                        try {
                            await updateDoc(doc(db, 'children', editingChild.childId), {
                                name: data.name,
                                gender: data.gender,
                                birthDate: data.birthDate,
                                photoUrl: data.photoUrl || null,
                            });
                            onRefresh();
                        } catch (e) {
                            console.error('Failed to update child:', e);
                        }
                    }}
                    onClose={() => {
                        setIsEditChildModalOpen(false);
                        setEditingChild(null);
                    }}
                />
            )}
            <MagicMomentsModal
                visible={isMagicMomentsOpen}
                onClose={() => setIsMagicMomentsOpen(false)}
            />
            <AddCustomActionModal
                visible={isAddCustomOpen}
                onClose={() => setIsAddCustomOpen(false)}
                onAdd={async (action) => {
                    // Save to local state
                    setCustomActions(prev => [...prev, action]);

                    // Save to Firebase timeline
                    if (user && profile.id) {
                        try {
                            await saveEventToFirebase(user.uid, profile.id, {
                                type: 'custom',
                                note: action.name,
                                subType: action.icon,
                            });
                            setTimelineRefresh(prev => prev + 1);
                            Alert.alert('נוסף!', `"${action.name}" נשמר בהצלחה`);
                        } catch {
                            Alert.alert('שגיאה בשמירה');
                        }
                    }
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
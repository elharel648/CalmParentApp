import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, ActivityIndicator, StatusBar, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    interpolate,
    Extrapolation,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useAnimatedScrollHandler } from 'react-native-reanimated';

// Hooks
import { useHomeData } from '../hooks/useHomeData';
import { useMedications } from '../hooks/useMedications';
import { useGuardian } from '../hooks/useGuardian';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { useActiveChild } from '../context/ActiveChildContext';

// Components
import HeaderSection from '../components/Home/HeaderSection';
import QuickActions from '../components/Home/QuickActions';
import ShareStatusButton from '../components/Home/ShareStatusButton';
import HealthCard from '../components/Home/HealthCard';
import ChildPicker from '../components/Home/ChildPicker';
import AddBabyPlaceholder from '../components/Home/AddBabyPlaceholder';

import DailyTimeline from '../components/DailyTimeline';
import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';
import ChecklistModal from '../components/ChecklistModal';
import ToolsModal from '../components/Home/ToolsModal';
import NightLightModal from '../components/NightLightModal';
import TeethTrackerModal from '../components/Tools/TeethTrackerModal';
import SleepCalculatorModal from '../components/Tools/SleepCalculatorModal';
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

// Module-level flag to prevent double animation on tab switch
let hasHomeAnimationsRun = false;

/**
 * HomeScreen - Main dashboard with modular architecture
 * Reduced from 535 lines to ~180 lines
 */
export default function HomeScreen({ navigation }: any) {
    // --- Theme & Language ---
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

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
        if (hour >= 5 && hour < 12) return t('home.greeting.morning');
        if (hour >= 12 && hour < 18) return t('home.greeting.afternoon');
        if (hour >= 18 && hour < 22) return t('home.greeting.evening');
        return t('home.greeting.night');
    }, []);

    // --- Custom Hooks (using active child ID) ---
    const {
        lastFeedTime,
        lastSleepTime,
        dailyStats,
        growthStats,
        refresh: refreshHomeData,
    } = useHomeData(profile.id, profile.name, profile.ageMonths, profile.parentId);
    const { meds, toggleMed, syncStatus, refresh: refreshMeds } = useMedications(profile.id);
    const { currentGuardian, setCurrentGuardian, availableRoles, isPremium } = useGuardian();
    const { scheduleFeedingReminder } = useNotifications();

    // --- Local State ---
    const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isNightLightOpen, setIsNightLightOpen] = useState(false);
    const [isTeethOpen, setIsTeethOpen] = useState(false);
    const [isNextNapOpen, setIsNextNapOpen] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
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

    // Mark animations as run after first render
    useEffect(() => {
        if (!hasHomeAnimationsRun) {
            // Delay to allow animations to complete
            const timer = setTimeout(() => {
                hasHomeAnimationsRun = true;
            }, 600);
            return () => clearTimeout(timer);
        }
    }, []);

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

        await saveEventToFirebase(user.uid, profile.id, data);
        // Alert removed - TrackingModal now shows checkmark animation

        // Schedule feeding reminder if this was a food event
        if (data.type === 'food') {
            scheduleFeedingReminder(new Date());
        }

        refreshHomeData();
        setTimelineRefresh(prev => prev + 1);
    }, [user, profile.id, refreshHomeData, scheduleFeedingReminder]);

    const shareMessage = useMemo(() =>
        `עדכון מ-CalmParent:\n👶 ${profile.name}\n🍼 אכל/ה לאחרונה: ${lastFeedTime}\n😴 ישן/ה לאחרונה: ${lastSleepTime}`,
        [profile.name, lastFeedTime, lastSleepTime]
    );

    const shareStatus = useCallback(async () => {
        await Share.share({ message: shareMessage });
    }, [shareMessage]);

    // --- Animations (MUST be before any early returns) ---
    const scrollY = useSharedValue(0);
    const floatingOffset = useSharedValue(0);

    // Floating animation for background elements
    useEffect(() => {
        floatingOffset.value = withRepeat(
            withTiming(20, {
                duration: 3000,
                easing: Easing.inOut(Easing.sin),
            }),
            -1,
            true
        );
    }, [floatingOffset]);

    // Scroll handler for parallax
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    // Parallax background style
    const parallaxBackgroundStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [0, 500],
            [0, -100],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ translateY }],
        };
    });

    // Floating glow style
    const floatingGlowStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            floatingOffset.value,
            [0, 20],
            [0, 10],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ translateY }],
            opacity: interpolate(
                floatingOffset.value,
                [0, 20],
                [0.6, 1],
                Extrapolation.CLAMP
            ),
        };
    });

    // --- Loading State (after all hooks) ---
    const { isLoading: contextLoading } = useActiveChild();
    if (contextLoading && !profile.id) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    // --- Render ---
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

    return (
        <View style={styles.container}>
            {/* Enhanced Background - Parallax */}
            <Animated.View style={[StyleSheet.absoluteFill, parallaxBackgroundStyle]}>
                <LinearGradient
                    colors={isDarkMode
                        ? ['#0A0A0F', '#0F0F18', '#0C0C12', '#0A0A0F']
                        : ['#FAFAFA', '#F7F7F7', '#F3F3F3', '#FAFAFA']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    locations={[0, 0.3, 0.7, 1]}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            {/* Dot Pattern Texture - Parallax */}
            <Animated.View style={[StyleSheet.absoluteFill, parallaxBackgroundStyle]}>
                <Svg
                    style={StyleSheet.absoluteFill}
                    width={SCREEN_WIDTH}
                    height={SCREEN_HEIGHT}
                    preserveAspectRatio="none"
                >
                    <Defs>
                        <Pattern
                            id="dotPattern"
                            patternUnits="userSpaceOnUse"
                            width={28}
                            height={28}
                        >
                            <Circle
                                cx={14}
                                cy={14}
                                r={1.5}
                                fill={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)'}
                            />
                        </Pattern>
                    </Defs>
                    <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#dotPattern)" />
                </Svg>
            </Animated.View>

            {/* Radial Glow at Top - Floating */}
            <Animated.View style={[StyleSheet.absoluteFill, floatingGlowStyle]}>
                <LinearGradient
                    colors={isDarkMode
                        ? ['rgba(79, 70, 229, 0.15)', 'transparent']
                        : ['rgba(79, 70, 229, 0.08)', 'transparent']
                    }
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 0.6 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
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
                            {/* Staggered Entry Header - Enhanced */}
                            <Animated.View
                                entering={!hasHomeAnimationsRun ? FadeInDown.duration(500).delay(0).springify().damping(15) : undefined}
                                collapsable={false}
                            >
                                <HeaderSection
                                    greeting={greeting}
                                    profile={profile}
                                    onProfileUpdate={onRefresh}
                                    dynamicStyles={dynamicStyles}
                                    dailyStats={dailyStats}
                                    growthStats={growthStats}
                                    lastFeedTime={lastFeedTime}
                                    lastSleepTime={lastSleepTime}
                                    meds={meds}
                                    navigation={navigation}
                                    onAddChild={() => navigation.navigate('CreateBaby')}
                                    onJoinWithCode={() => { console.log('🔗 HomeScreen: Opening JoinModal'); setIsJoinModalOpen(true); }}
                                    onEditChild={(child) => {
                                        setEditingChild(child);
                                        setIsEditChildModalOpen(true);
                                    }}
                                />
                            </Animated.View>

                            {/* Staggered Entry Quick Actions - Enhanced */}
                            <Animated.View
                                entering={!hasHomeAnimationsRun ? FadeInDown.duration(500).delay(100).springify().damping(15) : undefined}
                                collapsable={false}
                            >
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
                                    onToolsPress={() => setIsToolsOpen(true)}
                                    // onChecklistPress={() => setIsChecklistOpen(true)} // Moved to Tools
                                    onTeethPress={() => setIsTeethOpen(true)}
                                    onNightLightPress={() => setIsNightLightOpen(true)}
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

                            {/* Staggered Entry Timeline - Enhanced */}
                            <Animated.View
                                entering={!hasHomeAnimationsRun ? FadeInDown.duration(500).delay(200).springify().damping(15) : undefined}
                                collapsable={false}
                            >
                                <DailyTimeline refreshTrigger={timelineRefresh} childId={profile.id} />
                            </Animated.View>

                            {/* Share Button - Enhanced Animation */}
                            <Animated.View
                                entering={!hasHomeAnimationsRun ? FadeInDown.duration(500).delay(300).springify().damping(15) : undefined}
                            >
                                <ShareStatusButton onShare={shareStatus} message={shareMessage} />
                            </Animated.View>
                        </>
                    )}
                </Animated.ScrollView>

                {/* Modals */}
                <CalmModeModal visible={isCalmModeOpen} onClose={() => setIsCalmModeOpen(false)} />
                <ToolsModal
                    visible={isToolsOpen}
                    onClose={() => setIsToolsOpen(false)}
                    onNextNapPress={() => {
                        setIsToolsOpen(false);
                        setTimeout(() => setIsNextNapOpen(true), 300);
                    }}
                    onChecklistPress={() => setIsChecklistOpen(true)}
                />
                <NightLightModal visible={isNightLightOpen} onClose={() => setIsNightLightOpen(false)} />
                <TeethTrackerModal visible={isTeethOpen} onClose={() => setIsTeethOpen(false)} />
                <SleepCalculatorModal visible={isNextNapOpen} onClose={() => setIsNextNapOpen(false)} />
                <ChecklistModal visible={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} />
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
                    childId={activeChild?.childId}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    patternOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.4,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
});
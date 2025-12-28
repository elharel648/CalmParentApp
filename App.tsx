import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, useNavigationState } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User, Settings, Lock, Baby, UserCheck } from 'lucide-react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import * as LocalAuthentication from 'expo-local-authentication';
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LiquidGlassTabBar from './components/LiquidGlassTabBar';
import { auth, db } from './services/firebaseConfig';

// ייבוא המסכים הקיימים
import HomeScreen from './pages/HomeScreen';
import ReportsScreen from './pages/ReportsScreen';
import ProfileScreen from './pages/ProfileScreen';
import SettingsScreen from './pages/SettingsScreen';
import FullSettingsScreen from './pages/FullSettingsScreen';
import LoginScreen from './pages/LoginScreen';
import BabyProfileScreen from './pages/BabyProfileScreen';
import NotificationsScreen from './pages/NotificationsScreen';

// מסכי הבייביסיטר
import BabySitterScreen from './pages/BabySitterScreen';
import SitterProfileScreen from './pages/SitterProfileScreen';
import SitterRegistrationScreen from './pages/SitterRegistrationScreen';
import SitterDashboardScreen from './pages/SitterDashboardScreen';
import ChatScreen from './pages/ChatScreen';

import { checkIfBabyExists } from './services/babyService';
import { SleepTimerProvider } from './context/SleepTimerContext';
import { FoodTimerProvider } from './context/FoodTimerContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ActiveChildProvider, useActiveChild } from './context/ActiveChildContext';
import { QuickActionsProvider } from './context/QuickActionsContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://d6f2c1e24015d5a729ac8fde1891d23d@o4510568313913344.ingest.us.sentry.io/4510568315486208',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // 🔥 PERFORMANCE MONITORING - מעקב אחרי ביצועים
  tracesSampleRate: 0.2, // 20% מהטרנזקציות יימדדו
  enableAutoPerformanceTracing: true, // מעקב אוטומטי אחרי navigation ו-API calls

  // 🚫 DISABLED Session Replay - causes EXC_BAD_ACCESS crash on iOS
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // integrations: [Sentry.mobileReplayIntegration()], // DISABLED - crashes on screenshot
  integrations: [Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();
// ✅ יצירת Stack לבייביסיטר
const BabysitterStack = createNativeStackNavigator();

// --- רכיבים עזר ---

const LoaderScreen = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="large" color="#4f46e5" />
    <Text style={styles.loaderText}>טוען נתונים...</Text>
  </View>
);

const BiometricLockScreen = ({ onUnlock }: { onUnlock: () => void }) => (
  <View style={styles.loaderContainer}>
    <View style={styles.lockIconContainer}>
      <Lock size={50} color="#4f46e5" />
    </View>
    <Text style={styles.lockTitle}>האפליקציה נעולה</Text>
    <Text style={styles.lockSubtitle}>נדרש אימות ביומטרי לכניסה</Text>

    <TouchableOpacity style={styles.unlockButton} onPress={onUnlock}>
      <Text style={styles.unlockButtonText}>לחץ לאימות</Text>
    </TouchableOpacity>
  </View>
);

const CustomTabIcon = ({ focused, color, icon: Icon, label }: any) => {
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      top: Platform.OS === 'ios' ? 14 : 0,
      width: 60
    }}>
      <Icon color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
      <Text numberOfLines={1} style={{
        color: color, fontSize: 10, marginTop: 6,
        fontWeight: focused ? '600' : '400', textAlign: 'center', width: '100%'
      }}>
        {label}
      </Text>
    </View>
  );
};

// --- Main App Navigator (uses theme and role-based permissions) ---
function MainAppNavigator() {
  const { theme, isDarkMode } = useTheme();
  const { canAccessProfile, canAccessReports, canAccessBabysitter } = useActiveChild();

  return (
    <Tab.Navigator
      initialRouteName="בית"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarBackground: () => <LiquidGlassTabBar isDarkMode={isDarkMode} activeTabIndex={0} tabCount={4} />,
        tabBarStyle: {
          position: 'absolute',
          bottom: 28,
          left: 16,
          right: 16,
          elevation: 0,
          backgroundColor: 'transparent',
          borderRadius: 32,
          height: 72,
          borderTopWidth: 0,
          overflow: 'visible',
        }
      }}
    >
      {/* Account - always visible (renamed from Settings) */}
      <Tab.Screen name="חשבון" component={AccountStackScreen} options={{
        tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={User} label="חשבון" />
      }} />



      {/* Reports - only for parents */}
      {canAccessReports && (
        <Tab.Screen name="סטטיסטיקות" component={ReportsScreen} options={{
          tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={BarChart2} label="סטטיסטיקות" />
        }} />
      )}

      {/* Babysitter - only for parents */}
      {canAccessBabysitter && (
        <Tab.Screen name="בייביסיטר" component={BabysitterStackScreen} options={{
          tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={UserCheck} label="בייביסיטר" />
        }} />
      )}

      {/* Home - always visible */}
      <Tab.Screen name="בית" component={HomeStackScreen} options={{
        tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={Home} label="בית" />
      }} />

    </Tab.Navigator>
  );
}

// --- הגדרת ה-Stacks ---

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="CreateBaby" component={CreateBabyScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

// Account Stack Navigator
function AccountStackScreen() {
  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name="Account" component={SettingsScreen} />
      <AccountStack.Screen name="FullSettings" component={FullSettingsScreen} />
    </AccountStack.Navigator>
  );
}

// Wrapper screen for creating baby from home
function CreateBabyScreen({ navigation }: any) {
  const { refreshChildren } = useActiveChild();

  const handleProfileSaved = async () => {
    await refreshChildren(); // Refresh to show all tabs
    navigation.navigate('Home');
  };

  return (
    <BabyProfileScreen
      onProfileSaved={handleProfileSaved}
      onClose={() => navigation.goBack()}
    />
  );
}

// ✅ Stack לבייביסיטר - מחבר את הרשימה, הפרופיל והצ'אט
function BabysitterStackScreen() {
  return (
    <BabysitterStack.Navigator screenOptions={{ headerShown: false }}>
      <BabysitterStack.Screen name="SitterList" component={BabySitterScreen} />
      <BabysitterStack.Screen name="SitterProfile" component={SitterProfileScreen} />
      <BabysitterStack.Screen name="SitterRegistration" component={SitterRegistrationScreen} />
      <BabysitterStack.Screen name="SitterDashboard" component={SitterDashboardScreen} />
      <BabysitterStack.Screen name="ChatScreen" component={ChatScreen} />
    </BabysitterStack.Navigator>
  );
}

// --- האפליקציה הראשית ---

export default Sentry.wrap(function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hasBabyProfile, setHasBabyProfile] = useState<boolean | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await checkBiometricSettingsAndProfile(currentUser.uid);
      } else {
        setUser(null);
        setHasBabyProfile(false);
        setIsLocked(false);
        setIsAppLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const checkBiometricSettingsAndProfile = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let needsUnlock = false;
      if (userSnap.exists()) {
        const settings = userSnap.data().settings;
        if (settings && settings.biometricsEnabled) {
          needsUnlock = true;
          setIsLocked(true);
        }
      }

      const babyExists = await checkIfBabyExists();
      setHasBabyProfile(babyExists);
      setIsAppLoading(false);
      if (needsUnlock) setTimeout(() => authenticateUser(), 100);

    } catch (error) {
      if (__DEV__) console.log('Error during startup checks:', error);
      setIsAppLoading(false);
    }
  };

  const authenticateUser = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) { setIsLocked(false); return; }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'ברוך שובך ל-CalmParent',
        fallbackLabel: 'השתמש בסיסמה',
        disableDeviceFallback: false,
      });

      if (result.success) setIsLocked(false);
    } catch (e) { if (__DEV__) console.log('Authentication error:', e); }
  };

  if (isAppLoading) return <LoaderScreen />;
  if (isLocked) return <BiometricLockScreen onUnlock={authenticateUser} />;

  if (!user) {
    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <LoginScreen onLoginSuccess={() => setIsAppLoading(true)} />
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  if (user && !hasBabyProfile) {
    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <BabyProfileScreen
            onProfileSaved={() => setHasBabyProfile(true)}
            onSkip={() => setHasBabyProfile(true)}
          />
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SleepTimerProvider>
          <FoodTimerProvider>
            <QuickActionsProvider>
              <LanguageProvider>
                <ThemeProvider>
                  <ActiveChildProvider>
                    <SafeAreaProvider>
                      <NavigationContainer>
                        <MainAppNavigator />
                      </NavigationContainer>
                    </SafeAreaProvider>
                  </ActiveChildProvider>
                </ThemeProvider>
              </LanguageProvider>
            </QuickActionsProvider>
          </FoodTimerProvider>
        </SleepTimerProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loaderText: { marginTop: 10, fontSize: 16, color: '#4f46e5', fontWeight: '600' },
  lockIconContainer: { marginBottom: 20, padding: 20, backgroundColor: '#EEF2FF', borderRadius: 50 },
  lockTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  lockSubtitle: { fontSize: 16, color: '#6b7280', marginBottom: 30 },
  unlockButton: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  unlockButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
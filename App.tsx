import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User, Settings, Lock, Baby } from 'lucide-react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import * as LocalAuthentication from 'expo-local-authentication';
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { auth, db } from './services/firebaseConfig';

// ייבוא המסכים הקיימים
import HomeScreen from './pages/HomeScreen';
import ReportsScreen from './pages/ReportsScreen';
import ProfileScreen from './pages/ProfileScreen';
import SettingsScreen from './pages/SettingsScreen';
import FullSettingsScreen from './pages/FullSettingsScreen';
import LoginScreen from './pages/LoginScreen';
import BabyProfileScreen from './pages/BabyProfileScreen';

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

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

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
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'hidden' }]}>
            {/* Dark translucent glass background - Apple style */}
            <BlurView
              intensity={isDarkMode ? 80 : 60}
              tint={isDarkMode ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
              style={StyleSheet.absoluteFill}
            />
            {/* Semi-transparent overlay for depth */}
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: isDarkMode
                ? 'rgba(0, 0, 0, 0.35)'
                : 'rgba(255, 255, 255, 0.45)',
            }} />
            {/* Top edge glow - glass reflection */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 16,
              right: 16,
              height: 0.5,
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.95)',
            }} />
            {/* Inner glow for premium feel */}
            <View style={{
              position: 'absolute',
              top: 1,
              left: 0,
              right: 0,
              height: 24,
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(255, 255, 255, 0.25)',
            }} />
          </View>
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 28,
          left: 16,
          right: 16,
          elevation: 0,
          backgroundColor: 'transparent',
          borderRadius: 32,
          height: 72,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: isDarkMode ? 0.5 : 0.25,
          shadowRadius: 24,
          borderTopWidth: 0,
          borderWidth: isDarkMode ? 0.5 : 1,
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.5)',
          overflow: 'hidden',
        }
      }}
    >
      {/* Account - always visible (renamed from Settings) */}
      <Tab.Screen name="חשבון" component={AccountStackScreen} options={{
        tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={User} label="חשבון" />
      }} />



      {/* Reports - only for parents */}
      {canAccessReports && (
        <Tab.Screen name="דוחות" component={ReportsScreen} options={{
          tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={BarChart2} label="דוחות" />
        }} />
      )}

      {/* Babysitter - only for parents */}
      {canAccessBabysitter && (
        <Tab.Screen name="בייביסיטר" component={BabysitterStackScreen} options={{
          tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={Baby} label="בייביסיטר" />
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
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={() => setIsAppLoading(true)} />
      </SafeAreaProvider>
    );
  }

  if (user && !hasBabyProfile) {
    return (
      <SafeAreaProvider>
        <BabyProfileScreen
          onProfileSaved={() => setHasBabyProfile(true)}
          onSkip={() => setHasBabyProfile(true)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SleepTimerProvider>
        <FoodTimerProvider>
          <QuickActionsProvider>
            <ThemeProvider>
              <ActiveChildProvider>
                <SafeAreaProvider>
                  <NavigationContainer>
                    <MainAppNavigator />
                  </NavigationContainer>
                </SafeAreaProvider>
              </ActiveChildProvider>
            </ThemeProvider>
          </QuickActionsProvider>
        </FoodTimerProvider>
      </SleepTimerProvider>
    </ErrorBoundary>
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
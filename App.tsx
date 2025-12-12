import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User, Settings, Lock } from 'lucide-react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import * as LocalAuthentication from 'expo-local-authentication';
import { auth, db } from './services/firebaseConfig';

// ייבוא המסכים
import HomeScreen from './pages/HomeScreen';
import ReportsScreen from './pages/ReportsScreen';
import ProfileScreen from './pages/ProfileScreen';
import SettingsScreen from './pages/SettingsScreen';
import LoginScreen from './pages/LoginScreen';
import BabyProfileScreen from './pages/BabyProfileScreen';

// שירותים
import { checkIfBabyExists } from './services/babyService';

const Tab = createBottomTabNavigator();

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

// --- רכיב אייקון מותאם אישית לבר התחתון (המתוקן) ---
const CustomTabIcon = ({ focused, color, icon: Icon, label }: any) => {
  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      // נותן לזה קצת אוויר מלמעלה, במיוחד באייפון
      top: Platform.OS === 'ios' ? 14 : 0,
      width: 60 // רוחב קבוע מונע מהטקסט להישבר או להימעך
    }}>
      <Icon 
        color={color} 
        size={24} 
        strokeWidth={focused ? 2.5 : 2} 
      />
      
      {/* טקסט מתחת לאייקון - נקי ומסודר */}
      <Text 
        numberOfLines={1} // מכריח שורה אחת בלבד
        style={{ 
          color: color, 
          fontSize: 10, 
          marginTop: 6, 
          fontWeight: focused ? '600' : '400',
          textAlign: 'center',
          width: '100%'
      }}>
        {label}
      </Text>
      
      {/* הורדנו את הנקודה למראה נקי יותר (High Level) */}
    </View>
  );
};

// --- האפליקציה הראשית ---

export default function App() {
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

      if (needsUnlock) {
        setTimeout(() => authenticateUser(), 100);
      }

    } catch (error) {
      console.log('Error during startup checks:', error);
      setIsAppLoading(false);
    }
  };

  const authenticateUser = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setIsLocked(false); 
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'ברוך שובך ל-CalmParent',
        fallbackLabel: 'השתמש בסיסמה',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        setIsLocked(false);
      }
    } catch (e) {
      console.log('Authentication error:', e);
    }
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
        <BabyProfileScreen onProfileSaved={() => setHasBabyProfile(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          // הגדרת הבית כברירת מחדל
          initialRouteName="בית"
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false, // אנחנו משתמשים בלייבל משלנו בתוך האייקון
            tabBarActiveTintColor: '#4f46e5',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: { 
              position: 'absolute',
              bottom: 25,
              left: 20,
              right: 20,
              elevation: 0,
              backgroundColor: '#ffffff',
              borderRadius: 25,
              height: 80, // גובה מרווח
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              borderTopWidth: 0,
            }
          }}
        >
          {/* הסדר בקוד הוא משמאל לימין.
             כדי שבעברית "בית" יהיה בימין - הוא צריך להיות אחרון ברשימה.
             וכדי ש"הגדרות" יהיה בשמאל - הוא צריך להיות ראשון.
          */}

          <Tab.Screen 
            name="הגדרות" 
            component={SettingsScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                <CustomTabIcon focused={focused} color={color} icon={Settings} label="הגדרות" />
              ) 
            }} 
          />

          <Tab.Screen 
            name="פרופיל" 
            component={ProfileScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                <CustomTabIcon focused={focused} color={color} icon={User} label="פרופיל" />
              ) 
            }} 
          />

          <Tab.Screen 
            name="דוחות" 
            component={ReportsScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                <CustomTabIcon focused={focused} color={color} icon={BarChart2} label="דוחות" />
              ) 
            }} 
          />

          <Tab.Screen 
            name="בית" 
            component={HomeScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                <CustomTabIcon focused={focused} color={color} icon={Home} label="בית" />
              ) 
            }} 
          />

        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  // הסרנו את activeDot כי אנחנו לא משתמשים בו יותר, אבל אפשר להשאיר אם תרצה להחזיר
  lockIconContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 50
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8
  },
  lockSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30
  },
  unlockButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  unlockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
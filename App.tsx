import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hasBabyProfile, setHasBabyProfile] = useState<boolean | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // שלב קריטי: בודקים נעילה *לפני* שמסיימים לטעון את האפליקציה
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

  // פונקציה מאוחדת לבדיקת הכל לפני פתיחת האפליקציה
  const checkBiometricSettingsAndProfile = async (uid: string) => {
    try {
      // 1. בדיקת הגדרות ביומטריה
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

      // 2. בדיקת פרופיל תינוק (במקביל)
      const babyExists = await checkIfBabyExists();
      setHasBabyProfile(babyExists);

      // סיימנו את כל הבדיקות - אפשר להוריד את מסך הטעינה
      setIsAppLoading(false);

      // אם צריך נעילה, ננסה לאמת מיד אחרי שהטעינה הסתיימה
      if (needsUnlock) {
        setTimeout(() => authenticateUser(), 100);
      }

    } catch (error) {
      console.log('Error during startup checks:', error);
      setIsAppLoading(false); // שלא נתקע על מסך טעינה במקרה של שגיאה
    }
  };

  const authenticateUser = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setIsLocked(false); // אם אין חומרה, שחרר נעילה
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'ברוך שובך ל-CalmParent',
        fallbackLabel: 'השתמש בסיסמה',
        disableDeviceFallback: false, // מאפשר שימוש בקוד גישה של הטלפון אם הפנים נכשלו
      });
      
      if (result.success) {
        setIsLocked(false);
      }
    } catch (e) {
      console.log('Authentication error:', e);
    }
  };

  // תצוגה מותנית
  if (isAppLoading) return <LoaderScreen />;
  
  // אם האפליקציה נעולה - מציגים מסך נעילה
  if (isLocked) return <BiometricLockScreen onUnlock={authenticateUser} />;

  // אם לא מחובר - מסך לוגין
  if (!user) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={() => setIsAppLoading(true)} />
      </SafeAreaProvider>
    );
  }

  // אם אין פרופיל תינוק
  if (user && !hasBabyProfile) {
    return (
      <SafeAreaProvider>
        <BabyProfileScreen onProfileSaved={() => setHasBabyProfile(true)} />
      </SafeAreaProvider>
    );
  }

  // האפליקציה הראשית
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
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
              height: 70,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              borderTopWidth: 0,
            }
          }}
        >
          <Tab.Screen 
            name="בית" 
            component={HomeScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Home color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
                    {focused && <View style={styles.activeDot} />}
                </View>
              ) 
            }} 
          />
          <Tab.Screen 
            name="דוחות" 
            component={ReportsScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                     <BarChart2 color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
                     {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
                  </View>
              ) 
            }} 
          />
          <Tab.Screen 
            name="פרופיל" 
            component={ProfileScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <User color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
                    {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
                  </View>
              ) 
            }} 
          />
          <Tab.Screen 
            name="הגדרות" 
            component={SettingsScreen} 
            options={{ 
              tabBarIcon: ({ color, focused }) => (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                     <Settings color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
                     {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
                  </View>
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
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4f46e5',
    marginTop: 6
  },
  // עיצוב מסך נעילה
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
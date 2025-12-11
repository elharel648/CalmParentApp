import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native'; // הוספתי כאן את Text
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User, Settings } from 'lucide-react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './services/firebaseConfig';

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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hasBabyProfile, setHasBabyProfile] = useState<boolean | null>(null); // null = עדיין לא נבדק
  const [isAppLoading, setIsAppLoading] = useState(true); // טעינה ראשונית

  useEffect(() => {
    // מנגנון שמירת סשן (Persistence) יפעל אוטומטית כעת
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // ודא שהמשתמש מחובר לפני בדיקת פרופיל
        if (currentUser && hasBabyProfile === null) {
          try {
            const babyExists = await checkIfBabyExists();
            setHasBabyProfile(babyExists);
          } catch (e) {
            console.error(e);
            setHasBabyProfile(false); // במקרה של שגיאה, נניח שאין
          }
        }
      } else {
        setUser(null);
        setHasBabyProfile(false);
      }
      setIsAppLoading(false); // סיימנו את הטעינה הראשונית
    });

    return unsubscribe;
  }, []); // לרוץ רק פעם אחת בטעינה

  // 1. מסך טעינה כללי (בזמן שהוא בודק Auth ו-Baby Profile)
  if (isAppLoading || (user && hasBabyProfile === null)) {
    return <LoaderScreen />;
  }

  // 2. אם לא מחובר -> מסך לוגין
  if (!user) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={() => setIsAppLoading(true)} />
      </SafeAreaProvider> // נפעיל טעינה מחדש אחרי לוגין מוצלח
    );
  }

  // 3. מחובר אבל אין תינוק -> מסך יצירת פרופיל
  if (user && !hasBabyProfile) {
    return (
      <SafeAreaProvider>
        <BabyProfileScreen onProfileSaved={() => setHasBabyProfile(true)} />
      </SafeAreaProvider>
    );
  }

  // 4. מחובר ויש תינוק -> האפליקציה הראשית
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
  }
});
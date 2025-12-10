import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User, Settings } from 'lucide-react-native';

// ייבוא המסכים
import HomeScreen from './pages/HomeScreen';
import ReportsScreen from './pages/ReportsScreen';
import ProfileScreen from './pages/ProfileScreen';
import SettingsScreen from './pages/SettingsScreen';
import LoginScreen from './pages/LoginScreen'; // הוספנו את זה

const Tab = createBottomTabNavigator();

export default function App() {
  // כאן אנחנו מנהלים את המצב: האם המשתמש מחובר?
  // בהמשך זה יתחבר ל-Firebase אמיתי
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
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
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4f46e5',
    marginTop: 6
  }
});
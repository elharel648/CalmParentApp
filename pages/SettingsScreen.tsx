import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  LogOut, 
  Trash2, 
  Moon, 
  Bell, 
  User, 
  ChevronLeft, 
  Shield, 
  Mail
} from 'lucide-react-native';
import { auth } from '../services/firebaseConfig';
import { deleteUser, signOut } from 'firebase/auth';

export default function SettingsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const userEmail = auth.currentUser?.email || 'אורח';

  // פונקציה להתנתקות
  const handleLogout = async () => {
    Alert.alert(
      'התנתקות',
      'האם את/ה בטוח/ה שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        { 
          text: 'התנתק', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // ה-App.tsx יזהה את השינוי ויעביר אותך ללוגין
            } catch (error) {
              Alert.alert('שגיאה', 'לא הצלחנו להתנתק');
            }
          }
        }
      ]
    );
  };

  // פונקציה למחיקת חשבון (איזור מסוכן!)
  const handleDeleteAccount = async () => {
    Alert.alert(
      'מחיקת חשבון לצמיתות ⚠️',
      'פעולה זו תמחק את כל המידע שלך ולא ניתן לשחזר אותה. האם להמשיך?',
      [
        { text: 'לא, טעות!', style: 'cancel' },
        { 
          text: 'כן, מחק הכל', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const user = auth.currentUser;
              if (user) {
                await deleteUser(user);
                // פיירבס ינתק אוטומטית אחרי מחיקה
              }
            } catch (error) {
              Alert.alert('שגיאה', 'לצורך מחיקת חשבון יש להתחבר מחדש (מטעמי אבטחה)');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // רכיב עזר לשורה בהגדרות
  const SettingItem = ({ icon: Icon, title, value, isSwitch = false, onPress, color = '#1f2937' }: any) => (
    <TouchableOpacity 
      style={styles.itemContainer} 
      onPress={onPress} 
      disabled={isSwitch}
      activeOpacity={0.7}
    >
      {/* צד שמאל - הפעולה */}
      <View style={styles.leftAction}>
        {isSwitch ? (
          <Switch
            trackColor={{ false: '#e5e7eb', true: '#818cf8' }}
            thumbColor={value ? '#4f46e5' : '#f4f3f4'}
            onValueChange={onPress}
            value={value}
          />
        ) : (
          <ChevronLeft size={20} color="#9ca3af" />
        )}
      </View>

      {/* צד ימין - הטקסט והאייקון */}
      <View style={styles.rightContent}>
        <Text style={[styles.itemText, { color }]}>{title}</Text>
        <View style={[styles.iconBox, { backgroundColor: color === '#ef4444' ? '#fee2e2' : '#f3f4f6' }]}>
          <Icon size={20} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* כותרת */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הגדרות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* כרטיס פרופיל */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userEmail.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>הורה רגוע</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>כללי</Text>
        <View style={styles.section}>
          <SettingItem 
            icon={Moon} 
            title="מצב לילה" 
            isSwitch 
            value={isDarkMode} 
            onPress={() => setIsDarkMode(!isDarkMode)} 
          />
          <View style={styles.divider} />
          <SettingItem 
            icon={Bell} 
            title="התראות" 
            isSwitch 
            value={notificationsEnabled} 
            onPress={() => setNotificationsEnabled(!notificationsEnabled)} 
          />
        </View>

        <Text style={styles.sectionTitle}>חשבון</Text>
        <View style={styles.section}>
          <SettingItem icon={User} title="עריכת פרופיל" onPress={() => Alert.alert('בקרוב', 'אפשרות זו תפתח בגרסה הבאה')} />
          <View style={styles.divider} />
          <SettingItem icon={Shield} title="פרטיות ואבטחה" onPress={() => {}} />
          <View style={styles.divider} />
          <SettingItem icon={Mail} title="צור קשר לתמיכה" onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>איזור מסוכן</Text>
        <View style={styles.section}>
          <SettingItem 
            icon={LogOut} 
            title="התנתקות" 
            color="#ef4444" 
            onPress={handleLogout} 
          />
          <View style={styles.divider} />
          <SettingItem 
            icon={Trash2} 
            title="מחיקת חשבון" 
            color="#ef4444" 
            onPress={handleDeleteAccount} 
          />
        </View>

        <Text style={styles.version}>גרסה 1.0.0 • CalmParentApp</Text>

      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24, backgroundColor: 'white' },
  headerTitle: { fontSize: 30, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  profileCard: {
    flexDirection: 'row-reverse', // כדי שהתמונה תהיה מימין
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 16
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#4f46e5' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', textAlign: 'right' },
  profileEmail: { fontSize: 14, color: '#6b7280', textAlign: 'right' },

  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginBottom: 10, textAlign: 'right', marginRight: 10 },
  section: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  
  itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rightContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leftAction: { alignItems: 'flex-start' }, // המתג יהיה בצד שמאל
  
  itemText: { fontSize: 16, fontWeight: '500' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },
  
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 10 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }
});
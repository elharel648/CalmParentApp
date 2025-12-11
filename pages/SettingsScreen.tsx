import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication'; // <--- הייבוא החשוב
import { 
  LogOut, 
  Trash2, 
  Moon, 
  Bell, 
  User, 
  ChevronLeft, 
  Shield, 
  Mail,
  X,
  Lock,
  FileText,
  Share2,
  Star,
  Camera
} from 'lucide-react-native';
import { auth, db } from '../services/firebaseConfig';
import { deleteUser, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const COLORS = {
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    divider: '#E5E5EA',
    danger: '#FF3B30',
    primary: '#007AFF',
    modalBg: 'rgba(0,0,0,0.5)'
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    textPrimary: '#FFFFFF',
    textSecondary: '#98989D',
    divider: '#38383A',
    danger: '#FF453A',
    primary: '#0A84FF',
    modalBg: 'rgba(255,255,255,0.1)'
  }
};

export default function SettingsScreen() {
  const [userData, setUserData] = useState({ name: '', email: '', photoURL: null });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const [loading, setLoading] = useState(false); 
  const [initialLoading, setInitialLoading] = useState(true);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const theme = isDarkMode ? COLORS.dark : COLORS.light;

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData({ 
          name: data.displayName || user.displayName || 'הורה יקר', 
          email: user.email || '',
          photoURL: data.photoURL || user.photoURL || null
        });
        
        if (data.settings) {
          if (data.settings.isDarkMode !== undefined) setIsDarkMode(data.settings.isDarkMode);
          if (data.settings.notificationsEnabled !== undefined) setNotificationsEnabled(data.settings.notificationsEnabled);
          if (data.settings.biometricsEnabled !== undefined) setBiometricsEnabled(data.settings.biometricsEnabled);
        }
      } else {
        setUserData({ 
          name: user.displayName || 'הורה יקר', 
          email: user.email || '',
          photoURL: user.photoURL || null
        });
      }
    } catch (error) {
      console.log('Error fetching settings:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const saveSettingToDB = async (key: string, value: boolean) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { 
          settings: { 
            [key]: value 
          } 
        }, { merge: true });
      }
    } catch (error) {
      console.error("Failed to save setting:", key);
    }
  };

  // --- לוגיקה ביומטרית ---
  const handleBiometricsToggle = async (value: boolean) => {
    // אם מכבים - אין בעיה
    if (!value) {
      setBiometricsEnabled(false);
      saveSettingToDB('biometricsEnabled', false);
      return;
    }

    // אם מדליקים - צריך לוודא שהמשתמש הוא הבעלים
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('שגיאה', 'המכשיר לא תומך ב-Face ID או שלא הוגדר קוד גישה');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'אימות להפעלת הגנה ביומטרית',
        fallbackLabel: 'השתמש בסיסמה'
      });

      if (result.success) {
        setBiometricsEnabled(true);
        saveSettingToDB('biometricsEnabled', true);
      } else {
        // המשתמש ביטל או נכשל
        setBiometricsEnabled(false);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'אירעה שגיאה בתהליך האימות');
      setBiometricsEnabled(false);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    setIsDarkMode(value); 
    saveSettingToDB('isDarkMode', value); 
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    saveSettingToDB('notificationsEnabled', value);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('שגיאה', 'צריך הרשאה לגישה לתמונות');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLoading(true);
      const newImageUri = result.assets[0].uri;
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { photoURL: newImageUri });
          await updateProfile(user, { photoURL: newImageUri }).catch(() => {});
          setUserData(prev => ({ ...prev, photoURL: newImageUri }));
        }
      } catch (error) {
        Alert.alert('שגיאה', 'לא הצלחנו לשמור את התמונה');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShareApp = async () => {
    try { await Share.share({ message: 'היי! אני ב-CalmParent וזה ממש עוזר לי. 📱' }); } catch (error) {}
  };

  const handleSaveName = async () => {
    if (newName.trim().length < 2) return Alert.alert('שגיאה', 'שם קצר מדי');
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: newName });
        await setDoc(doc(db, 'users', user.uid), { displayName: newName }, { merge: true });
        setUserData(prev => ({ ...prev, name: newName }));
        setEditModalVisible(false);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'עדכון השם נכשל');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    Alert.alert('איפוס סיסמה', `נשלח מייל לאיפוס לכתובת:\n${userData.email}`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'שלח', onPress: async () => {
          if (userData.email) await sendPasswordResetEmail(auth, userData.email);
          Alert.alert('נשלח!', 'בדוק את המייל.');
      }}
    ]);
  };

  const handleLogout = () => {
    Alert.alert('התנתקות', 'בטוח?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'כן, צא', style: 'destructive', onPress: () => signOut(auth) }
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert('מחיקת חשבון ⚠️', 'בלתי הפיך!', [{ text: 'ביטול' }, { text: 'מחק', style: 'destructive', onPress: async () => {
        if (auth.currentUser) await deleteUser(auth.currentUser);
    }}]);
  };

  const SettingItem = ({ icon: Icon, title, type = 'arrow', value, onPress, color, isDestructive }: any) => {
    const iconColor = color || theme.primary;
    const textColor = isDestructive ? theme.danger : theme.textPrimary;

    return (
      <TouchableOpacity 
        style={[styles.itemContainer, { backgroundColor: theme.card, borderBottomColor: theme.divider }]} 
        onPress={onPress}
        disabled={type === 'switch'}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          {type === 'switch' && (
            <Switch
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={'#fff'}
              onValueChange={onPress}
              value={value}
            />
          )}
          {type === 'arrow' && <ChevronLeft size={20} color={theme.textSecondary} />}
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemText, { color: textColor }]}>{title}</Text>
          <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#2C2C2E' : '#EEF2FF' }]}>
            <Icon size={18} color={isDestructive ? theme.danger : iconColor} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>הגדרות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarContainer}>
            {userData.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>
                  {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.editIconBadge}><Camera size={12} color="white" /></View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>{initialLoading ? '...' : userData.name}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{userData.email}</Text>
            <TouchableOpacity onPress={() => { setNewName(userData.name); setEditModalVisible(true); }}>
              <Text style={[styles.editLink, { color: theme.primary }]}>ערוך פרטים</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeader}>מערכת</Text>
        <View style={styles.sectionContainer}>
          <SettingItem icon={Moon} title="מצב לילה" type="switch" value={isDarkMode} onPress={handleDarkModeToggle} color="#5856D6" />
          <SettingItem icon={Bell} title="התראות" type="switch" value={notificationsEnabled} onPress={handleNotificationsToggle} color="#FF9500" />
          <SettingItem icon={Lock} title="כניסה ביומטרית" type="switch" value={biometricsEnabled} onPress={handleBiometricsToggle} color="#34C759" />
        </View>

        <Text style={styles.sectionHeader}>חשבון</Text>
        <View style={styles.sectionContainer}>
          <SettingItem icon={Lock} title="שינוי סיסמה" onPress={handleChangePassword} color="#007AFF" />
          <SettingItem icon={FileText} title="מדיניות פרטיות" onPress={() => Linking.openURL('https://policies.google.com')} color="#8E8E93" />
        </View>

        <Text style={styles.sectionHeader}>תמיכה</Text>
        <View style={styles.sectionContainer}>
          <SettingItem icon={Mail} title="צור קשר" onPress={() => Linking.openURL('mailto:support@app.com')} color="#5AC8FA" />
          <SettingItem icon={Share2} title="שתף חברים" onPress={handleShareApp} color="#AF52DE" />
        </View>

        <Text style={styles.sectionHeader}>איזור מסוכן</Text>
        <View style={styles.sectionContainer}>
          <SettingItem icon={LogOut} title="התנתקות" isDestructive onPress={handleLogout} />
          <SettingItem icon={Trash2} title="מחיקת חשבון" isDestructive onPress={handleDeleteAccount} />
        </View>
        <Text style={[styles.version, { color: theme.textSecondary }]}>CalmParent v1.0.3</Text>
      </ScrollView>

      {/* Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}><X size={24} color={theme.textSecondary} /></TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>עריכת שם</Text>
                </View>
                <TextInput style={[styles.input, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7', color: theme.textPrimary }]} value={newName} onChangeText={setNewName} textAlign="right" autoFocus />
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveName}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>שמור</Text>}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {loading && !isEditModalVisible && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={theme.primary} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 32, fontWeight: '700', textAlign: 'right' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  profileCard: { flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  avatarContainer: { position: 'relative', marginLeft: 16 },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '600' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007AFF', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  profileInfo: { flex: 1, alignItems: 'flex-end' },
  profileName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  profileEmail: { fontSize: 14 },
  editLink: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginRight: 12, textAlign: 'right' },
  sectionContainer: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  itemRight: { flexDirection: 'row', alignItems: 'center' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemText: { fontSize: 16, marginRight: 12, fontWeight: '400' },
  iconBox: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 10, opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  input: { borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 24, textAlign: 'right' },
  saveButton: { borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
});
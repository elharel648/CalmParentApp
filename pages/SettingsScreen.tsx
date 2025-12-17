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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut,
  Trash2,
  Moon,
  Bell,
  ChevronLeft,
  Mail,
  X,
  Lock,
  FileText,
  Share2,
  Camera,
  User,
  Key,
  Globe,
  Check,
  Shield,
  MessageCircle,
  Send,
  Utensils,
  Pill,
  Users,
  UserPlus,
  Baby,
} from 'lucide-react-native';
import { auth, db } from '../services/firebaseConfig';
import { deleteUser, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { useChildProfile } from '../hooks/useChildProfile';
import { useActiveChild } from '../context/ActiveChildContext';
import { deleteChild } from '../services/babyService';
import { IntervalPicker } from '../components/Settings/IntervalPicker';
import { TimePicker } from '../components/Settings/TimePicker';

// --- צבעים ועיצוב ---
const COLORS = {
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    divider: '#E5E5EA',
    danger: '#FF3B30',
    primary: '#6366F1',
    modalBg: 'rgba(0,0,0,0.5)'
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    textPrimary: '#FFFFFF',
    textSecondary: '#98989D',
    divider: '#38383A',
    danger: '#FF453A',
    primary: '#818CF8',
    modalBg: 'rgba(255,255,255,0.1)'
  }
};

const LANGUAGES = [
  { key: 'he', label: 'עברית', flag: '🇮🇱' },
  { key: 'en', label: 'English', flag: '🇺🇸' },
];

export default function SettingsScreen() {
  // --- Theme (Global) ---
  const { isDarkMode, setDarkMode, theme } = useTheme();
  const navigation = useNavigation<any>();

  // --- Active Child Context ---
  const { activeChild, allChildren, setActiveChild, refreshChildren } = useActiveChild();

  // --- Notifications ---
  const { settings: notifSettings, updateSettings: updateNotifSettings, hasPermission, sendTestNotification } = useNotifications();

  // --- States ---
  const [userData, setUserData] = useState({ name: '', email: '', photoURL: null });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('he');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Modal States
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // Baby profile for family
  const { profile } = useChildProfile();

  // Theme colors are now from context

  // --- טעינת נתונים ---
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
          if (data.settings.notificationsEnabled !== undefined) setNotificationsEnabled(data.settings.notificationsEnabled);
          if (data.settings.biometricsEnabled !== undefined) setBiometricsEnabled(data.settings.biometricsEnabled);
          if (data.settings.language !== undefined) setSelectedLanguage(data.settings.language);
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

  const saveSettingToDB = async (key: string, value: any) => {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!value) {
      setBiometricsEnabled(false);
      saveSettingToDB('biometricsEnabled', false);
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('לא זמין', 'המכשיר לא תומך ב-Face ID/Touch ID או שלא הוגדר קוד גישה.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'אמת זהות כדי להפעיל הגנה ביומטרית',
        fallbackLabel: 'השתמש בסיסמה'
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBiometricsEnabled(true);
        saveSettingToDB('biometricsEnabled', true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setBiometricsEnabled(false);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'אירעה שגיאה בתהליך האימות');
      setBiometricsEnabled(false);
    }
  };

  // --- שאר ההגדרות ---
  const handleDarkModeToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDarkMode(value); // Uses global context
  };

  const handleNotificationsToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(value);
    saveSettingToDB('notificationsEnabled', value);
  };

  const handleLanguageSelect = (langKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguage(langKey);
    saveSettingToDB('language', langKey);
    setLanguageModalVisible(false);

    if (langKey === 'en') {
      Alert.alert('Coming Soon', 'English support will be available in a future update.');
    }
  };

  // --- עדכון תמונה ---
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('שגיאה', 'חובה לאשר גישה לגלריה כדי להחליף תמונה');
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
          await updateProfile(user, { photoURL: newImageUri }).catch((e) => console.log('Auth profile update error', e));

          setUserData(prev => ({ ...prev, photoURL: newImageUri }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        Alert.alert('שגיאה', 'לא הצלחנו לשמור את התמונה');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveName = async () => {
    if (newName.trim().length < 2) return Alert.alert('שגיאה', 'השם חייב להכיל לפחות 2 תווים');

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: newName });
        await setDoc(doc(db, 'users', user.uid), { displayName: newName }, { merge: true });
        setUserData(prev => ({ ...prev, name: newName }));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditModalVisible(false);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'עדכון השם נכשל');
    } finally {
      setLoading(false);
    }
  };

  // --- פונקציות כלליות ---
  const handleShareApp = async () => {
    try {
      await Share.share({ message: 'היי! אני משתמש/ת ב-CalmParent וזה ממש עוזר לי לנהל את הטיפול בבייבי. ממליץ/ה בחום! 👶📱' });
    } catch (error) { }
  };

  const handleChangePassword = async () => {
    Alert.alert(
      'איפוס סיסמה',
      `האם לשלוח מייל לאיפוס סיסמה לכתובת:\n${userData.email}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'שלח מייל', onPress: async () => {
            if (userData.email) {
              try {
                await sendPasswordResetEmail(auth, userData.email);
                Alert.alert('נשלח בהצלחה!', 'בדוק/י את תיבת המייל שלך (גם בספאם).');
              } catch (e) {
                Alert.alert('שגיאה', 'לא הצלחנו לשלוח את המייל.');
              }
            }
          }
        }
      ]
    );
  };

  const handleSendContactMessage = async () => {
    if (contactMessage.trim().length < 10) {
      Alert.alert('שגיאה', 'ההודעה חייבת להכיל לפחות 10 תווים');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // Save contact message to Firebase
        const contactRef = doc(db, 'contactMessages', `${user.uid}_${Date.now()}`);
        await setDoc(contactRef, {
          userId: user.uid,
          userEmail: user.email,
          userName: userData.name,
          message: contactMessage,
          timestamp: new Date().toISOString(),
          status: 'pending'
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('נשלח בהצלחה! ✅', 'קיבלנו את פנייתך ונחזור אלייך בהקדם.');
        setContactMessage('');
        setContactModalVisible(false);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח את ההודעה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('התנתקות', 'האם את/ה בטוח/ה שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'כן, התנתק', style: 'destructive', onPress: () => signOut(auth) }
    ]);
  };

  const handleDeleteChild = async () => {
    if (!activeChild) return Alert.alert('Error', 'No child selected');

    const childName = activeChild.childName;

    Alert.alert(
      `Delete ${childName}?`,
      'This will delete ALL child data: photos, stats, events.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              `This is irreversible! Cannot recover ${childName}.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const deletedChildId = activeChild.childId;
                      await deleteChild(deletedChildId);

                      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                      // Refresh children list
                      await refreshChildren();

                      // Find remaining children (excluding the deleted one)
                      const remainingChildren = allChildren.filter(child => child.childId !== deletedChildId);

                      if (remainingChildren.length === 0) {
                        // No children left - go to CreateBaby
                        Alert.alert('Deleted', `${childName} deleted. Add a new child.`, [
                          { text: 'OK', onPress: () => navigation.navigate('CreateBaby') }
                        ]);
                      } else {
                        // Switch to next child (first in remaining list)
                        setActiveChild(remainingChildren[0]);
                        Alert.alert('Deleted', `${childName} deleted. Switched to ${remainingChildren[0].childName}`);
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete child');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'מחיקת חשבון לצמיתות ⚠️',
      'פעולה זו אינה הפיכה ותמחק את כל הנתונים שלך. האם להמשיך?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק חשבון', style: 'destructive', onPress: async () => {
            if (auth.currentUser) {
              try {
                await deleteUser(auth.currentUser);
              } catch (e) {
                Alert.alert('שגיאה', 'יש להתחבר מחדש כדי למחוק את החשבון.');
              }
            }
          }
        }
      ]
    );
  };

  // --- רכיבים ---
  const SectionHeader = ({ icon: Icon, title, color }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionIcon, { backgroundColor: color + '20' }]}>
        <Icon size={14} color={color} strokeWidth={2.5} />
      </View>
    </View>
  );

  const SettingItem = ({ icon: Icon, title, type = 'arrow', value, onPress, color, isDestructive, subtitle }: any) => {
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
          {type === 'value' && (
            <View style={styles.valueContainer}>
              <ChevronLeft size={16} color={theme.textSecondary} />
              <Text style={[styles.valueText, { color: theme.textSecondary }]}>{value}</Text>
            </View>
          )}
        </View>

        <View style={styles.itemRight}>
          <View style={styles.itemTextContainer}>
            <Text style={[styles.itemText, { color: textColor }]}>{title}</Text>
            {subtitle && <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
          </View>
          <View style={[styles.iconBox, { backgroundColor: isDestructive ? theme.danger + '15' : (isDarkMode ? '#2C2C2E' : iconColor + '15') }]}>
            <Icon size={18} color={isDestructive ? theme.danger : iconColor} strokeWidth={2} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentLang = LANGUAGES.find(l => l.key === selectedLanguage);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header with gradient */}
      <LinearGradient
        colors={isDarkMode ? ['#1C1C1E', '#000000'] : ['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>הגדרות</Text>
        <Text style={styles.headerSubtitle}>ניהול חשבון ותצוגה</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* User Avatar - small gray circle with initials */}
        {/* User Avatar - small gray circle with initials - NON CLICKABLE */}
        <View style={styles.userAvatarCard}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <View style={styles.userAvatarSmall}>
              <Text style={styles.userAvatarInitials}>
                {userData.email ? userData.email.substring(0, 2).toUpperCase() : 'ME'}
              </Text>
            </View>
            <View style={{ marginRight: 12, alignItems: 'flex-end' }}>
              <Text style={[styles.userAvatarName, { color: theme.textPrimary }]}>החשבון שלי</Text>
              <Text style={[styles.userAvatarEmail, { color: theme.textSecondary }]}>{userData.email}</Text>
            </View>
          </View>
        </View>

        {/* התראות ותזכורות */}
        <SectionHeader icon={Bell} title="התראות ותזכורות" color="#FF9500" />
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          {/* Master Toggle */}
          <SettingItem
            icon={Bell}
            title="התראות מופעלות"
            type="switch"
            value={notifSettings.enabled}
            onPress={(val: boolean) => updateNotifSettings({ enabled: val })}
            color="#FF9500"
          />

          {/* Food Reminder */}
          <SettingItem
            icon={Utensils}
            title="תזכורת האכלה"
            type="switch"
            value={notifSettings.feedingReminder}
            onPress={(val: boolean) => updateNotifSettings({ feedingReminder: val })}
            color="#F59E0B"
            subtitle={`כל ${notifSettings.feedingIntervalHours} שעות`}
          />
          {notifSettings.feedingReminder && (
            <>
              <IntervalPicker
                value={notifSettings.feedingIntervalHours}
                options={[1, 2, 3, 4]}
                unit="שעות"
                onChange={(val) => updateNotifSettings({ feedingIntervalHours: val as 1 | 2 | 3 | 4 })}
                disabled={!notifSettings.enabled}
              />
              <TimePicker
                value={notifSettings.feedingStartTime || "08:00"}
                label="שעת התחלה"
                onChange={(time) => updateNotifSettings({ feedingStartTime: time })}
                disabled={!notifSettings.enabled}
              />
            </>
          )}

          {/* Supplements Reminder */}
          <SettingItem
            icon={Pill}
            title="תזכורת תוספים"
            type="switch"
            value={notifSettings.supplementReminder}
            onPress={(val: boolean) => updateNotifSettings({ supplementReminder: val })}
            color="#10B981"
            subtitle={`כל יום ב-${notifSettings.supplementTime}`}
          />
          {notifSettings.supplementReminder && (
            <TimePicker
              value={notifSettings.supplementTime}
              label="שעת נטילה"
              onChange={(time) => updateNotifSettings({ supplementTime: time })}
              disabled={!notifSettings.enabled}
            />
          )}

          {/* Daily Summary */}
          <SettingItem
            icon={FileText}
            title="סיכום יומי"
            type="switch"
            value={notifSettings.dailySummary}
            onPress={(val: boolean) => updateNotifSettings({ dailySummary: val })}
            color="#EC4899"
            subtitle={`כל יום ב-${notifSettings.dailySummaryTime}`}
          />
          {notifSettings.dailySummary && (
            <TimePicker
              value={notifSettings.dailySummaryTime}
              label="שעת סיכום"
              onChange={(time) => updateNotifSettings({ dailySummaryTime: time })}
              disabled={!notifSettings.enabled}
            />
          )}
        </View>

        {/* תצוגה והתנהגות */}
        <SectionHeader icon={Moon} title="תצוגה והתנהגות" color="#8B5CF6" />
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <SettingItem icon={Moon} title="מצב לילה" type="switch" value={isDarkMode} onPress={handleDarkModeToggle} color="#5856D6" />
          <SettingItem
            icon={Globe}
            title="שפה"
            type="value"
            value={currentLang?.flag + ' ' + currentLang?.label}
            onPress={() => setLanguageModalVisible(true)}
            color="#34C759"
          />
          <SettingItem icon={Lock} title="כניסה ביומטרית" type="switch" value={biometricsEnabled} onPress={handleBiometricsToggle} color="#34C759" subtitle="Face ID / Touch ID" />
        </View>

        {/* 3. פרטיות ותמיכה */}
        <SectionHeader icon={Shield} title="פרטיות ותמיכה" color="#10B981" />
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <SettingItem icon={FileText} title="מדיניות פרטיות" onPress={() => Linking.openURL('https://policies.google.com')} color="#8E8E93" />
          <SettingItem icon={FileText} title="תנאי שימוש" onPress={() => Linking.openURL('https://policies.google.com/terms')} color="#8E8E93" />
          <SettingItem icon={MessageCircle} title="צור קשר" onPress={() => setContactModalVisible(true)} color="#5AC8FA" subtitle="שלח הודעה לצוות" />
          <SettingItem icon={Share2} title="שתף חברים" onPress={handleShareApp} color="#AF52DE" />
        </View>

        {/* 4. אזור מסוכן */}
        <SectionHeader icon={Trash2} title="אזור מסוכן" color="#EF4444" />
        <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
          <SettingItem icon={Key} title="שינוי סיסמה" onPress={handleChangePassword} color="#007AFF" subtitle="שלח מייל לאיפוס" />
          <SettingItem
            icon={Trash2}
            title="מחיקת ילד נוכחי"
            isDestructive
            onPress={handleDeleteChild}
            subtitle={activeChild ? `מחק את ${activeChild.childName}` : 'אין ילד נבחר'}
          />
          <SettingItem icon={LogOut} title="התנתקות" isDestructive onPress={handleLogout} />
          <SettingItem icon={Trash2} title="מחיקת חשבון" isDestructive onPress={handleDeleteAccount} subtitle="פעולה זו בלתי הפיכה" />
        </View>

        <Text style={[styles.version, { color: theme.textSecondary }]}>CalmParent v1.0.4</Text>
      </ScrollView>

      {/* Modal לעריכת שם */}
      <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { backgroundColor: theme.card }]}>

                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <X size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>עריכת שם</Text>
                </View>

                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7', color: theme.textPrimary }]}
                  value={newName}
                  onChangeText={setNewName}
                  textAlign="right"
                  autoFocus
                  placeholder="הקלד שם חדש..."
                  placeholderTextColor={theme.textSecondary}
                />

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveName}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>שמור שינויים</Text>}
                </TouchableOpacity>

              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal לבחירת שפה */}
      <Modal visible={isLanguageModalVisible} transparent animationType="fade" onRequestClose={() => setLanguageModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setLanguageModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>

              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                  <X size={24} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>בחירת שפה</Text>
              </View>

              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.key}
                  style={[styles.languageOption, selectedLanguage === lang.key && { backgroundColor: theme.primary + '15' }]}
                  onPress={() => handleLanguageSelect(lang.key)}
                >
                  <View style={styles.languageLeft}>
                    {selectedLanguage === lang.key && <Check size={20} color={theme.primary} strokeWidth={3} />}
                  </View>
                  <View style={styles.languageRight}>
                    <Text style={[styles.languageLabel, { color: theme.textPrimary }]}>{lang.label}</Text>
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                  </View>
                </TouchableOpacity>
              ))}

            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal ליצירת קשר */}
      <Modal visible={isContactModalVisible} transparent animationType="fade" onRequestClose={() => setContactModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setContactModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { backgroundColor: theme.card }]}>

                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                    <X size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>צור קשר</Text>
                </View>

                <Text style={[styles.contactHint, { color: theme.textSecondary }]}>
                  יש לך שאלה או הצעה? נשמח לשמוע ממך!
                </Text>

                <TextInput
                  style={[styles.textArea, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7', color: theme.textPrimary }]}
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  textAlign="right"
                  multiline
                  numberOfLines={5}
                  placeholder="כתוב את ההודעה שלך..."
                  placeholderTextColor={theme.textSecondary}
                  textAlignVertical="top"
                />

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSendContactMessage}>
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={styles.sendBtnContent}>
                      <Send size={18} color="white" strokeWidth={2.5} />
                      <Text style={styles.saveButtonText}>שלח הודעה</Text>
                    </View>
                  )}
                </TouchableOpacity>

              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Loading Overlay כללי */}
      {
        loading && !isEditModalVisible && !isContactModalVisible && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )
      }


    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
    marginTop: 4,
  },

  scrollContent: { padding: 16, paddingBottom: 120 },

  // User Avatar Card
  userAvatarCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  userAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  userAvatarName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userAvatarEmail: {
    fontSize: 12,
    marginTop: 2,
  },

  // פרופיל
  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    marginTop: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5
  },
  avatarContainer: { position: 'relative', marginLeft: 16 },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'white' },
  profileInfo: { flex: 1, alignItems: 'flex-end' },
  profileName: { fontSize: 22, fontWeight: '700', marginBottom: 2, letterSpacing: -0.3 },
  profileEmail: { fontSize: 14, opacity: 0.8 },
  editProfileBtn: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#EEF2FF', borderRadius: 20 },
  editLink: { fontSize: 13, fontWeight: '600' },

  // סקציות
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 4,
    gap: 8,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '600' },
  sectionIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sectionContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },

  // פריט ברשימה
  itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  itemRight: { flexDirection: 'row', alignItems: 'center' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemTextContainer: { alignItems: 'flex-end', marginRight: 12 },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemSubtitle: { fontSize: 12, marginTop: 2 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  valueContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { fontSize: 14, fontWeight: '500' },

  version: { textAlign: 'center', fontSize: 12, marginTop: 16, opacity: 0.6 },

  // מודל
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  input: { borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, textAlign: 'right' },
  textArea: { borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, textAlign: 'right', minHeight: 120 },
  contactHint: { fontSize: 14, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  saveButton: { borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  sendBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },

  // Language Modal
  languageOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  languageRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  languageLeft: { width: 24 },
  languageFlag: { fontSize: 24 },
  languageLabel: { fontSize: 16, fontWeight: '500' },
});
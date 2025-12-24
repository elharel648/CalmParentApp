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
  SafeAreaView,
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
  Bell,
  Moon,
  Lock,
  Globe,
  Shield,
  FileText,
  MessageCircle,
  Share2,
  Key,
  X,
  Check,
  Send,
  Utensils,
  Pill,
  ChevronLeft,
  ChevronRight,
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

const LANGUAGES = [
  { key: 'he', label: 'עברית', flag: '🇮🇱' },
  { key: 'en', label: 'English', flag: '🇺🇸' },
];

export default function SettingsScreen() {
  const { isDarkMode, setDarkMode, theme } = useTheme();
  const navigation = useNavigation<any>();
  const { activeChild, allChildren, setActiveChild, refreshChildren } = useActiveChild();
  const { settings: notifSettings, updateSettings: updateNotifSettings } = useNotifications();

  const [userData, setUserData] = useState({ name: '', email: '', photoURL: null });
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('he');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isTermsModalVisible, setTermsModalVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

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
      if (__DEV__) console.log('Error fetching settings:', error);
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
      if (__DEV__) console.log('Failed to save setting:', key);
    }
  };

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

  const handleDarkModeToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDarkMode(value);
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
    if (!activeChild) return Alert.alert('שגיאה', 'אין ילד נבחר');

    const childName = activeChild.childName;

    Alert.alert(
      `מחיקת ${childName}?`,
      'פעולה זו תמחק את כל הנתונים של הילד: תמונות, סטטיסטיקות, אירועים.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'אתה בטוח לחלוטין?',
              `פעולה זו בלתי הפיכה! לא ניתן לשחזר את ${childName}.`,
              [
                { text: 'ביטול', style: 'cancel' },
                {
                  text: 'כן, מחק הכל',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const deletedChildId = activeChild.childId;
                      await deleteChild(deletedChildId);

                      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                      await refreshChildren();

                      const remainingChildren = allChildren.filter(child => child.childId !== deletedChildId);

                      if (remainingChildren.length === 0) {
                        Alert.alert('נמחק', `${childName} נמחק. הוסף ילד חדש.`, [
                          { text: 'אישור', onPress: () => navigation.navigate('CreateBaby') }
                        ]);
                      } else {
                        setActiveChild(remainingChildren[0]);
                        Alert.alert('נמחק', `${childName} נמחק. עבר ל-${remainingChildren[0].childName}`);
                      }
                    } catch (error) {
                      Alert.alert('שגיאה', 'לא ניתן למחוק את הילד');
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
      'פעולה זו אינה הפיכה ותמחק את כל הנתונים שלך לצמיתות. האם אתה בטוח?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, מחק הכל',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'אישור אחרון',
              'לאחר המחיקה לא ניתן יהיה לשחזר את החשבון והנתונים. להמשיך?',
              [
                { text: 'ביטול', style: 'cancel' },
                {
                  text: 'מחק לצמיתות',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (auth.currentUser) {
                        await deleteUser(auth.currentUser);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert(
                          'החשבון נמחק ✅',
                          'כל הנתונים שלך נמחקו בהצלחה. להתראות!',
                          [{ text: 'אישור' }]
                        );
                      }
                    } catch (e: any) {
                      if (e?.code === 'auth/requires-recent-login') {
                        Alert.alert(
                          'נדרשת התחברות מחדש',
                          'מטעמי אבטחה, יש להתנתק ולהתחבר מחדש לפני מחיקת החשבון.',
                          [{ text: 'הבנתי' }]
                        );
                      } else {
                        Alert.alert('שגיאה', 'אירעה שגיאה במחיקת החשבון. נסה שוב.');
                      }
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

  const currentLang = LANGUAGES.find(l => l.key === selectedLanguage);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Minimal Header - Apple Style */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>הגדרות</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={22} color={theme.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* התראות ותזכורות */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#FFF4E6' }]}>
              <Bell size={18} color="#FF9500" strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>התראות ותזכורות</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.listItem, styles.listItemFirst]}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FFF4E6' }]}>
                  <Bell size={18} color="#FF9500" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>התראות מופעלות</Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: '#FF9500' }}
                thumbColor="#fff"
                onValueChange={(val) => updateNotifSettings({ enabled: val })}
                value={notifSettings.enabled}
              />
            </View>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <View style={styles.listItem}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Utensils size={18} color="#F59E0B" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>תזכורת אוכל</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    כל {notifSettings.feedingIntervalHours} שעות
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: '#F59E0B' }}
                thumbColor="#fff"
                onValueChange={(val) => updateNotifSettings({ feedingReminder: val })}
                value={notifSettings.feedingReminder}
                disabled={!notifSettings.enabled}
              />
            </View>

            {notifSettings.feedingReminder && (
              <>
                <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
                <View style={styles.listItem}>
                  <IntervalPicker
                    value={notifSettings.feedingIntervalHours}
                    options={[1, 2, 3, 4]}
                    unit="שעות"
                    onChange={(val) => updateNotifSettings({ feedingIntervalHours: val as 1 | 2 | 3 | 4 })}
                    disabled={!notifSettings.enabled}
                  />
                </View>
                <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
                <View style={styles.listItem}>
                  <TimePicker
                    value={notifSettings.feedingStartTime || "08:00"}
                    label="שעת התחלה"
                    onChange={(time) => updateNotifSettings({ feedingStartTime: time })}
                    disabled={!notifSettings.enabled}
                  />
                </View>
              </>
            )}

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <View style={styles.listItem}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Pill size={18} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>תזכורת תוספים</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    כל יום ב-{notifSettings.supplementTime}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: '#10B981' }}
                thumbColor="#fff"
                onValueChange={(val) => updateNotifSettings({ supplementReminder: val })}
                value={notifSettings.supplementReminder}
                disabled={!notifSettings.enabled}
              />
            </View>

            {notifSettings.supplementReminder && (
              <>
                <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
                <View style={styles.listItem}>
                  <TimePicker
                    value={notifSettings.supplementTime}
                    label="שעת נטילה"
                    onChange={(time) => updateNotifSettings({ supplementTime: time })}
                    disabled={!notifSettings.enabled}
                  />
                </View>
              </>
            )}

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <View style={[styles.listItem, styles.listItemLast]}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FCE7F3' }]}>
                  <FileText size={18} color="#EC4899" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>סיכום יומי</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    כל יום ב-{notifSettings.dailySummaryTime}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: '#EC4899' }}
                thumbColor="#fff"
                onValueChange={(val) => updateNotifSettings({ dailySummary: val })}
                value={notifSettings.dailySummary}
                disabled={!notifSettings.enabled}
              />
            </View>

            {notifSettings.dailySummary && (
              <>
                <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
                <View style={[styles.listItem, styles.listItemLast]}>
                  <TimePicker
                    value={notifSettings.dailySummaryTime}
                    label="שעת סיכום"
                    onChange={(time) => updateNotifSettings({ dailySummaryTime: time })}
                    disabled={!notifSettings.enabled}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* תצוגה והתנהגות */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <Moon size={18} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>תצוגה והתנהגות</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.listItem, styles.listItemFirst]}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Moon size={18} color="#8B5CF6" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>מצב לילה</Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: theme.primary }}
                thumbColor="#fff"
                onValueChange={handleDarkModeToggle}
                value={isDarkMode}
              />
            </View>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() => setLanguageModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Globe size={18} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>שפה</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    {currentLang?.flag} {currentLang?.label}
                  </Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <View style={[styles.listItem, styles.listItemLast]}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Lock size={18} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>כניסה ביומטרית</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>Face ID / Touch ID</Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: '#10B981' }}
                thumbColor="#fff"
                onValueChange={handleBiometricsToggle}
                value={biometricsEnabled}
              />
            </View>
          </View>
        </View>

        {/* פרטיות ותמיכה */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Shield size={18} color="#10B981" strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>פרטיות ותמיכה</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.listItem, styles.listItemFirst]}
              onPress={() => setPrivacyModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: theme.divider }]}>
                  <FileText size={18} color={theme.textSecondary} strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>מדיניות פרטיות</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() => setTermsModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: theme.divider }]}>
                  <FileText size={18} color={theme.textSecondary} strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>תנאי שימוש</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() => Linking.openURL('mailto:Calmperent@Gmail.com?subject=פנייה מאפליקציית CalmParent')}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#E0F2FE' }]}>
                  <MessageCircle size={18} color="#0EA5E9" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>צור קשר</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>שלח מייל לצוות</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={[styles.listItem, styles.listItemLast]}
              onPress={handleShareApp}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Share2 size={18} color="#A78BFA" strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>שתף חברים</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* אזור מסוכן */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Trash2 size={18} color="#EF4444" strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>אזור מסוכן</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.listItem, styles.listItemFirst]}
              onPress={handleChangePassword}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Key size={18} color="#3B82F6" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>שינוי סיסמה</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>שלח מייל לאיפוס</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleDeleteChild}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: '#EF4444' }]}>מחיקת ילד נוכחי</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    {activeChild ? `מחק את ${activeChild.childName}` : 'אין ילד נבחר'}
                  </Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleLogout}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <LogOut size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: '#EF4444' }]}>התנתקות</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={[styles.listItem, styles.listItemLast]}
              onPress={handleDeleteAccount}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: '#EF4444' }]}>מחיקת חשבון</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>פעולה זו בלתי הפיכה</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: theme.textSecondary }]}>CalmParent v1.0.4</Text>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={isLanguageModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>בחירת שפה</Text>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.6}
              >
                <X size={24} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.key}
                  style={[
                    styles.languageItem,
                    { backgroundColor: theme.background },
                    selectedLanguage === lang.key && { backgroundColor: theme.primaryLight }
                  ]}
                  onPress={() => handleLanguageSelect(lang.key)}
                  activeOpacity={0.6}
                >
                  <View style={styles.languageContent}>
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <Text style={[styles.languageLabel, { color: theme.textPrimary }]}>{lang.label}</Text>
                  </View>
                  {selectedLanguage === lang.key && (
                    <Check size={20} color={theme.primary} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={isPrivacyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>מדיניות פרטיות</Text>
              <TouchableOpacity
                onPress={() => setPrivacyModalVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.6}
              >
                <X size={24} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.policyText, { color: theme.textPrimary }]}>
                <Text style={styles.policyTitle}>עדכון אחרון: דצמבר 2024{'\n\n'}</Text>

                <Text style={styles.policySubtitle}>1. מבוא{'\n'}</Text>
                ברוכים הבאים לאפליקציית CalmParent. אנו מחויבים להגן על פרטיותכם ולשמור על המידע האישי שלכם בצורה מאובטחת. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם.{'\n\n'}

                <Text style={styles.policySubtitle}>2. איסוף מידע{'\n'}</Text>
                אנו אוספים את המידע הבא:{'\n'}
                • פרטי חשבון: שם, כתובת אימייל, תמונת פרופיל{'\n'}
                • נתוני ילדים: שם, תאריך לידה, מגדר{'\n'}
                • נתוני מעקב: זמני שינה, האכלה, החתלה ותרופות{'\n'}
                • נתונים טכניים: סוג מכשיר, גרסת מערכת הפעלה{'\n\n'}

                <Text style={styles.policySubtitle}>3. שימוש במידע{'\n'}</Text>
                המידע שלכם משמש אותנו ל:{'\n'}
                • מתן שירותי האפליקציה והתאמה אישית{'\n'}
                • שליחת תזכורות והתראות{'\n'}
                • שיפור חוויית המשתמש{'\n'}
                • תמיכה טכנית{'\n\n'}

                <Text style={styles.policySubtitle}>4. אבטחת מידע{'\n'}</Text>
                אנו משתמשים בטכנולוגיות אבטחה מתקדמות כולל הצפנת נתונים, אחסון מאובטח בענן (Firebase), וגיבוי אוטומטי. המידע שלכם מאוחסן בשרתים מאובטחים וזמין רק לכם ולמי שתבחרו לשתף עמו.{'\n\n'}

                <Text style={styles.policySubtitle}>5. שיתוף מידע{'\n'}</Text>
                אנו לא מוכרים או משתפים את המידע האישי שלכם עם צדדים שלישיים למטרות שיווק. המידע עשוי להיות משותף רק עם בני משפחה שהוזמנו על ידכם לאפליקציה.{'\n\n'}

                <Text style={styles.policySubtitle}>6. יצירת קשר{'\n'}</Text>
                לשאלות בנוגע למדיניות הפרטיות, אנא פנו אלינו בכתובת: Calmperent@Gmail.com
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal visible={isTermsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>תנאי שימוש</Text>
              <TouchableOpacity
                onPress={() => setTermsModalVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.6}
              >
                <X size={24} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.policyText, { color: theme.textPrimary }]}>
                <Text style={styles.policyTitle}>עדכון אחרון: דצמבר 2024{'\n\n'}</Text>

                <Text style={styles.policySubtitle}>1. הסכמה לתנאים{'\n'}</Text>
                בשימוש באפליקציית CalmParent, הנכם מסכימים לתנאי שימוש אלה. אם אינכם מסכימים לתנאים, אנא הימנעו משימוש באפליקציה.{'\n\n'}

                <Text style={styles.policySubtitle}>2. תיאור השירות{'\n'}</Text>
                CalmParent היא אפליקציה למעקב אחר פעילויות תינוקות וילדים. האפליקציה מאפשרת רישום שינה, האכלה, החתלה, תרופות ושיתוף מידע עם בני משפחה.{'\n\n'}

                <Text style={styles.policySubtitle}>3. חשבון משתמש{'\n'}</Text>
                • הנכם אחראים לשמירה על סודיות פרטי החשבון{'\n'}
                • יש לספק מידע מדויק ועדכני{'\n'}
                • אתם האחראים הבלעדיים לכל הפעילות בחשבונכם{'\n\n'}

                <Text style={styles.policySubtitle}>4. שימוש מותר{'\n'}</Text>
                האפליקציה מיועדת לשימוש אישי ומשפחתי בלבד. אסור להשתמש באפליקציה לכל מטרה בלתי חוקית או לא מורשית.{'\n\n'}

                <Text style={styles.policySubtitle}>5. הגבלת אחריות{'\n'}</Text>
                האפליקציה מסופקת "כמות שהיא". אנו לא נושאים באחריות לכל נזק ישיר או עקיף הנובע משימוש באפליקציה. האפליקציה אינה מהווה תחליף לייעוץ רפואי מקצועי.{'\n\n'}

                <Text style={styles.policySubtitle}>6. קניין רוחני{'\n'}</Text>
                כל הזכויות באפליקציה, כולל עיצוב, קוד ותוכן, שייכות ל-CalmParent. אין לשכפל, להפיץ או ליצור יצירות נגזרות ללא אישור מפורש.{'\n\n'}

                <Text style={styles.policySubtitle}>7. שינויים בתנאים{'\n'}</Text>
                אנו שומרים לעצמנו את הזכות לעדכן תנאים אלה בכל עת. שימוש מתמשך באפליקציה לאחר עדכון מהווה הסכמה לתנאים המעודכנים.{'\n\n'}

                <Text style={styles.policySubtitle}>8. יצירת קשר{'\n'}</Text>
                לשאלות בנוגע לתנאי השימוש, אנא פנו אלינו בכתובת: Calmperent@Gmail.com
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal visible={isContactModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setContactModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.modalContainer, { backgroundColor: theme.card }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>צור קשר</Text>
                  <TouchableOpacity
                    onPress={() => setContactModalVisible(false)}
                    style={styles.modalClose}
                    activeOpacity={0.6}
                  >
                    <X size={24} color={theme.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.contactHint, { color: theme.textSecondary }]}>
                  יש לך שאלה או הצעה? נשמח לשמוע ממך!
                </Text>

                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.background, color: theme.textPrimary }]}
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  textAlign="right"
                  multiline
                  numberOfLines={5}
                  placeholder="כתוב את ההודעה שלך..."
                  placeholderTextColor={theme.textSecondary}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: theme.primary }]}
                  onPress={handleSendContactMessage}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.sendButtonContent}>
                      <Send size={18} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.sendButtonText}>שלח הודעה</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  listContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  listItemFirst: {
    paddingTop: 18,
  },
  listItemLast: {
    paddingBottom: 18,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
    marginRight: 20,
  },
  listItemContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  listItemText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  listItemSubtext: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: -0.08,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 8,
    marginBottom: 20,
    letterSpacing: -0.08,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
  },
  modalClose: {
    padding: 4,
  },
  modalContent: {
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  languageContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageLabel: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  contactHint: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'right',
    marginBottom: 16,
    letterSpacing: -0.24,
  },
  textArea: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
    textAlign: 'right',
  },
  sendButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  sendButtonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  policyText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
    paddingBottom: 24,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  policySubtitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Alert, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Settings, Camera, User, Pencil, Crown, Sparkles, Check, Star, ChevronLeft, UserPlus, Link as LinkIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

// Hooks
import { useTheme } from '../context/ThemeContext';
import { useFamily } from '../hooks/useFamily';
import { useActiveChild } from '../context/ActiveChildContext';
import { useBabyProfile } from '../hooks/useBabyProfile';
import { auth, db } from '../services/firebaseConfig';

// Components
import { FamilyMembersCard } from '../components/Family/FamilyMembersCard';
import { InviteFamilyModal } from '../components/Family/InviteFamilyModal';
import { JoinFamilyModal } from '../components/Family/JoinFamilyModal';
import GuestInviteModal from '../components/Family/GuestInviteModal';
import { EditBasicInfoModal } from '../components/Profile';

export default function SettingsScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const { activeChild, refreshChildren } = useActiveChild();
  const { baby, updateBasicInfo, updatePhoto, refresh } = useBabyProfile(activeChild?.childId);
  const { family, members, rename: renameFamily, isAdmin } = useFamily();
  const user = auth.currentUser;

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [isGuestInviteOpen, setIsGuestInviteOpen] = useState(false);
  const [isEditBasicInfoOpen, setIsEditBasicInfoOpen] = useState(false);
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(user?.photoURL || null);
  const [userName, setUserName] = useState<string>(user?.displayName || '');
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleSettingsPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('FullSettings');
  };

  // Calculate baby age
  const birthDateObj = baby?.birthDate ? new Date(baby.birthDate) : new Date();
  const babyAgeMonths = Math.floor((new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

  const getAgeDisplay = () => {
    if (babyAgeMonths < 1) {
      const days = Math.floor((new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} ימים`;
    }
    if (babyAgeMonths < 12) return `${babyAgeMonths} חודשים`;
    const years = Math.floor(babyAgeMonths / 12);
    const months = babyAgeMonths % 12;
    return months > 0 ? `${years} שנה ו-${months} חודשים` : `${years} שנה`;
  };

  const handleEditPhoto = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updatePhoto('profile');
    await refreshChildren();
  }, [updatePhoto, refreshChildren]);

  const handleSaveBasicInfo = useCallback(async (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => {
    await updateBasicInfo(data);
    setIsEditBasicInfoOpen(false);
    refresh();
  }, [updateBasicInfo, refresh]);

  const handleEditFamilyName = useCallback(() => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'ערוך שם משפחה',
        'הזן שם חדש למשפחה',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'שמור',
            onPress: async (newName) => {
              if (newName && newName.trim()) {
                const success = await renameFamily(newName.trim());
                if (success && Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              }
            },
          },
        ],
        'plain-text',
        family?.babyName || ''
      );
    } else {
      Alert.alert('ערוך שם משפחה', 'הפונקציה זמינה רק ב-iOS');
    }
  }, [family?.babyName, renameFamily]);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleEditUserPhoto = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'חובה לאשר הרשאות',
        'נדרשת הרשאת גלריה כדי לבחור תמונה',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'פתח הגדרות', onPress: openSettings }
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && user) {
      const newImageUri = result.assets[0].uri;
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL: newImageUri });
        await updateProfile(user, { photoURL: newImageUri }).catch((e) => { if (__DEV__) console.log('Auth profile update error', e); });
        setUserPhotoURL(newImageUri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert('שגיאה', 'לא הצלחנו לשמור את התמונה');
      }
    }
  }, [user, openSettings]);

  const handleEditUserName = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'ערוך שם',
        'הזן שם חדש',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'שמור',
            onPress: async (newName) => {
              if (newName && newName.trim() && user) {
                try {
                  await updateProfile(user, { displayName: newName.trim() });
                  const userRef = doc(db, 'users', user.uid);
                  await updateDoc(userRef, { displayName: newName.trim() });
                  setUserName(newName.trim());
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (error) {
                  Alert.alert('שגיאה', 'לא הצלחנו לשמור את השם');
                }
              }
            },
          },
        ],
        'plain-text',
        userName || ''
      );
    } else {
      Alert.alert('ערוך שם', 'הפונקציה זמינה רק ב-iOS');
    }
  }, [user, userName]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Minimal Header - Apple Style */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>חשבון</Text>
          <TouchableOpacity
            onPress={handleSettingsPress}
            style={styles.settingsButton}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Settings size={22} color={theme.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Profile Section - Centered, Minimal */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            onPress={handleEditUserPhoto}
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            {userPhotoURL ? (
              <Image source={{ uri: userPhotoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.divider }]}>
                <User size={48} color={theme.textTertiary} strokeWidth={1.5} />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
              <Camera size={12} color="#fff" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEditUserName}
            style={styles.nameRow}
            activeOpacity={0.7}
          >
            <Text style={[styles.userName, { color: theme.textPrimary }]}>
              {userName || 'המשתמש שלי'}
            </Text>
            <Pencil size={13} color={theme.textTertiary} strokeWidth={2} />
          </TouchableOpacity>

          {user?.email && (
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
          )}
        </View>
        {/* Premium Card - Apple Style with Subtle Gradient */}
        <TouchableOpacity
          style={styles.premiumCard}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsPremiumModalOpen(true);
          }}
          activeOpacity={0.92}
        >
          <LinearGradient
            colors={['#FF6B35', '#F7931E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumGradient}
          >
            <View style={styles.premiumContent}>
              <View style={styles.premiumIconContainer}>
                <Crown size={22} color="#fff" strokeWidth={2} />
              </View>
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>שדרג ל-Premium</Text>
                <Text style={styles.premiumSubtitle}>גישה לכל התכונות ודוחות</Text>
              </View>
            </View>
            <Sparkles size={18} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Family Sharing Section - Clean, Minimal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>שיתוף משפחתי</Text>

          {/* Family Card - No Borders, Just Shadow */}
          {family && (
            <View style={[styles.familyCard, { backgroundColor: theme.card }]}>
              <View style={styles.familyCardHeader}>
                <View style={styles.familyCardHeaderLeft}>
                  <Text style={[styles.familyName, { color: theme.textPrimary }]}>
                    משפחת {family.babyName}
                  </Text>
                  <Text style={[styles.familyMembersCount, { color: theme.textSecondary }]}>
                    {members.length || 1} חברים
                  </Text>
          </View>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={handleEditFamilyName}
                    style={styles.editFamilyButton}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Pencil size={13} color={theme.textTertiary} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Current User Status - Minimal */}
              <View style={[styles.userStatusRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                <View style={styles.userStatusLeft}>
                  <View style={[styles.userStatusBadge, { backgroundColor: '#FF6B35' }]}>
                    <Text style={styles.userStatusBadgeText}>
                      {(userName || 'מ').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userStatusInfo}>
                    <Text style={[styles.userStatusName, { color: theme.textPrimary }]}>
                      {userName || 'אני'} (Admin)
                    </Text>
                    <Text style={[styles.userStatusRole, { color: '#FF6B35' }]}>מנהל</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Family Actions - Pure iOS List Style, RTL */}
          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.listItem, styles.listItemFirst]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setInviteModalVisible(true);
                }}
                activeOpacity={0.6}
              >
                <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>הזמנה למשפחה</Text>
                <View style={[styles.listItemIcon, { backgroundColor: '#EEF2FF' }]}>
                  <UserPlus size={16} color="#6366F1" strokeWidth={2} />
                </View>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
            )}

            {isAdmin && (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsGuestInviteOpen(true);
                }}
                activeOpacity={0.6}
              >
                <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>הזמן אורח</Text>
                <View style={[styles.listItemIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Users size={16} color="#10B981" strokeWidth={2} />
        </View>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
            )}

            <TouchableOpacity
              style={[styles.listItem, styles.listItemLast]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setJoinModalVisible(true);
              }}
              activeOpacity={0.6}
            >
              <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
              <Text style={[styles.listItemText, { color: theme.textPrimary }]}>הצטרף עם קוד</Text>
              <View style={[styles.listItemIcon, { backgroundColor: '#FFF7ED' }]}>
                <LinkIcon size={16} color="#F59E0B" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Guest Invite Modal */}
      {family && (
        <GuestInviteModal
          visible={isGuestInviteOpen}
          onClose={() => setIsGuestInviteOpen(false)}
          familyId={family.id}
        />
      )}

      {/* Family Invite Modal */}
      {baby?.id && (
        <InviteFamilyModal
          visible={inviteModalVisible}
          onClose={() => setInviteModalVisible(false)}
          babyId={baby.id}
          babyName={baby.name || 'הילד'}
        />
      )}

      <JoinFamilyModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
      />

      {/* Edit Basic Info Modal */}
      <EditBasicInfoModal
        visible={isEditBasicInfoOpen}
        initialData={{
          name: baby?.name || '',
          gender: baby?.gender || 'boy',
          birthDate: birthDateObj,
        }}
        onSave={handleSaveBasicInfo}
        onClose={() => setIsEditBasicInfoOpen(false)}
      />

      {/* Premium Modal - Apple Style */}
      <Modal
        visible={isPremiumModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPremiumModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                style={styles.modalIconContainer}
              >
                <Crown size={28} color="#fff" strokeWidth={2} />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                CalmParent Premium
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                גישה מלאה לכל התכונות המתקדמות
              </Text>
            </View>

            {/* Plans */}
            <View style={styles.plansContainer}>
              {/* Monthly */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === 'monthly' ? theme.primary : theme.divider,
                    backgroundColor: selectedPlan === 'monthly' ? theme.primaryLight : theme.background,
                  },
                ]}
                onPress={() => {
                  setSelectedPlan('monthly');
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.planDuration, { color: theme.textPrimary }]}>חודשי</Text>
                <Text style={[styles.planPrice, { color: theme.textPrimary }]}>₪19.90</Text>
                <Text style={[styles.planPer, { color: theme.textSecondary }]}>לחודש</Text>
              </TouchableOpacity>

              {/* Yearly */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === 'yearly' ? theme.primary : theme.divider,
                    backgroundColor: selectedPlan === 'yearly' ? theme.primaryLight : theme.background,
                  },
                ]}
                onPress={() => {
                  setSelectedPlan('yearly');
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>חסכון 40%</Text>
                </View>
                <Text style={[styles.planDuration, { color: theme.textPrimary }]}>שנתי</Text>
                <Text style={[styles.planPrice, { color: theme.textPrimary }]}>₪139</Text>
                <Text style={[styles.planPer, { color: theme.textSecondary }]}>לשנה (₪11.60/חודש)</Text>
              </TouchableOpacity>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  דוחות מפורטים ותובנות חכמות
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  ייצוא נתונים ל-PDF ואקסל
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  שיתוף ללא הגבלה למשפחה ובייביסיטר
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  גיבוי אוטומטי ותמיכה VIP
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Star size={18} color="#FF6B35" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  ללא פרסומות לעולם
                </Text>
              </View>
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('בקרוב!', 'רכישת Premium תתאפשר בקרוב 🎉');
                setIsPremiumModalOpen(false);
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subscribeButtonGradient}
              >
                <Text style={styles.subscribeButtonText}>
                  {selectedPlan === 'yearly' ? 'הירשם ל-Premium שנתי' : 'הירשם ל-Premium חודשי'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Close */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsPremiumModalOpen(false)}
              activeOpacity={0.6}
            >
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>אולי אחר כך</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  settingsButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 0,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  premiumCard: {
    marginTop: 20,
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  premiumGradient: {
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  premiumIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
    letterSpacing: 0.38,
  },
  premiumSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.15,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.08,
    marginBottom: 12,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  familyCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  familyCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  familyCardHeaderLeft: {
    alignItems: 'flex-end',
    flex: 1,
  },
  familyName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.41,
  },
  familyMembersCount: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
  },
  editFamilyButton: {
    padding: 6,
  },
  userStatusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
  userStatusLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userStatusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userStatusBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  userStatusInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  userStatusName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.24,
  },
  userStatusRole: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
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
  listItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listItemText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
    textAlign: 'right',
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
    alignItems: 'center',
    marginBottom: 28,
  },
  modalIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.36,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  plansContainer: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 28,
  },
  planCard: {
    flex: 1,
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
  },
  planBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.07,
  },
  planDuration: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.24,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.36,
  },
  planPer: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
  },
  featuresContainer: {
    gap: 14,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.32,
  },
  subscribeButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  subscribeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
});

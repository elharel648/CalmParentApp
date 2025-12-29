import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Alert, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Settings, Camera, User, Pencil, Crown, Sparkles, Check, Star, ChevronLeft, UserPlus, Link as LinkIcon, Trash2, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

// Hooks
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const { activeChild, refreshChildren } = useActiveChild();
  const { baby, updateBasicInfo, updatePhoto, refresh } = useBabyProfile(activeChild?.childId);
  const { family, members, rename: renameFamily, isAdmin, remove: removeMember, leave: leaveFamily } = useFamily();
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
      return t('age.days', { count: days });
    }
    if (babyAgeMonths < 12) return t('age.months', { count: babyAgeMonths });
    const years = Math.floor(babyAgeMonths / 12);
    const months = babyAgeMonths % 12;
    return months > 0 ? t('age.yearsMonths', { count: years, months }) : t('age.years', { count: years });
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
        t('account.editFamilyName'),
        t('account.enterNewFamilyName'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.save'),
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
      Alert.alert(t('account.editFamilyName'), t('account.editFamilyNameIOS'));
    }
  }, [family?.babyName, renameFamily]);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleRemoveMember = useCallback((memberId: string, memberName: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'הסרת חבר',
      `להסיר את ${memberName} מהמשפחה?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הסר',
          style: 'destructive',
          onPress: async () => {
            const success = await removeMember(memberId);
            if (success && Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, [removeMember]);

  const handleLeaveFamily = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'עזיבת משפחה',
      'האם אתה בטוח שברצונך לעזוב את המשפחה? תאבד גישה לכל הנתונים המשותפים.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'עזוב',
          style: 'destructive',
          onPress: async () => {
            const success = await leaveFamily();
            if (success) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              refreshChildren();
            }
          },
        },
      ]
    );
  }, [leaveFamily, refreshChildren]);

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
        Alert.alert(t('account.error'), t('account.couldNotSavePhoto'));
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
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('account.title')}</Text>
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
              <View style={[styles.avatarPlaceholder, { backgroundColor: '#EEF2FF' }]}>
                <User size={48} color="#6366F1" strokeWidth={1.5} />
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
              {userName || t('account.myUser')}
            </Text>
            <Pencil size={13} color={theme.textTertiary} strokeWidth={2} />
          </TouchableOpacity>

          {user?.email && (
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
          )}
        </View>
        {/* Premium Card - Apple Style with Subtle Gradient */}
        <View style={styles.section}>
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
                  <Text style={styles.premiumTitle}>{t('account.upgradePremium')}</Text>
                  <Text style={styles.premiumSubtitle}>{t('account.premiumSubtitle')}</Text>
                </View>
              </View>
              <Sparkles size={18} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Family Section - Unified, Clean Design */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('account.family')}</Text>

          {/* Family Info Card - Only if in a family */}
          {family && (
            <View style={[styles.familyInfoCard, { backgroundColor: theme.card }]}>
              <View style={styles.familyInfoHeader}>
                <View style={styles.familyInfoLeft}>
                  <View style={[styles.familyInfoAvatar, { backgroundColor: '#6366F1' }]}>
                    <Users size={18} color="#fff" strokeWidth={2} />
                  </View>
                  <View style={styles.familyInfoText}>
                    <Text style={[styles.familyInfoName, { color: theme.textPrimary }]}>
                      {t('premium.familyOf')} {family.babyName}
                    </Text>
                    <Text style={[styles.familyInfoCount, { color: theme.textSecondary }]}>
                      {members.length || 1} {t('premium.members')}
                    </Text>
                  </View>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={handleEditFamilyName}
                    style={styles.editFamilyButton}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Pencil size={14} color={theme.textTertiary} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Members List */}
              <View style={styles.membersList}>
                {members.map((member, index) => {
                  const isMe = member.id === auth.currentUser?.uid;
                  const roleConfig = {
                    admin: { label: 'מנהל', color: '#F59E0B' },
                    member: { label: 'חבר', color: '#6366F1' },
                    viewer: { label: 'צופה', color: '#10B981' },
                    guest: { label: 'אורח', color: '#F59E0B' },
                  }[member.role] || { label: 'חבר', color: '#6366F1' };

                  return (
                    <View key={member.id || index} style={[styles.memberRow, { borderTopColor: theme.divider }]}>
                      {/* Remove button - only for admin, not for self */}
                      {isAdmin && !isMe && member.id && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member.id!, member.name || 'חבר')}
                          style={styles.removeButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                      <View style={[styles.memberBadge, { backgroundColor: roleConfig.color + '20' }]}>
                        <Text style={[styles.memberBadgeText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: theme.textPrimary }]}>
                          {member.name || 'משתמש'}{isMe ? ' (אני)' : ''}
                        </Text>
                        {member.email && (
                          <Text style={[styles.memberEmail, { color: theme.textSecondary }]}>{member.email}</Text>
                        )}
                      </View>
                      <View style={[styles.memberAvatar, { backgroundColor: roleConfig.color + '20' }]}>
                        <Text style={[styles.memberInitial, { color: roleConfig.color }]}>
                          {(member.name || 'מ').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Family Actions - Premium Minimalist Design */}
          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            {/* Show Create/Invite Family when: user is admin OR user has no family */}
            {(isAdmin || !family) && (
              <>
                <TouchableOpacity
                  style={[styles.listItem, styles.listItemFirst]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setInviteModalVisible(true);
                  }}
                  activeOpacity={0.6}
                >
                  <View style={styles.listItemContent}>
                    <View style={[styles.listItemIcon, { backgroundColor: '#EEF2FF' }]}>
                      <UserPlus size={18} color="#6366F1" strokeWidth={2.5} />
                    </View>
                    <View style={styles.listItemTextContainer}>
                      <Text style={[styles.listItemText, { color: theme.textPrimary }]}>
                        {family ? t('account.inviteFamily') : t('account.createFamily')}
                      </Text>
                      <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                        {family ? t('account.inviteFamily.subtitle') : t('account.createFamily.subtitle')}
                      </Text>
                    </View>
                  </View>
                  <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
                </TouchableOpacity>

                <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
              </>
            )}

            {/* Guest invite - any family member can invite (24h access is low risk) */}
            {family && (
              <>
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsGuestInviteOpen(true);
                  }}
                  activeOpacity={0.6}
                >
                  <View style={styles.listItemContent}>
                    <View style={[styles.listItemIcon, { backgroundColor: '#ECFDF5' }]}>
                      <Users size={18} color="#10B981" strokeWidth={2.5} />
                    </View>
                    <View style={styles.listItemTextContainer}>
                      <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('account.inviteGuest')}</Text>
                      <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                        {t('account.inviteGuest.subtitle')}
                      </Text>
                    </View>
                  </View>
                  <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
                <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
              </>
            )}

            <TouchableOpacity
              style={[styles.listItem, styles.listItemLast]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setJoinModalVisible(true);
              }}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FFF7ED' }]}>
                  <LinkIcon size={18} color="#F59E0B" strokeWidth={2.5} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('account.joinWithCode')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    {t('account.joinWithCode.subtitle')}
                  </Text>
                </View>
              </View>
              <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Leave Family - for non-admin members only */}
          {family && !isAdmin && (
            <View style={[styles.listContainer, { backgroundColor: theme.card, marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.listItem, styles.listItemFirst, styles.listItemLast]}
                onPress={handleLeaveFamily}
                activeOpacity={0.6}
              >
                <View style={styles.listItemContent}>
                  <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                    <LogOut size={18} color="#EF4444" strokeWidth={2.5} />
                  </View>
                  <View style={styles.listItemTextContainer}>
                    <Text style={[styles.listItemText, { color: '#EF4444' }]}>עזוב משפחה</Text>
                    <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                      יניתק אותך מהמשפחה המשותפת
                    </Text>
                  </View>
                </View>
                <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
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
          babyName={baby.name || t('account.theChild')}
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
                <Text style={[styles.planDuration, { color: theme.textPrimary }]}>{t('account.monthly')}</Text>
                <Text style={[styles.planPrice, { color: theme.textPrimary }]}>₪19.90</Text>
                <Text style={[styles.planPer, { color: theme.textSecondary }]}>{t('account.perMonth')}</Text>
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
                  <Text style={styles.planBadgeText}>{t('account.save40')}</Text>
                </View>
                <Text style={[styles.planDuration, { color: theme.textPrimary }]}>{t('account.yearly')}</Text>
                <Text style={[styles.planPrice, { color: theme.textPrimary }]}>₪139</Text>
                <Text style={[styles.planPer, { color: theme.textSecondary }]}>{t('account.perYear')}</Text>
              </TouchableOpacity>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.detailedReports')}
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.exportData')}
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.unlimitedSharing')}
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.autoBackup')}
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Star size={18} color="#FF6B35" strokeWidth={2.5} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.noAds')}
                </Text>
              </View>
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(t('premium.comingSoon'), t('premium.comingSoonMessage'));
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
                  {selectedPlan === 'yearly' ? t('premium.subscribeYearly') : t('premium.subscribeMonthly')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Close */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsPremiumModalOpen(false)}
              activeOpacity={0.6}
            >
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>{t('account.maybeLater')}</Text>
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
  policySubtitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  premiumSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.15,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'right',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  // Family Info Card - Clean, Minimal
  familyInfoCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  familyInfoHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  familyInfoLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  familyInfoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyInfoText: {
    alignItems: 'flex-end',
    flex: 1,
  },
  familyInfoName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  familyInfoCount: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.2,
    opacity: 0.7,
  },
  editFamilyButton: {
    padding: 8,
    borderRadius: 8,
  },
  membersList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  memberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  removeButton: {
    padding: 6,
    marginLeft: 4,
  },
  memberInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.7,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
    minHeight: 64,
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
    flex: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listItemTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'right',
    marginBottom: 2,
  },
  listItemSubtext: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.2,
    textAlign: 'right',
    opacity: 0.7,
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

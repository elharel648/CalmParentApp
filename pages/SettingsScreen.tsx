import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Settings, Edit2, Camera, Baby, User, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

// Hooks
import { useTheme } from '../context/ThemeContext';
import { useFamily } from '../hooks/useFamily';
import { useActiveChild } from '../context/ActiveChildContext';
import { useBabyProfile } from '../hooks/useBabyProfile';
import { auth } from '../services/firebaseConfig';

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
  const { family } = useFamily();
  const user = auth.currentUser;

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [isGuestInviteOpen, setIsGuestInviteOpen] = useState(false);
  const [isEditBasicInfoOpen, setIsEditBasicInfoOpen] = useState(false);

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

  // Get gender icon instead of emoji
  const getGenderIcon = () => {
    const color = baby?.gender === 'girl' ? '#EC4899' : '#60A5FA';
    return <User size={28} color={color} strokeWidth={1.5} />;
  };

  const handleEditPhoto = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updatePhoto('profile');
    // Refresh the global context so photo updates everywhere
    await refreshChildren();
  }, [updatePhoto, refreshChildren]);

  const handleSaveBasicInfo = useCallback(async (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => {
    await updateBasicInfo(data);
    setIsEditBasicInfoOpen(false);
    refresh();
  }, [updateBasicInfo, refresh]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'light'} />

      {/* Header with Settings Button on RIGHT side */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={{ width: 40 }} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>חשבון</Text>
          </View>
          <TouchableOpacity
            onPress={handleSettingsPress}
            style={styles.settingsBtn}
            activeOpacity={0.7}
          >
            <Settings size={20} color="#8B5CF6" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Minimalist Profile Section - Centered */}
        <View style={styles.minimalProfileSection}>
          {/* Edit Button - Top Left */}
          <TouchableOpacity
            style={styles.minimalEditBtn}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setIsEditBasicInfoOpen(true);
            }}
          >
            <Edit2 size={18} color="#9CA3AF" strokeWidth={2} />
          </TouchableOpacity>

          {/* Avatar - Centered */}
          <TouchableOpacity onPress={handleEditPhoto} style={styles.minimalAvatarContainer}>
            {baby?.photoUrl ? (
              <Image source={{ uri: baby.photoUrl }} style={styles.minimalAvatar} />
            ) : (
              <View style={styles.minimalAvatarPlaceholder}>
                <User size={44} color="#9CA3AF" strokeWidth={1.5} />
              </View>
            )}
            {/* Camera Badge */}
            <View style={styles.minimalCameraBadge}>
              <Camera size={14} color="#fff" strokeWidth={2} />
            </View>
          </TouchableOpacity>

          {/* Name - Below Avatar */}
          <Text style={[styles.minimalName, { color: theme.textPrimary }]}>
            {baby?.name || 'הילד שלי'}
          </Text>

          {/* Email */}
          {user?.email && (
            <Text style={styles.minimalEmail}>{user.email}</Text>
          )}
        </View>

        {/* Family Sharing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={18} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>שיתוף משפחתי</Text>
          </View>
          <FamilyMembersCard
            onInvitePress={() => setInviteModalVisible(true)}
            onJoinPress={() => setJoinModalVisible(true)}
            onGuestInvitePress={family ? () => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsGuestInviteOpen(true);
            } : undefined}
          />
        </View>

      </ScrollView>


      {/* Guest Invite Modal */}
      {baby?.id && family && (
        <GuestInviteModal
          visible={isGuestInviteOpen}
          onClose={() => setIsGuestInviteOpen(false)}
          childId={baby.id}
          childName={baby.name || 'הילד'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
  // Profile Card Styles
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginRight: 14,
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  profileAge: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    marginBottom: 2,
  },
  profileDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  editProfileBtn: {
    padding: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  // Premium Account Card Styles
  premiumAccountCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  premiumAvatarContainer: {
    position: 'relative' as const,
  },
  premiumAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  premiumAvatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  editBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumInfoSection: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-end' as const,
  },
  premiumChildName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 6,
  },
  ageBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  ageBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  birthDateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  editDetailsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Email Card Styles
  emailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row-reverse' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emailInfo: {
    flex: 1,
    marginRight: 14,
    alignItems: 'flex-end' as const,
  },
  emailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  // Minimalist Profile Styles
  minimalProfileSection: {
    alignItems: 'center' as const,
    paddingVertical: 20,
    marginBottom: 24,
    position: 'relative' as const,
  },
  minimalEditBtn: {
    position: 'absolute' as const,
    top: 20,
    left: 0,
    padding: 8,
  },
  minimalAvatarContainer: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  minimalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  minimalAvatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  minimalAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  minimalCameraBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 3,
    borderColor: '#F9FAFB',
  },
  minimalName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  minimalAge: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#6366F1',
    marginBottom: 8,
  },
  minimalEmail: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
});

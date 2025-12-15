import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit2, TrendingUp, Award, Sparkles, ChevronRight, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Custom Hooks
import { useBabyProfile } from '../hooks/useBabyProfile';
import { useMilestones } from '../hooks/useMilestones';

// Components
import {
  AlbumCarousel,
  GrowthSection,
  MilestoneTimeline,
  EditMetricModal,
  MilestoneModal,
  EditBasicInfoModal,
} from '../components/Profile';

// Types
import { EditMetricState, Milestone } from '../types/profile';

export default function ProfileScreen() {
  const navigation = useNavigation();

  const {
    baby,
    loading,
    babyAgeMonths,
    birthDateObj,
    refresh,
    updatePhoto,
    updateStats,
    updateBasicInfo,
  } = useBabyProfile();

  const { addNew: addMilestone, remove: removeMilestone } = useMilestones();

  const [editMetric, setEditMetric] = useState<EditMetricState | null>(null);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [isEditBasicInfoOpen, setIsEditBasicInfoOpen] = useState(false);

  const handleSaveMetric = useCallback(async (value: string) => {
    if (!editMetric) return;
    await updateStats(editMetric.type, value);
    setEditMetric(null);
  }, [editMetric, updateStats]);

  const handleAddMilestone = useCallback(async (title: string, date: Date) => {
    if (!baby?.id) return;
    await addMilestone(baby.id, title, date);
    refresh();
  }, [baby?.id, addMilestone, refresh]);

  const handleDeleteMilestone = useCallback((milestone: Milestone) => {
    if (!baby?.id) return;
    removeMilestone(baby.id, milestone, refresh);
  }, [baby?.id, removeMilestone, refresh]);

  const handleSaveBasicInfo = useCallback(async (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => {
    await updateBasicInfo(data);
    setIsEditBasicInfoOpen(false);
    refresh();
  }, [updateBasicInfo, refresh]);

  const handleEditPhoto = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updatePhoto('profile');
  }, [updatePhoto]);

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

  const getGenderEmoji = () => {
    if (baby?.gender === 'boy') return '👶';
    if (baby?.gender === 'girl') return '👧';
    return '🧒';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronRight size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פרופיל</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleEditPhoto} style={styles.avatarContainer}>
            {baby?.photoUrl ? (
              <Image source={{ uri: baby.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>{getGenderEmoji()}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Camera size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{baby?.name || 'הילד שלי'}</Text>
            <Text style={styles.profileAge}>{getAgeDisplay()}</Text>
            <Text style={styles.profileDate}>{birthDateObj.toLocaleDateString('he-IL')}</Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setIsEditBasicInfoOpen(true);
            }}
          >
            <Edit2 size={14} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Growth Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>מעקב גדילה</Text>
          </View>
          <GrowthSection
            stats={baby?.stats}
            onEditWeight={() => setEditMetric({ type: 'weight', value: baby?.stats?.weight || '', title: 'משקל', unit: 'ק״ג' })}
            onEditHeight={() => setEditMetric({ type: 'height', value: baby?.stats?.height || '', title: 'גובה', unit: 'ס״מ' })}
            onEditHead={() => setEditMetric({ type: 'head', value: baby?.stats?.headCircumference || '', title: 'היקף ראש', unit: 'ס״מ' })}
          />
        </View>

        {/* Milestones Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>אבני דרך</Text>
            <TouchableOpacity
              style={styles.addTextBtn}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setIsMilestoneOpen(true);
              }}
            >
              <Text style={styles.addText}>+ הוסף</Text>
            </TouchableOpacity>
          </View>
          <MilestoneTimeline
            milestones={baby?.milestones}
            birthDate={baby?.birthDate}
            onAdd={() => setIsMilestoneOpen(true)}
            onDelete={handleDeleteMilestone}
          />
        </View>

        {/* Magical Moments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={18} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>רגעים קסומים</Text>
          </View>
          <AlbumCarousel
            album={baby?.album}
            onMonthPress={(month) => updatePhoto('album', month)}
          />
        </View>

      </ScrollView>

      {/* Modals */}
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

      <EditMetricModal
        visible={!!editMetric}
        title={editMetric?.title || ''}
        unit={editMetric?.unit || ''}
        initialValue={editMetric?.value || ''}
        onSave={handleSaveMetric}
        onClose={() => setEditMetric(null)}
      />

      <MilestoneModal
        visible={isMilestoneOpen}
        onAdd={handleAddMilestone}
        onClose={() => setIsMilestoneOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 24,
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
  // Sections
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
  addTextBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
});
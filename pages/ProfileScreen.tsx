import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Custom Hooks
import { useBabyProfile } from '../hooks/useBabyProfile';
import { useMilestones } from '../hooks/useMilestones';

// Components
import {
  ProfileHeader,
  StatsOverlay,
  AlbumCarousel,
  GrowthSection,
  MilestoneTimeline,
  EditMetricModal,
  MilestoneModal,
} from '../components/Profile';

// Types
import { EditMetricState, Milestone } from '../types/profile';

/**
 * ProfileScreen - Baby profile with modular architecture
 * Reduced from 514 lines to ~160 lines
 */
export default function ProfileScreen() {
  const navigation = useNavigation();

  // --- Custom Hooks ---
  const {
    baby,
    loading,
    babyAgeMonths,
    birthDateObj,
    refresh,
    updatePhoto,
    updateBirthDate,
    updateStats,
  } = useBabyProfile();

  const { addNew: addMilestone, remove: removeMilestone } = useMilestones();

  // --- Local State (Modals only) ---
  const [editMetric, setEditMetric] = useState<EditMetricState | null>(null);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);

  // --- Handlers ---
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

  const handleBirthDateChange = useCallback(async (event: any, date?: Date) => {
    setShowBirthDatePicker(false);
    if (date) {
      await updateBirthDate(date);
    }
  }, [updateBirthDate]);

  // --- Loading State ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header with Stats Overlay */}
      <View style={styles.headerWrapper}>
        <ProfileHeader
          babyName={baby?.name || ''}
          babyAgeMonths={babyAgeMonths}
          photoUrl={baby?.photoUrl}
          onSettingsPress={() => navigation.navigate('הגדרות' as never)}
          onBackPress={() => navigation.goBack()}
          onPhotoPress={() => updatePhoto('profile')}
          onAgePress={() => setShowBirthDatePicker(true)}
        />
        <StatsOverlay
          weight={baby?.stats?.weight}
          height={baby?.stats?.height}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AlbumCarousel
          album={baby?.album}
          onMonthPress={(month) => updatePhoto('album', month)}
        />

        <GrowthSection
          stats={baby?.stats}
          onEditWeight={() => setEditMetric({ type: 'weight', value: baby?.stats?.weight || '', title: 'עדכון משקל', unit: 'ק״ג' })}
          onEditHeight={() => setEditMetric({ type: 'height', value: baby?.stats?.height || '', title: 'עדכון גובה', unit: 'ס״מ' })}
          onEditHead={() => setEditMetric({ type: 'head', value: baby?.stats?.headCircumference || '', title: 'עדכון היקף ראש', unit: 'ס״מ' })}
        />

        <MilestoneTimeline
          milestones={baby?.milestones}
          birthDate={baby?.birthDate}
          onAdd={() => setIsMilestoneOpen(true)}
          onDelete={handleDeleteMilestone}
        />
      </ScrollView>

      {/* Modals */}
      {showBirthDatePicker && (
        <DateTimePicker
          value={birthDateObj}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleBirthDateChange}
        />
      )}

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
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWrapper: {
    position: 'relative',
    marginBottom: 40,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 10,
  },
});
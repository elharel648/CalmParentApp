import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Check, User, ChevronLeft, ChevronRight, Sparkles, Heart, Baby, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { saveBabyProfile } from '../services/babyService';

const { width, height } = Dimensions.get('window');

type BabyProfileScreenProps = {
  onProfileSaved: () => void;
  onSkip?: () => void;
  onClose?: () => void; // For closing the screen with X button
};

export default function BabyProfileScreen({ onProfileSaved, onSkip, onClose }: BabyProfileScreenProps) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [gender, setGender] = useState<'boy' | 'girl' | 'other'>('boy');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    // Pulse animation for button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('אופס...', 'שכחת לכתוב את השם 😊');
      return;
    }

    setLoading(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveBabyProfile(name, birthDate, gender);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('איזה כיף! 🎉', `ברוכים הבאים ${name} למשפחת CalmParent!`, [
        { text: 'בואו נתחיל!', onPress: onProfileSaved }
      ]);
    } catch (error) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('שגיאה', 'משהו השתבש, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGenderSelect = (selected: 'boy' | 'girl') => {
    setGender(selected);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isFormValid = name.trim().length > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Beautiful gradient background */}
      <LinearGradient
        colors={['#fdfbf7', '#f5f3ff', '#ede9fe', '#e0e7ff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />

      {/* Close button (X) */}
      {onClose && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <X size={22} color="#6B7280" />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Animated.View style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}>

            {/* Header with icon */}
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Baby size={28} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </View>
            </View>

            <Text style={styles.mainTitle}>רישום ילד חדש</Text>
            <Text style={styles.subTitle}>נא למלא את הפרטים הבאים</Text>

            {/* Name Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>שם הילד</Text>
                <View style={styles.cardIconBg}>
                  <User size={16} color="#6366F1" strokeWidth={2.5} />
                </View>
              </View>
              <TextInput
                style={styles.input}
                placeholder="הקלידו את השם..."
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                textAlign="right"
                autoFocus
              />
              {name.length > 0 && (
                <View style={styles.checkBadge}>
                  <Check size={14} color="#10B981" strokeWidth={3} />
                </View>
              )}
            </View>

            {/* Birth Date Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>תאריך לידה</Text>
                <Calendar size={18} color="#6B7280" strokeWidth={2} />
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <ChevronRight size={18} color="#6B7280" />
                <Text style={styles.dateText}>
                  {birthDate.toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="spinner"
                locale="he"
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            )}

            {/* Gender Selection */}
            <Text style={styles.sectionTitle}>מין הילד</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderCard, gender === 'girl' && styles.genderCardGirlActive]}
                onPress={() => handleGenderSelect('girl')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gender === 'girl' ? ['#FCE7F3', '#FDF2F8'] : ['#F9FAFB', '#F9FAFB']}
                  style={styles.genderGradient}
                >
                  <View style={[styles.genderIconCircle, { backgroundColor: gender === 'girl' ? '#EC4899' : '#E5E7EB' }]}>
                    <User size={20} color="#fff" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.genderText, gender === 'girl' && styles.genderTextActive]}>בת</Text>
                  {gender === 'girl' && (
                    <View style={[styles.genderBadge, { backgroundColor: '#EC4899' }]}>
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.genderCard, gender === 'boy' && styles.genderCardBoyActive]}
                onPress={() => handleGenderSelect('boy')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gender === 'boy' ? ['#DBEAFE', '#EFF6FF'] : ['#F9FAFB', '#F9FAFB']}
                  style={styles.genderGradient}
                >
                  <View style={[styles.genderIconCircle, { backgroundColor: gender === 'boy' ? '#3B82F6' : '#E5E7EB' }]}>
                    <User size={20} color="#fff" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.genderText, gender === 'boy' && styles.genderTextActive]}>בן</Text>
                  {gender === 'boy' && (
                    <View style={[styles.genderBadge, { backgroundColor: '#3B82F6' }]}>
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <Animated.View style={[styles.submitContainer, { transform: [{ scale: isFormValid ? pulseAnim : 1 }] }]}>
              <TouchableOpacity
                style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
                onPress={handleSave}
                disabled={loading || !isFormValid}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isFormValid ? ['#6366F1', '#4F46E5'] : ['#9CA3AF', '#9CA3AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <ChevronRight size={22} color="#fff" />
                      <Text style={styles.submitText}>שמירה והמשך</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Bottom tip */}
            <View style={styles.tipContainer}>
              <Heart size={14} color="#EC4899" />
              <Text style={styles.tipText}>אפשר לערוך את הפרופיל בהמשך בכל עת</Text>
            </View>

            {/* Skip Button */}
            {onSkip && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>דלג לעכשיו, אמלא אחר כך</Text>
              </TouchableOpacity>
            )}

          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20
  },
  content: {
    paddingTop: 50,
  },

  // Decorative blobs
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  blob1: {
    width: 200,
    height: 200,
    backgroundColor: '#C4B5FD',
    top: -60,
    right: -80,
  },
  blob2: {
    width: 150,
    height: 150,
    backgroundColor: '#FDE68A',
    top: height * 0.3,
    left: -60,
  },
  blob3: {
    width: 120,
    height: 120,
    backgroundColor: '#FBCFE8',
    bottom: 100,
    right: -40,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  logoGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 4,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  cardIconBg: {
    width: 36,
    height: 36,
    color: '#374151',
  },

  input: {
    fontSize: 20,
    color: '#1F2937',
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  checkBadge: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
  },

  // Gender
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  genderCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderCardBoyActive: {
    borderColor: '#3B82F6',
  },
  genderCardGirlActive: {
    borderColor: '#EC4899',
  },
  genderGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    position: 'relative',
  },
  genderIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  genderTextActive: {
    color: '#1F2937',
  },
  genderBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Submit
  submitContainer: {
    marginBottom: 24,
  },
  submitButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  gradientBtn: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
  },

  // Tip
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Skip Button
  skipButton: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});
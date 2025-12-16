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
import { Calendar, Check, User, ChevronLeft, Sparkles, Heart, Baby } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { saveBabyProfile } from '../services/babyService';

const { width, height } = Dimensions.get('window');

type BabyProfileScreenProps = {
  onProfileSaved: () => void;
  onSkip?: () => void;
};

export default function BabyProfileScreen({ onProfileSaved, onSkip }: BabyProfileScreenProps) {
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
              <View style={styles.iconCircle}>
                <Baby size={36} color="#6366F1" />
              </View>
              <View style={styles.sparkleContainer}>
                <Sparkles size={20} color="#F59E0B" />
              </View>
            </View>

            <Text style={styles.mainTitle}>היי הורים! 👋</Text>
            <Text style={styles.subTitle}>בואו נכיר את התוספת החדשה והמתוקה למשפחה</Text>

            {/* Name Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBg}>
                  <User size={18} color="#6366F1" />
                </View>
                <Text style={styles.cardLabel}>איך קוראים לנסיך/ה?</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="הקלידו את השם כאן..."
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                textAlign="right"
                autoFocus
              />
              {name.length > 0 && (
                <View style={styles.checkBadge}>
                  <Check size={14} color="#10B981" />
                </View>
              )}
            </View>

            {/* Birth Date Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Calendar size={18} color="#F59E0B" />
                </View>
                <Text style={styles.cardLabel}>תאריך לידה</Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dateText}>{birthDate.toLocaleDateString('he-IL')}</Text>
                <ChevronLeft size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            )}

            {/* Gender Selection */}
            <Text style={styles.sectionTitle}>מין היילוד</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderCard, gender === 'boy' && styles.genderCardBoyActive]}
                onPress={() => handleGenderSelect('boy')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gender === 'boy' ? ['#DBEAFE', '#EFF6FF'] : ['#FFFFFF', '#FFFFFF']}
                  style={styles.genderGradient}
                >
                  <Text style={styles.genderEmoji}>👶</Text>
                  <Text style={[styles.genderText, gender === 'boy' && styles.genderTextActive]}>בן</Text>
                  {gender === 'boy' && (
                    <View style={[styles.genderBadge, { backgroundColor: '#3B82F6' }]}>
                      <Check size={12} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.genderCard, gender === 'girl' && styles.genderCardGirlActive]}
                onPress={() => handleGenderSelect('girl')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gender === 'girl' ? ['#FCE7F3', '#FDF2F8'] : ['#FFFFFF', '#FFFFFF']}
                  style={styles.genderGradient}
                >
                  <Text style={styles.genderEmoji}>👧</Text>
                  <Text style={[styles.genderText, gender === 'girl' && styles.genderTextActive]}>בת</Text>
                  {gender === 'girl' && (
                    <View style={[styles.genderBadge, { backgroundColor: '#EC4899' }]}>
                      <Check size={12} color="#fff" />
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
                      <Text style={styles.submitText}>שמירה והמשך</Text>
                      <ChevronLeft size={22} color="#fff" />
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
    paddingBottom: 50
  },
  content: {
    paddingTop: 80,
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

  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    right: width * 0.25,
  },

  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1E1B4B',
    marginBottom: 12,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
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
    paddingVertical: 24,
    alignItems: 'center',
    position: 'relative',
  },
  genderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  genderText: {
    fontSize: 18,
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
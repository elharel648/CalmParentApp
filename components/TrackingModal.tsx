import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated as RNAnimated, ScrollView, Alert } from 'react-native';
import { X, Check, Droplets, Play, Pause, Baby, Moon, Utensils, Apple, Milk, Plus, Minus, Calendar, ChevronLeft, ChevronRight, Clock, Hourglass, Timer, MessageSquare, Sparkles, Layers } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useFoodTimer } from '../context/FoodTimerContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

interface TrackingModalProps {
  visible: boolean;
  type: 'food' | 'sleep' | 'diaper' | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
}

// TYPE_CONFIG will be created inside component to use translations

export default function TrackingModal({ visible, type, onClose, onSave }: TrackingModalProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const foodTimerContext = useFoodTimer();

  // Get translated TYPE_CONFIG
  const TYPE_CONFIG = {
    food: {
      title: t('tracking.food.title'),
      icon: Utensils,
      gradient: ['#FDF6E3', '#FCEFC7'] as [string, string],
      accent: '#E5B85C',
    },
    sleep: {
      title: t('tracking.sleep.title'),
      icon: Moon,
      gradient: ['#E0E7FF', '#C7D2FE'] as [string, string],
      accent: '#6366F1',
    },
    diaper: {
      title: t('tracking.diaper.title'),
      icon: Baby,
      gradient: ['#D1FAE5', '#A7F3D0'] as [string, string],
      accent: '#10B981',
    },
  };

  // --- Food States ---
  const [foodType, setFoodType] = useState<'bottle' | 'breast' | 'pumping' | 'solids'>('bottle');
  const [bottleAmount, setBottleAmount] = useState('');
  const [pumpingAmount, setPumpingAmount] = useState('');
  const [solidsFoodName, setSolidsFoodName] = useState('');
  const [foodNote, setFoodNote] = useState('');

  // Food Time States - using Date objects for picker
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Selected Date for logging past/future entries
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // Breastfeeding now uses FoodTimerContext (leftTimer, rightTimer, activeSide derived below)

  // --- Sleep States (Manual entry) ---
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [sleepNote, setSleepNote] = useState('');
  const sleepContext = useSleepTimer();

  // --- Diaper States ---
  const [subType, setSubType] = useState<string | null>(null);
  const [diaperNote, setDiaperNote] = useState('');

  // Save success state for checkmark animation
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Apple-style Animations
  const slideAnim = useRef(new RNAnimated.Value(400)).current;
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset local state only (not breastfeeding timer which should persist)
      setSubType(null);
      setBottleAmount('');
      setPumpingAmount('');
      setSolidsFoodName('');
      setFoodNote('');
      // Note: breastfeeding and pumping timers use global context and should NOT be reset here
      setSleepHours(0);
      setSleepMinutes(30);
      setSleepNote('');
      setDiaperNote('');

      // Apple-style sheet animation
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, slideAnim, backdropAnim]);

  // Breastfeeding uses separate timer in FoodTimerContext
  const leftTimer = foodTimerContext.leftBreastTime + (foodTimerContext.breastActiveSide === 'left' && foodTimerContext.breastIsRunning ? foodTimerContext.breastElapsedSeconds : 0);
  const rightTimer = foodTimerContext.rightBreastTime + (foodTimerContext.breastActiveSide === 'right' && foodTimerContext.breastIsRunning ? foodTimerContext.breastElapsedSeconds : 0);
  const activeSide = foodTimerContext.breastActiveSide;

  const toggleBreastTimer = (side: 'left' | 'right') => {
    if (foodTimerContext.breastIsRunning && foodTimerContext.breastActiveSide === side) {
      // Stop current side
      foodTimerContext.stopBreast();
    } else {
      // Start new side (will auto-switch if running)
      foodTimerContext.startBreast(side);
    }
  };

  const togglePumpingTimer = () => {
    if (foodTimerContext.pumpingIsRunning) {
      foodTimerContext.stopPumping();
    } else {
      foodTimerContext.startPumping();
    }
  };

  // Alias for easier access
  const isPumpingActive = foodTimerContext.pumpingIsRunning;
  const pumpingTimer = foodTimerContext.pumpingElapsedSeconds;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSave = async () => {
    if (!type) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    let data: any = { type, timestamp: selectedDate };

    if (type === 'food') {
      if (foodType === 'bottle') {
        data.amount = bottleAmount ? `${bottleAmount} ${t('tracking.ml')}` : t('tracking.notSpecified');
        data.subType = 'bottle';
      } else if (foodType === 'breast') {
        data.note = `${t('tracking.leftColon')}: ${formatTime(leftTimer)} | ${t('tracking.rightColon')}: ${formatTime(rightTimer)}`;
        data.subType = 'breast';
      } else if (foodType === 'pumping') {
        data.amount = pumpingAmount ? `${pumpingAmount} ${t('tracking.ml')}` : t('tracking.notSpecified');
        data.note = pumpingTimer > 0 ? `${t('tracking.pumpingTime')}: ${formatTime(pumpingTimer)}` : undefined;
        data.subType = 'pumping';
      } else if (foodType === 'solids') {
        data.note = solidsFoodName ? (foodNote ? `${solidsFoodName} | ${foodNote}` : solidsFoodName) : (foodNote || t('tracking.solidsFood'));
        data.subType = 'solids';
      }

      // Append general food note if present and not solids (handled above)
      if (foodType !== 'solids' && foodNote) {
        if (data.note) {
          data.note += ` | ${foodNote}`;
        } else {
          data.note = foodNote;
        }
      }
    } else if (type === 'sleep') {
      // Handle different sleep modes
      let durationText = '';

      if (sleepMode === 'timer' && sleepContext.elapsedSeconds > 0) {
        // Timer mode - use elapsed seconds
        durationText = `${t('tracking.sleepDuration')}: ${sleepContext.formatTime(sleepContext.elapsedSeconds)}`;
        data.duration = sleepContext.elapsedSeconds;
        if (sleepContext.isRunning) sleepContext.stop();

      } else if (sleepMode === 'duration') {
        // Duration mode - use hours/minutes
        const totalMinutes = (sleepHours * 60) + sleepMinutes;
        if (totalMinutes > 0) {
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          durationText = `${t('tracking.sleepDuration')}: ${h}:${String(m).padStart(2, '0')}`;
          data.duration = totalMinutes * 60;
        }

      } else if (sleepMode === 'timerange' && sleepStartTime && sleepEndTime) {
        // Time range mode - calculate from start/end times
        const parseTime = (t: string): { hours: number; minutes: number } | null => {
          // Handle various formats: "8", "08", "8:00", "08:00", "19:30"
          const clean = t.replace(/[^\d:]/g, '');
          if (clean.includes(':')) {
            const [h, m] = clean.split(':').map(Number);
            return { hours: h || 0, minutes: m || 0 };
          } else {
            return { hours: Number(clean) || 0, minutes: 0 };
          }
        };

        const start = parseTime(sleepStartTime);
        const end = parseTime(sleepEndTime);

        if (start && end) {
          let startMinutes = start.hours * 60 + start.minutes;
          let endMinutes = end.hours * 60 + end.minutes;

          // If end is earlier than start, assume next day (e.g., 22:00 → 07:00)
          if (endMinutes <= startMinutes) {
            endMinutes += 24 * 60;
          }

          const totalMinutes = endMinutes - startMinutes;
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;

          const formattedStart = `${String(start.hours).padStart(2, '0')}:${String(start.minutes).padStart(2, '0')}`;
          const formattedEnd = `${String(end.hours).padStart(2, '0')}:${String(end.minutes).padStart(2, '0')}`;

          durationText = `${formattedStart} → ${formattedEnd} (${h}${t('time.hour')} ${m > 0 ? `${m}${t('time.minute')}` : ''})`;
          data.duration = totalMinutes * 60;
          data.startTime = formattedStart;
          data.endTime = formattedEnd;
        }
      }

      // Combine duration with user note
      if (durationText && sleepNote) {
        data.note = `${durationText} | ${sleepNote}`;
      } else if (durationText) {
        data.note = durationText;
      } else if (sleepNote) {
        data.note = sleepNote;
      } else {
        data.note = t('tracking.newSleep');
      }
    } else {
      data.subType = subType || 'default';
      if (diaperNote) data.note = diaperNote;
    }


    try {
      await onSave(data);

      // Show checkmark and delay close
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    } catch (error) {
      Alert.alert(t('common.error'), t('tracking.saveError'));
    }
  };

  const config = type ? TYPE_CONFIG[type] : TYPE_CONFIG.food;

  // --- Food Content ---
  const renderFoodContent = () => (
    <View style={{ width: '100%' }}>
      {/* 4 Food Type Tabs */}
      <View style={styles.foodTabs}>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'breast' && styles.activeFoodTab]}
          onPress={() => { setFoodType('breast'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            {activeSide !== null ? (
              <Text style={{ color: '#6366F1', fontSize: 13, fontWeight: '700' }}>{formatTime(activeSide === 'left' ? leftTimer : rightTimer)}</Text>
            ) : (leftTimer > 0 || rightTimer > 0) ? (
              <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '600' }}>{formatTime(leftTimer + rightTimer)}</Text>
            ) : (
              <Baby size={22} color={foodType === 'breast' ? '#fff' : '#9CA3AF'} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[styles.foodTabText, foodType === 'breast' && styles.activeFoodTabText]}>{t('tracking.breast')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'bottle' && styles.activeFoodTab]}
          onPress={() => { setFoodType('bottle'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            <Milk size={22} color={foodType === 'bottle' ? '#fff' : '#9CA3AF'} strokeWidth={1.5} />
          </View>
          <Text style={[styles.foodTabText, foodType === 'bottle' && styles.activeFoodTabText]}>{t('tracking.bottle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'solids' && styles.activeFoodTab]}
          onPress={() => { setFoodType('solids'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            <Apple size={22} color={foodType === 'solids' ? '#fff' : '#9CA3AF'} strokeWidth={1.5} />
          </View>
          <Text style={[styles.foodTabText, foodType === 'solids' && styles.activeFoodTabText]}>{t('tracking.solids')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'pumping' && styles.activeFoodTab]}
          onPress={() => { setFoodType('pumping'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            {isPumpingActive ? (
              <Text style={{ color: '#6366F1', fontSize: 13, fontWeight: '700' }}>{formatTime(pumpingTimer)}</Text>
            ) : pumpingTimer > 0 ? (
              <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '600' }}>{formatTime(pumpingTimer)}</Text>
            ) : (
              <Droplets size={22} color={foodType === 'pumping' ? '#fff' : '#9CA3AF'} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[styles.foodTabText, foodType === 'pumping' && styles.activeFoodTabText]}>{t('tracking.pumping')}</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Button - Minimal */}
      <TouchableOpacity
        style={styles.datePickerBtn}
        onPress={() => { setShowCalendar(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      >
        <Calendar size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={styles.datePickerBtnText}>
          {selectedDate.toDateString() === new Date().toDateString()
            ? t('tracking.today')
            : selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', weekday: 'short' })}
        </Text>
      </TouchableOpacity>

      {/* Premium Time Picker - Scroll Wheel */}
      <View style={styles.premiumTimeRow}>
        <View style={styles.premiumTimeCard}>
          <Text style={styles.premiumTimeLabel}>סיום</Text>
          <TouchableOpacity
            style={styles.premiumTimeDisplay}
            onPress={() => { setShowEndTimePicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={styles.premiumTimeDigit}>
              {endTime.getHours().toString().padStart(2, '0')}:{endTime.getMinutes().toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.premiumTimeArrowContainer}>
          <Text style={styles.premiumTimeArrow}>→</Text>
        </View>

        <View style={styles.premiumTimeCard}>
          <Text style={styles.premiumTimeLabel}>התחלה</Text>
          <TouchableOpacity
            style={styles.premiumTimeDisplay}
            onPress={() => { setShowStartTimePicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={styles.premiumTimeDigit}>
              {startTime.getHours().toString().padStart(2, '0')}:{startTime.getMinutes().toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Start Time Picker Modal */}
      {showStartTimePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={(event, date) => {
                if (Platform.OS === 'android') setShowStartTimePicker(false);
                if (date) setStartTime(date);
              }}
              locale="he-IL"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.timePickerDoneBtn}
                onPress={() => setShowStartTimePicker(false)}
              >
                <Text style={styles.timePickerDoneBtnText}>{t('tracking.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* End Time Picker Modal */}
      {showEndTimePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={(event, date) => {
                if (Platform.OS === 'android') setShowEndTimePicker(false);
                if (date) setEndTime(date);
              }}
              locale="he-IL"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.timePickerDoneBtn}
                onPress={() => setShowEndTimePicker(false)}
              >
                <Text style={styles.timePickerDoneBtnText}>{t('tracking.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Bottle Content */}
      {foodType === 'bottle' && (
        <View style={styles.bottleContainer}>
          <Text style={styles.label}>{t('tracking.howMuch')}</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity
              style={styles.amountBtn}
              onPress={() => {
                const current = parseInt(bottleAmount) || 0;
                if (current >= 5) setBottleAmount((current - 5).toString());
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Minus size={20} color="#374151" strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.amountDisplay}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (Platform.OS === 'ios') {
                  const Alert = require('react-native').Alert;
                  Alert.prompt(
                    t('tracking.enterAmount'),
                    t('tracking.howMuch'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('tracking.done'), onPress: (value: string) => {
                          const num = parseInt(value);
                          if (!isNaN(num) && num >= 0) setBottleAmount(num.toString());
                        }
                      },
                    ],
                    'plain-text',
                    bottleAmount || '0',
                    'number-pad'
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.amountValue}>{bottleAmount || '0'}</Text>
              <Text style={styles.amountUnit}>{t('tracking.ml')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.amountBtn}
              onPress={() => {
                const current = parseInt(bottleAmount) || 0;
                setBottleAmount((current + 5).toString());
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Plus size={20} color="#374151" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Breast Content - Minimalist Style like Sleep */}
      {foodType === 'breast' && (
        <View style={styles.breastContainer}>
          {/* Two time cards side by side */}
          <View style={styles.breastTimeRow}>
            {/* Left Breast Card */}
            <TouchableOpacity
              style={[styles.breastTimeCard, activeSide === 'left' && styles.breastTimeCardActive]}
              onPress={() => { toggleBreastTimer('left'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
              <Text style={styles.breastTimeLabel}>{t('tracking.left')}</Text>
              <Text style={[styles.breastTimeValue, activeSide === 'left' && styles.breastTimeValueActive]}>{formatTime(leftTimer)}</Text>
              <View style={[styles.breastPlayBtn, activeSide === 'left' && styles.breastPlayBtnActive]}>
                {activeSide === 'left' ? <Pause size={14} color="#fff" /> : <Play size={14} color="#6366F1" />}
              </View>
            </TouchableOpacity>

            {/* Arrow indicator */}
            <Text style={styles.breastArrow}>←</Text>

            {/* Right Breast Card */}
            <TouchableOpacity
              style={[styles.breastTimeCard, activeSide === 'right' && styles.breastTimeCardActive]}
              onPress={() => { toggleBreastTimer('right'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
              <Text style={styles.breastTimeLabel}>{t('tracking.right')}</Text>
              <Text style={[styles.breastTimeValue, activeSide === 'right' && styles.breastTimeValueActive]}>{formatTime(rightTimer)}</Text>
              <View style={[styles.breastPlayBtn, activeSide === 'right' && styles.breastPlayBtnActive]}>
                {activeSide === 'right' ? <Pause size={14} color="#fff" /> : <Play size={14} color="#6366F1" />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Total time display */}
          <Text style={styles.breastTotalLabel}>{t('tracking.total')}: {formatTime(leftTimer + rightTimer)}</Text>
        </View>
      )}

      {/* Pumping Content - Timer + Amount Side by Side */}
      {foodType === 'pumping' && (
        <View style={styles.pumpingRowContainer}>
          {/* Timer Section - Small (Left in visual, appears right in RTL) */}
          <TouchableOpacity
            style={[styles.pumpingTimerCardSmall, isPumpingActive && styles.pumpingTimerCardActive]}
            onPress={() => { togglePumpingTimer(); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.pumpingTimerLabelSmall, isPumpingActive && styles.pumpingTimerLabelActive]}>{t('tracking.pumping')}</Text>
            <Text style={[styles.pumpingTimerValueSmall, isPumpingActive && styles.pumpingTimerValueActive]}>
              {formatTime(pumpingTimer)}
            </Text>
            <View style={[styles.pumpingTimerIconSmall, isPumpingActive && styles.pumpingTimerIconActive]}>
              {isPumpingActive ? <Pause size={12} color="#fff" /> : <Play size={12} color="#6366F1" />}
            </View>
          </TouchableOpacity>

          {/* Amount Section - Large (Right in visual, appears left in RTL) */}
          <View style={styles.pumpingAmountSectionLarge}>
            <Text style={styles.pumpingAmountLabelLarge}>{t('tracking.pumpingAmount')}</Text>
            <View style={styles.pumpingAmountRowLarge}>
              <TouchableOpacity
                style={styles.pumpingAmountBtnLarge}
                onPress={() => {
                  const current = parseInt(pumpingAmount) || 0;
                  if (current >= 5) setPumpingAmount((current - 5).toString());
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Minus size={22} color="#6366F1" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pumpingAmountDisplayLarge}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (Platform.OS === 'ios') {
                    const Alert = require('react-native').Alert;
                    Alert.prompt(
                      t('tracking.enterAmount'),
                      t('tracking.pumpingAmount'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('tracking.done'), onPress: (value: string) => {
                            const num = parseInt(value);
                            if (!isNaN(num) && num >= 0) setPumpingAmount(num.toString());
                          }
                        },
                      ],
                      'plain-text',
                      pumpingAmount || '0',
                      'number-pad'
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.pumpingAmountValueLarge}>{pumpingAmount || '0'}</Text>
                <Text style={styles.pumpingAmountUnitLarge}>{t('tracking.ml')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pumpingAmountBtnLarge}
                onPress={() => {
                  const current = parseInt(pumpingAmount) || 0;
                  setPumpingAmount((current + 5).toString());
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Plus size={22} color="#6366F1" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Solids Content */}
      {foodType === 'solids' && (
        <View style={styles.solidsContainer}>
          <Text style={styles.label}>{t('tracking.whatAte')}</Text>
          <TextInput
            style={styles.solidsInput}
            placeholder={`${t('tracking.forExample')}: ...`}
            value={solidsFoodName}
            onChangeText={setSolidsFoodName}
            textAlign="right"
          />
        </View>
      )}
      {/* Free Text Note - Available for all food types */}
      <View style={styles.sleepNoteContainer}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MessageSquare size={14} color="#9CA3AF" strokeWidth={2} />
          <Text style={styles.sleepNoteLabel}>{t('tracking.note')}</Text>
        </View>
        <TextInput
          style={styles.sleepNoteInput}
          placeholder={`${t('tracking.example')}: ...`}
          placeholderTextColor="#9CA3AF"
          value={foodNote}
          onChangeText={setFoodNote}
          textAlign="right"
          multiline
        />
      </View>
    </View>
  );

  // Sleep input mode: 'timer' | 'duration' | 'timerange'
  const [sleepMode, setSleepMode] = React.useState<'timer' | 'duration' | 'timerange'>('duration');
  const [sleepStartTimeDate, setSleepStartTimeDate] = React.useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [sleepEndTimeDate, setSleepEndTimeDate] = React.useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [showSleepStartPicker, setShowSleepStartPicker] = React.useState(false);
  const [showSleepEndPicker, setShowSleepEndPicker] = React.useState(false);
  // Keep string versions for backward compatibility with save logic
  const sleepStartTime = `${sleepStartTimeDate.getHours().toString().padStart(2, '0')}:${sleepStartTimeDate.getMinutes().toString().padStart(2, '0')}`;
  const sleepEndTime = `${sleepEndTimeDate.getHours().toString().padStart(2, '0')}:${sleepEndTimeDate.getMinutes().toString().padStart(2, '0')}`;

  const renderSleepContent = () => (
    <View style={{ width: '100%' }}>
      {/* Mode Selector - Icons Above Text */}
      <View style={styles.sleepModeRow}>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'timerange' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('timerange'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Clock size={20} color={sleepMode === 'timerange' ? '#fff' : '#9CA3AF'} strokeWidth={2} />
          <Text style={[styles.sleepModeText, sleepMode === 'timerange' && styles.sleepModeTextActive]}>{t('tracking.hours')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'duration' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('duration'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Hourglass size={20} color={sleepMode === 'duration' ? '#fff' : '#9CA3AF'} strokeWidth={2} />
          <Text style={[styles.sleepModeText, sleepMode === 'duration' && styles.sleepModeTextActive]}>{t('tracking.duration')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'timer' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('timer'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Timer size={20} color={sleepMode === 'timer' ? '#fff' : '#9CA3AF'} strokeWidth={2} />
          <Text style={[styles.sleepModeText, sleepMode === 'timer' && styles.sleepModeTextActive]}>{t('tracking.timer')}</Text>
        </TouchableOpacity>
      </View>

      {/* Timer Mode - Minimalist */}
      {sleepMode === 'timer' && (
        <View style={styles.sleepTimerSection}>
          <TouchableOpacity
            style={[styles.sleepTimerCard, sleepContext.isRunning && styles.sleepTimerCardActive]}
            onPress={() => {
              if (sleepContext.isRunning) {
                sleepContext.stop();
                const totalMins = Math.floor(sleepContext.elapsedSeconds / 60);
                setSleepHours(Math.floor(totalMins / 60));
                setSleepMinutes(totalMins % 60);
                setSleepMode('duration');
              } else {
                sleepContext.start();
              }
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Text style={[styles.sleepTimerValue, sleepContext.isRunning && styles.sleepTimerValueActive]}>
              {sleepContext.isRunning ? sleepContext.formatTime(sleepContext.elapsedSeconds) : '0:00'}
            </Text>
            <View style={[styles.sleepTimerPlayBtn, sleepContext.isRunning && styles.sleepTimerPlayBtnActive]}>
              {sleepContext.isRunning ? <Pause size={16} color="#fff" /> : <Play size={16} color="#6366F1" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.sleepTimerHint}>
            {sleepContext.isRunning ? t('tracking.pressToStop') : t('tracking.pressToStart')}
          </Text>
        </View>
      )}

      {/* Duration Mode - Modern Sliders */}
      {sleepMode === 'duration' && (
        <View style={styles.sleepDurationSection}>
          <View style={styles.sleepDurationRow}>
            <View style={styles.sleepDurationItem}>
              <Text style={styles.sleepDurationLabel}>שעות</Text>
              <View style={styles.sleepSlider}>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepHours(Math.max(0, sleepHours - 1)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sleepSliderValue}>{sleepHours}</Text>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepHours(Math.min(12, sleepHours + 1)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sleepDurationSeparator}>:</Text>

            <View style={styles.sleepDurationItem}>
              <Text style={styles.sleepDurationLabel}>{t('tracking.minutes')}</Text>
              <View style={styles.sleepSlider}>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepMinutes(Math.max(0, sleepMinutes - 5)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sleepSliderValue}>{String(sleepMinutes).padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepMinutes(Math.min(55, sleepMinutes + 5)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Time Range Mode - DateTimePicker spinner like Food section */}
      {sleepMode === 'timerange' && (
        <>
          <View style={styles.premiumTimeRow}>
            <View style={styles.premiumTimeCard}>
              <Text style={styles.premiumTimeLabel}>סיום</Text>
              <TouchableOpacity
                style={styles.premiumTimeDisplay}
                onPress={() => { setShowSleepEndPicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={styles.premiumTimeDigit}>{sleepEndTime}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.premiumTimeArrowContainer}>
              <Text style={styles.premiumTimeArrow}>→</Text>
            </View>

            <View style={styles.premiumTimeCard}>
              <Text style={styles.premiumTimeLabel}>{t('tracking.start')}</Text>
              <TouchableOpacity
                style={styles.premiumTimeDisplay}
                onPress={() => { setShowSleepStartPicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={styles.premiumTimeDigit}>{sleepStartTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sleep Start Time Picker Modal */}
          {showSleepStartPicker && (
            <View style={styles.timePickerOverlay}>
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={sleepStartTimeDate}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowSleepStartPicker(false);
                    if (date) setSleepStartTimeDate(date);
                  }}
                  locale="he-IL"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.timePickerDoneBtn}
                    onPress={() => setShowSleepStartPicker(false)}
                  >
                    <Text style={styles.timePickerDoneBtnText}>{t('tracking.done')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Sleep End Time Picker Modal */}
          {showSleepEndPicker && (
            <View style={styles.timePickerOverlay}>
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={sleepEndTimeDate}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowSleepEndPicker(false);
                    if (date) setSleepEndTimeDate(date);
                  }}
                  locale="he-IL"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.timePickerDoneBtn}
                    onPress={() => setShowSleepEndPicker(false)}
                  >
                    <Text style={styles.timePickerDoneBtnText}>{t('tracking.done')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {/* Free Text Note */}
      <View style={styles.sleepNoteContainer}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MessageSquare size={14} color="#9CA3AF" strokeWidth={2} />
          <Text style={styles.sleepNoteLabel}>{t('tracking.note')}</Text>
        </View>
        <TextInput
          style={styles.sleepNoteInput}
          placeholder="לדוגמה: ישן עמוק, התעורר פעם אחת..."
          placeholderTextColor="#9CA3AF"
          value={sleepNote}
          onChangeText={setSleepNote}
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );

  // --- Diaper Content ---
  const renderDiaperContent = () => (
    <View style={{ width: '100%' }}>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>מה היה?</Text>
      <View style={styles.diaperOptions}>
        {[
          { key: 'pee', label: 'רטוב', color: '#3B82F6', icon: Droplets },
          { key: 'poop', label: 'מלוכלך', color: '#D97706', icon: Sparkles },
          { key: 'both', label: 'שניהם', color: '#10B981', icon: Layers },
        ].map(opt => {
          const IconComponent = opt.icon;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.diaperBtn, subType === opt.key && { backgroundColor: opt.color }]}
              onPress={() => {
                setSubType(opt.key);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <IconComponent size={22} color={subType === opt.key ? '#fff' : opt.color} strokeWidth={2} />
              <Text style={[styles.diaperBtnText, subType === opt.key && { color: '#fff' }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.diaperNoteInput}
        placeholder="הערות (אופציונלי)..."
        placeholderTextColor="#9CA3AF"
        onChangeText={(text) => setDiaperNote(text)}
        textAlign="right"
      />
    </View>
  );

  const renderContent = () => {
    if (type === 'food') return renderFoodContent();
    if (type === 'sleep') return renderSleepContent();
    if (type === 'diaper') return renderDiaperContent();
    return null;
  };

  if (!visible || !type) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <TouchableWithoutFeedback onPress={onClose}>
            <RNAnimatedView style={[styles.backdrop, { opacity: backdropAnim }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              )}
            </RNAnimatedView>
          </TouchableWithoutFeedback>

          <RNAnimatedView
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Header */}
            <LinearGradient colors={isDarkMode ? [theme.card, theme.cardSecondary] : config.gradient} style={styles.header}>
              <View style={styles.emojiCircle}>
                {React.createElement(config.icon, { size: 28, color: config.accent, strokeWidth: 2.5 })}
              </View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{config.title}</Text>
            </LinearGradient>

            {/* Content - Wrapped in ScrollView */}
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {renderContent()}
            </ScrollView>

            {/* Save Button - Minimal with success checkmark */}
            <TouchableOpacity
              style={[styles.saveBtn, saveSuccess && styles.saveBtnSuccess]}
              onPress={handleSave}
              disabled={saveSuccess}
            >
              <Check size={18} color={saveSuccess ? '#10B981' : '#374151'} strokeWidth={2.5} />
              <Text style={[styles.saveBtnText, saveSuccess && styles.saveBtnTextSuccess]}>
                {saveSuccess ? 'נשמר!' : 'שמור תיעוד'}
              </Text>
            </TouchableOpacity>

            {/* Calendar Overlay - Inline */}
            {showCalendar && (
              <View style={styles.calendarInlineOverlay}>
                <TouchableOpacity style={styles.calendarInlineBackdrop} activeOpacity={1} onPress={() => setShowCalendar(false)} />
                <View style={styles.calendarCard}>
                  {/* Month Header */}
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <ChevronLeft size={18} color="#374151" strokeWidth={1.5} />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthText}>
                      {selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <ChevronRight size={18} color="#374151" strokeWidth={1.5} />
                    </TouchableOpacity>
                  </View>

                  {/* Week Days */}
                  <View style={styles.calendarWeekRow}>
                    {[t('weekday.sun'), t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat')].map((day, i) => (
                      <Text key={i} style={styles.calendarWeekDay}>{day}</Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={styles.calendarDaysGrid}>
                    {(() => {
                      const year = selectedDate.getFullYear();
                      const month = selectedDate.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const today = new Date();
                      const days = [];

                      for (let i = 0; i < firstDay; i++) {
                        days.push(<View key={`e-${i}`} style={styles.calendarDay} />);
                      }

                      for (let d = 1; d <= daysInMonth; d++) {
                        const date = new Date(year, month, d);
                        const isToday = date.toDateString() === today.toDateString();
                        const isSelected = date.toDateString() === selectedDate.toDateString();
                        const isFuture = date > today;

                        days.push(
                          <TouchableOpacity
                            key={d}
                            style={[styles.calendarDay, isToday && styles.calendarDayToday, isSelected && styles.calendarDaySelected, isFuture && styles.calendarDayDisabled]}
                            onPress={() => { if (!isFuture) { setSelectedDate(date); setShowCalendar(false); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                            disabled={isFuture}
                          >
                            <Text style={[styles.calendarDayText, isSelected && styles.calendarDaySelectedText]}>{d}</Text>
                          </TouchableOpacity>
                        );
                      }
                      return days;
                    })()}
                  </View>

                  {/* Today Button */}
                  <TouchableOpacity style={[styles.datePickerBtn, { marginTop: 16, marginBottom: 0 }]} onPress={() => { setSelectedDate(new Date()); setShowCalendar(false); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Text style={styles.datePickerBtnText}>{t('tracking.today')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </RNAnimatedView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity style={styles.calendarModal} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <TouchableOpacity style={styles.calendarCard} activeOpacity={1} onPress={() => { }}>
            {/* Month Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}>
                <ChevronLeft size={18} color="#374151" strokeWidth={1.5} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>
                {selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}>
                <ChevronRight size={18} color="#374151" strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Week Days Header */}
            <View style={styles.calendarWeekRow}>
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, i) => (
                <Text key={i} style={styles.calendarWeekDay}>{day}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarDaysGrid}>
              {(() => {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                const days = [];

                // Empty slots for days before month starts
                for (let i = 0; i < firstDay; i++) {
                  days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
                }

                // Days of month
                for (let d = 1; d <= daysInMonth; d++) {
                  const date = new Date(year, month, d);
                  const isToday = date.toDateString() === today.toDateString();
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  const isFuture = date > today;

                  days.push(
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.calendarDay,
                        isToday && styles.calendarDayToday,
                        isSelected && styles.calendarDaySelected,
                        isFuture && styles.calendarDayDisabled
                      ]}
                      onPress={() => {
                        if (!isFuture) {
                          setSelectedDate(date);
                          setShowCalendar(false);
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      disabled={isFuture}
                    >
                      <Text style={[styles.calendarDayText, isSelected && styles.calendarDaySelectedText]}>{d}</Text>
                    </TouchableOpacity>
                  );
                }
                return days;
              })()}
            </View>

            {/* Today Button */}
            <TouchableOpacity
              style={[styles.datePickerBtn, { marginTop: 16, marginBottom: 0 }]}
              onPress={() => {
                setSelectedDate(new Date());
                setShowCalendar(false);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.datePickerBtnText}>היום</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.4)', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  header: { alignItems: 'center', paddingVertical: 24, marginHorizontal: -20, marginTop: -0, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  emojiCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  emoji: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginTop: 12 },
  content: { paddingVertical: 24, alignItems: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 20, textAlign: 'right' },
  label: { fontSize: 16, color: '#374151', fontWeight: '600', textAlign: 'right', marginBottom: 16 },

  // Date Picker Button - Minimal
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  datePickerBtnText: { fontSize: 13, color: '#6366F1', fontWeight: '600' },

  // Calendar Modal - Minimal
  calendarModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  calendarOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  calendarInlineOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  calendarInlineBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  calendarCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: 350, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10, zIndex: 1001 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarMonthText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  calendarNavBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  calendarWeekRow: { flexDirection: 'row-reverse', marginBottom: 8 },
  calendarWeekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  calendarDaysGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  calendarDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  calendarDayToday: { backgroundColor: '#F3F4F6', borderRadius: 20 },
  calendarDaySelected: { backgroundColor: '#6366F1', borderRadius: 20 },
  calendarDaySelectedText: { color: '#fff' },
  calendarDayDisabled: { opacity: 0.3 },

  // Food Tabs
  foodTabs: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 4,
    gap: 8,
  },
  foodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  activeFoodTab: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  foodTabIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  foodTabText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeFoodTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  // Premium Food Tabs (kept for backward compatibility)
  premiumFoodTabs: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  premiumFoodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 5,
  },
  premiumFoodTabActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  premiumFoodTabIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  premiumFoodTabText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  premiumFoodTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  premiumFoodTabTimer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  premiumFoodTabTimerActive: {
    color: '#fff',
  },

  // Premium Date Picker
  premiumDatePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 20,
  },
  premiumDatePickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Bottle/Pumping
  bottleContainer: { width: '100%' },
  inputWrapper: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  bigInput: { fontSize: 48, fontWeight: 'bold', color: '#1F2937', borderBottomWidth: 2, borderBottomColor: '#E5E7EB', width: 120, textAlign: 'center' },
  unitText: { fontSize: 18, color: '#6B7280', marginBottom: 12 },

  // Amount Row with +/- buttons
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 12 },
  amountBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  amountDisplay: { alignItems: 'center' },
  amountValue: { fontSize: 36, fontWeight: '700', color: '#1F2937' },
  amountUnit: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },

  presets: { flexDirection: 'row', gap: 10, marginTop: 20 },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 12 },
  presetBtnActive: { backgroundColor: '#6366F1' },
  presetText: { fontWeight: '600', color: '#4B5563' },
  presetTextActive: { color: '#fff' },

  // Breastfeeding - Minimalist Style like Sleep
  breastContainer: { alignItems: 'center', paddingHorizontal: 16 },
  breastTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  breastTimeCard: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  breastTimeCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  breastTimeLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8 },
  breastTimeValue: { fontSize: 32, fontWeight: '300', color: '#1F2937', letterSpacing: -1 },
  breastTimeValueActive: { color: '#fff' },
  breastPlayBtn: { marginTop: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  breastPlayBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  breastArrow: { fontSize: 20, color: '#9CA3AF', marginHorizontal: 4 },
  breastTotalLabel: { marginTop: 12, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sleepTimeInput: { fontSize: 32, fontWeight: '300', color: '#1F2937', letterSpacing: -1, minWidth: 80, paddingVertical: 4 },

  // Pumping Timer - Premium Card
  pumpingTimerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F3F4F6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, marginBottom: 24 },
  pumpingTimerBtnActive: { backgroundColor: '#6366F1' },
  pumpingTimerText: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  premiumPumpingCard: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  premiumPumpingCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  premiumPumpingLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: '600', letterSpacing: 0.3 },
  premiumPumpingLabelActive: { color: 'rgba(255,255,255,0.8)' },
  premiumPumpingTime: { fontSize: 26, fontWeight: '400', color: '#1F2937', letterSpacing: -0.5, marginBottom: 8 },
  premiumPumpingTimeActive: { color: '#fff' },
  premiumPumpingIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  premiumPumpingIconActive: { backgroundColor: 'rgba(255,255,255,0.2)' },

  // Solids
  solidsContainer: { width: '100%' },
  solidsInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  solidsSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },

  // Sleep (Manual Entry)
  sleepTimerCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F3F4F6', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 20, marginBottom: 12, alignSelf: 'center' },
  sleepTimerCompactActive: { backgroundColor: '#6366F1' },
  sleepTimerCompactText: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  sleepTimerPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', opacity: 0.8 },
  sleepTimerHint: { fontSize: 12, color: '#6366F1', textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  sleepDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  sleepDividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  sleepDividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  sleepInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  sleepInputGroup: { alignItems: 'center', gap: 8 },
  sleepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  sleepBtnText: { fontSize: 22, fontWeight: '600', color: '#6366F1' },
  sleepValueBox: { alignItems: 'center', minWidth: 60 },
  sleepValue: { fontSize: 36, fontWeight: '800', color: '#1F2937' },
  sleepUnit: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  sleepSeparator: { fontSize: 32, fontWeight: '700', color: '#D1D5DB' },
  sleepPresets: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  sleepNoteContainer: { marginTop: 16 },
  sleepNoteLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', textAlign: 'right' },
  sleepNoteInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 60 },

  // New Modern Sleep UI
  sleepModeRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 8, marginBottom: 20, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  sleepModeBtn: { flex: 1, flexDirection: 'column', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10 },
  sleepModeBtnActive: { backgroundColor: '#6366F1' },
  sleepModeText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  sleepModeTextActive: { color: '#fff' },

  sleepTimerSection: { alignItems: 'center', marginVertical: 20 },
  // Minimalist timer card
  sleepTimerCard: { alignItems: 'center', backgroundColor: '#F9FAFB', paddingVertical: 20, paddingHorizontal: 48, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sleepTimerCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  sleepTimerValue: { fontSize: 40, fontWeight: '300', color: '#1F2937', letterSpacing: -1 },
  sleepTimerValueActive: { color: '#fff' },
  sleepTimerPlayBtn: { marginTop: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  sleepTimerPlayBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },

  sleepDurationSection: { marginVertical: 16 },
  sleepDurationRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 16 },
  sleepDurationItem: { alignItems: 'center' },
  sleepDurationLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  sleepDurationSeparator: { fontSize: 28, fontWeight: '700', color: '#D1D5DB', marginTop: 24 },

  sleepSlider: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4 },
  sleepSliderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sleepSliderBtnText: { fontSize: 20, fontWeight: '600', color: '#6366F1' },
  sleepSliderValue: { fontSize: 32, fontWeight: '800', color: '#1F2937', minWidth: 50, textAlign: 'center' },

  // Apple-style Time Picker
  appleTimeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginVertical: 16 },
  appleTimeItem: { alignItems: 'center' },
  appleTimeLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 6, fontWeight: '500' },
  appleTimeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  appleTimeDigit: { fontSize: 22, fontWeight: '600', color: '#1C1C1E', minWidth: 28, textAlign: 'center' },
  appleTimeColon: { fontSize: 22, fontWeight: '600', color: '#1C1C1E', marginHorizontal: 2 },
  appleTimeArrow: { fontSize: 16, color: '#C7C7CC' },

  // Premium Time Picker - Glass Cards
  premiumTimeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  premiumTimeCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumTimeLabel: {
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  premiumTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  premiumTimeDigit: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -1,
  },
  premiumTimeArrowContainer: {
    paddingHorizontal: 8
  },
  premiumTimeArrow: {
    fontSize: 16,
    fontWeight: '300'
  },

  // Premium Bottle
  premiumBottleContainer: {
    width: '100%',
    marginBottom: 24,
  },
  premiumLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  premiumAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  premiumAmountBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumAmountDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  premiumAmountValue: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -1.5,
  },
  premiumAmountUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },

  // Premium Breast
  premiumBreastContainer: {
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  premiumBreastTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  premiumBreastTimeCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumBreastTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  premiumBreastTimeValue: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  premiumBreastPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBreastArrow: {
    fontSize: 18,
    marginHorizontal: 4,
  },
  premiumBreastTotalLabel: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    opacity: 0.7,
  },

  // Premium Pumping
  premiumPumpingRowContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
    alignItems: 'stretch',
  },
  premiumPumpingTimerCard: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumPumpingTimerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  premiumPumpingTimerValue: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -1,
    marginBottom: 10,
  },
  premiumPumpingTimerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPumpingAmountSection: {
    flex: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPumpingAmountLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.2,
    opacity: 0.7,
  },
  premiumPumpingAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  premiumPumpingAmountBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumPumpingAmountDisplay: {
    alignItems: 'center',
    minWidth: 70,
  },
  premiumPumpingAmountValue: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -1.5,
  },
  premiumPumpingAmountUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },

  // Premium Solids
  premiumSolidsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  premiumSolidsInputContainer: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumSolidsInput: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 24,
  },

  // Premium Notes
  premiumNoteContainer: {
    width: '100%',
    marginTop: 8,
  },
  premiumNoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  premiumNoteInputContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    minHeight: 80,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumNoteInput: {
    fontSize: 14,
    fontWeight: '400',
    minHeight: 48,
    textAlignVertical: 'top',
  },

  sleepTimeRangeSection: { marginVertical: 16 },
  timeRangeRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12 },
  timeRangeItem: { flex: 1, alignItems: 'center' },
  timeRangeLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  timeRangeInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '700', borderWidth: 1, borderColor: '#E5E7EB', color: '#1F2937' },
  timeRangeArrow: { fontSize: 24, color: '#9CA3AF', marginTop: 24 },
  timeRangeHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },

  sleepTimerNote: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginTop: 20 },
  sleepTimerNoteText: { fontSize: 14, color: '#6366F1', fontWeight: '600', textAlign: 'center' },

  // Legacy Sleep Timer (keep for compatibility)
  timerCircle: { marginVertical: 20 },
  timerCircleActive: {},
  timerGradient: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' },
  timerBigText: { fontSize: 36, fontWeight: 'bold', color: '#1F2937' },
  timerHint: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  persistHint: { fontSize: 12, color: '#10B981', textAlign: 'center', marginTop: 12, fontWeight: '600' },

  // Diaper
  diaperOptions: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 16 },
  diaperBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, backgroundColor: '#F3F4F6', borderRadius: 16 },
  diaperBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  diaperNoteInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, textAlign: 'right', marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB' },

  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  saveBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  saveBtnSuccess: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  saveBtnTextSuccess: { color: '#10B981' },

  // Time Picker Overlay - Premium Design
  timePickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  timePickerContainer: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, width: '90%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 },
  timePickerDoneBtn: { marginTop: 20, paddingHorizontal: 48, paddingVertical: 14, backgroundColor: '#6366F1', borderRadius: 14, width: '100%', alignItems: 'center' },
  timePickerDoneBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  // Pumping Row Layout (Timer + Amount side by side)
  pumpingRowContainer: { flexDirection: 'row', gap: 12, marginTop: 16, paddingHorizontal: 8, alignItems: 'stretch' },
  pumpingTimerCard: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  pumpingTimerCardActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  pumpingTimerLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  pumpingTimerLabelActive: { color: '#6366F1' },
  pumpingTimerValue: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  pumpingTimerValueActive: { color: '#6366F1' },
  pumpingTimerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  pumpingTimerIconActive: { backgroundColor: '#6366F1' },
  pumpingAmountSection: { flex: 1, alignItems: 'center' },
  pumpingAmountLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 8 },
  pumpingAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pumpingAmountBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  pumpingAmountDisplay: { alignItems: 'center' },
  pumpingAmountValue: { fontSize: 28, fontWeight: '700', color: '#1F2937' },
  pumpingAmountUnit: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  // Pumping - Small Timer (left side)
  pumpingTimerCardSmall: { flex: 0.35, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  pumpingTimerLabelSmall: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  pumpingTimerValueSmall: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  pumpingTimerIconSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },

  // Pumping - Large Amount (right side)
  pumpingAmountSectionLarge: { flex: 0.65, alignItems: 'center', justifyContent: 'center' },
  pumpingAmountLabelLarge: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 10 },
  pumpingAmountRowLarge: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pumpingAmountBtnLarge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  pumpingAmountDisplayLarge: { alignItems: 'center', minWidth: 60 },
  pumpingAmountValueLarge: { fontSize: 36, fontWeight: '700', color: '#1F2937' },
  pumpingAmountUnitLarge: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
});
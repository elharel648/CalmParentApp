import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { X, Check, Droplets, Play, Pause, Baby, Moon, Utensils, Apple, Milk, Plus, Minus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useFoodTimer } from '../context/FoodTimerContext';
import { useTheme } from '../context/ThemeContext';

interface TrackingModalProps {
  visible: boolean;
  type: 'food' | 'sleep' | 'diaper' | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const TYPE_CONFIG = {
  food: {
    title: 'תיעוד אוכל',
    icon: Utensils,
    gradient: ['#FDF6E3', '#FCEFC7'] as [string, string],
    accent: '#E5B85C',
  },
  sleep: {
    title: 'תיעוד שינה',
    icon: Moon,
    gradient: ['#E0E7FF', '#C7D2FE'] as [string, string],
    accent: '#6366F1',
  },
  diaper: {
    title: 'החלפת חיתול',
    icon: Baby,
    gradient: ['#D1FAE5', '#A7F3D0'] as [string, string],
    accent: '#10B981',
  },
};

export default function TrackingModal({ visible, type, onClose, onSave }: TrackingModalProps) {
  const { theme, isDarkMode } = useTheme();
  const foodTimerContext = useFoodTimer();

  // --- Food States ---
  const [foodType, setFoodType] = useState<'bottle' | 'breast' | 'pumping' | 'solids'>('bottle');
  const [amount, setAmount] = useState('');
  const [solidsFoodName, setSolidsFoodName] = useState('');

  // Food Time States
  const [startHour, setStartHour] = useState(() => new Date().getHours());
  const [startMinute, setStartMinute] = useState(() => new Date().getMinutes());
  const [endHour, setEndHour] = useState(() => new Date().getHours());
  const [endMinute, setEndMinute] = useState(() => new Date().getMinutes());

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
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset local state only (not breastfeeding timer which should persist)
      setSubType(null);
      setAmount('');
      setSolidsFoodName('');
      // Note: breastfeeding and pumping timers use global context and should NOT be reset here
      setSleepHours(0);
      setSleepMinutes(30);
      setSleepNote('');
      setDiaperNote('');

      // Apple-style sheet animation
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
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

  const handleSave = () => {
    console.log('🎯 TrackingModal: handleSave called, type =', type);
    if (!type) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    let data: any = { type, timestamp: new Date() };

    if (type === 'food') {
      if (foodType === 'bottle') {
        data.amount = amount ? `${amount} מ"ל` : 'לא צוין';
        data.subType = 'bottle';
      } else if (foodType === 'breast') {
        data.note = `שמאל: ${formatTime(leftTimer)} | ימין: ${formatTime(rightTimer)}`;
        data.subType = 'breast';
      } else if (foodType === 'pumping') {
        data.amount = amount ? `${amount} מ"ל` : 'לא צוין';
        data.note = pumpingTimer > 0 ? `זמן שאיבה: ${formatTime(pumpingTimer)}` : undefined;
        data.subType = 'pumping';
      } else if (foodType === 'solids') {
        data.note = solidsFoodName || 'מזון מוצקים';
        data.subType = 'solids';
      }
    } else if (type === 'sleep') {
      // Handle different sleep modes
      let durationText = '';

      if (sleepMode === 'timer' && sleepContext.elapsedSeconds > 0) {
        // Timer mode - use elapsed seconds
        durationText = `משך שינה: ${sleepContext.formatTime(sleepContext.elapsedSeconds)}`;
        data.duration = sleepContext.elapsedSeconds;
        if (sleepContext.isRunning) sleepContext.stop();

      } else if (sleepMode === 'duration') {
        // Duration mode - use hours/minutes
        const totalMinutes = (sleepHours * 60) + sleepMinutes;
        if (totalMinutes > 0) {
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          durationText = `משך שינה: ${h}:${String(m).padStart(2, '0')}`;
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

          durationText = `${formattedStart} → ${formattedEnd} (${h} שע' ${m > 0 ? `${m} דק'` : ''})`;
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
        data.note = 'שינה חדשה';
      }
    } else {
      data.subType = subType || 'default';
      if (diaperNote) data.note = diaperNote;
    }

    console.log('🎯 TrackingModal: calling onSave with data =', JSON.stringify(data));
    onSave(data);

    // Show checkmark and delay close
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
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
              <Baby size={22} color={foodType === 'breast' ? '#6366F1' : '#9CA3AF'} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[styles.foodTabText, foodType === 'breast' && styles.activeFoodTabText]}>הנקה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'bottle' && styles.activeFoodTab]}
          onPress={() => { setFoodType('bottle'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            <Milk size={22} color={foodType === 'bottle' ? '#6366F1' : '#9CA3AF'} strokeWidth={1.5} />
          </View>
          <Text style={[styles.foodTabText, foodType === 'bottle' && styles.activeFoodTabText]}>בקבוק</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'solids' && styles.activeFoodTab]}
          onPress={() => { setFoodType('solids'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            <Apple size={22} color={foodType === 'solids' ? '#6366F1' : '#9CA3AF'} strokeWidth={1.5} />
          </View>
          <Text style={[styles.foodTabText, foodType === 'solids' && styles.activeFoodTabText]}>מזון{"\n"}לתינוקות</Text>
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
              <Droplets size={22} color={foodType === 'pumping' ? '#6366F1' : '#9CA3AF'} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[styles.foodTabText, foodType === 'pumping' && styles.activeFoodTabText]}>שאיבה</Text>
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
            ? 'היום'
            : selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', weekday: 'short' })}
        </Text>
      </TouchableOpacity>

      {/* Premium Time Picker */}
      <View style={styles.premiumTimeRow}>
        <View style={styles.premiumTimeCard}>
          <Text style={styles.premiumTimeLabel}>סיום</Text>
          <View style={styles.premiumTimeDisplay}>
            <TouchableOpacity
              style={styles.premiumTimeUnit}
              onPress={() => { setEndMinute(m => (m + 1) % 60); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
              onLongPress={() => { setEndMinute(m => (m + 5) % 60); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={styles.premiumTimeDigit}>{endMinute.toString().padStart(2, '0')}</Text>
            </TouchableOpacity>
            <Text style={styles.premiumTimeColon}>:</Text>
            <TouchableOpacity
              style={styles.premiumTimeUnit}
              onPress={() => { setEndHour(h => (h + 1) % 24); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
              onLongPress={() => { setEndHour(h => (h + 6) % 24); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={styles.premiumTimeDigit}>{endHour.toString().padStart(2, '0')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.premiumTimeArrowContainer}>
          <Text style={styles.premiumTimeArrow}>→</Text>
        </View>

        <View style={styles.premiumTimeCard}>
          <Text style={styles.premiumTimeLabel}>התחלה</Text>
          <View style={styles.premiumTimeDisplay}>
            <TouchableOpacity
              style={styles.premiumTimeUnit}
              onPress={() => { setStartMinute(m => (m + 1) % 60); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
              onLongPress={() => { setStartMinute(m => (m + 5) % 60); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={styles.premiumTimeDigit}>{startMinute.toString().padStart(2, '0')}</Text>
            </TouchableOpacity>
            <Text style={styles.premiumTimeColon}>:</Text>
            <TouchableOpacity
              style={styles.premiumTimeUnit}
              onPress={() => { setStartHour(h => (h + 1) % 24); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
              onLongPress={() => { setStartHour(h => (h + 6) % 24); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={styles.premiumTimeDigit}>{startHour.toString().padStart(2, '0')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottle Content */}
      {foodType === 'bottle' && (
        <View style={styles.bottleContainer}>
          <Text style={styles.label}>כמה אכלנו?</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity
              style={styles.amountBtn}
              onPress={() => {
                const current = parseInt(amount) || 0;
                if (current >= 5) setAmount((current - 5).toString());
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Minus size={20} color="#374151" strokeWidth={1.5} />
            </TouchableOpacity>
            <View style={styles.amountDisplay}>
              <Text style={styles.amountValue}>{amount || '0'}</Text>
              <Text style={styles.amountUnit}>מ"ל</Text>
            </View>
            <TouchableOpacity
              style={styles.amountBtn}
              onPress={() => {
                const current = parseInt(amount) || 0;
                setAmount((current + 5).toString());
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
              <Text style={styles.breastTimeLabel}>שמאל</Text>
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
              <Text style={styles.breastTimeLabel}>ימין</Text>
              <Text style={[styles.breastTimeValue, activeSide === 'right' && styles.breastTimeValueActive]}>{formatTime(rightTimer)}</Text>
              <View style={[styles.breastPlayBtn, activeSide === 'right' && styles.breastPlayBtnActive]}>
                {activeSide === 'right' ? <Pause size={14} color="#fff" /> : <Play size={14} color="#6366F1" />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Total time display */}
          <Text style={styles.breastTotalLabel}>סה"כ: {formatTime(leftTimer + rightTimer)}</Text>
        </View>
      )}

      {/* Pumping Content */}
      {foodType === 'pumping' && (
        <View style={styles.bottleContainer}>
          {/* Pumping Timer - Premium Card */}
          <TouchableOpacity
            style={[styles.premiumPumpingCard, isPumpingActive && styles.premiumPumpingCardActive]}
            onPress={() => { togglePumpingTimer(); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.premiumPumpingLabel, isPumpingActive && styles.premiumPumpingLabelActive]}>שאיבה</Text>
            <Text style={[styles.premiumPumpingTime, isPumpingActive && styles.premiumPumpingTimeActive]}>
              {formatTime(pumpingTimer)}
            </Text>
            <View style={[styles.premiumPumpingIcon, isPumpingActive && styles.premiumPumpingIconActive]}>
              {isPumpingActive ? <Pause size={16} color="#fff" /> : <Play size={16} color="#6366F1" />}
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>כמה נשאב?</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity
              style={styles.amountBtn}
              onPress={() => {
                const current = parseInt(amount) || 0;
                if (current >= 5) setAmount((current - 5).toString());
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Minus size={20} color="#374151" strokeWidth={1.5} />
            </TouchableOpacity>
            <View style={styles.amountDisplay}>
              <Text style={styles.amountValue}>{amount || '0'}</Text>
              <Text style={styles.amountUnit}>מ"ל</Text>
            </View>
            <TouchableOpacity
              style={styles.amountBtn}
              onPress={() => {
                const current = parseInt(amount) || 0;
                setAmount((current + 5).toString());
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Plus size={20} color="#374151" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Solids Content */}
      {foodType === 'solids' && (
        <View style={styles.solidsContainer}>
          <Text style={styles.label}>מה אכלנו?</Text>
          <TextInput
            style={styles.solidsInput}
            placeholder="למשל: דייסת אורז, מחית גזר..."
            value={solidsFoodName}
            onChangeText={setSolidsFoodName}
            textAlign="right"
          />
        </View>
      )}
    </View>
  );

  // Sleep input mode: 'timer' | 'duration' | 'timerange'
  const [sleepMode, setSleepMode] = React.useState<'timer' | 'duration' | 'timerange'>('duration');
  const [sleepStartTime, setSleepStartTime] = React.useState('');
  const [sleepEndTime, setSleepEndTime] = React.useState('');

  const renderSleepContent = () => (
    <View style={{ width: '100%' }}>
      {/* Mode Selector - Modern Pills */}
      <View style={styles.sleepModeRow}>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'timerange' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('timerange'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={[styles.sleepModeText, sleepMode === 'timerange' && styles.sleepModeTextActive]}>שעות</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'duration' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('duration'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={[styles.sleepModeText, sleepMode === 'duration' && styles.sleepModeTextActive]}>משך</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'timer' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('timer'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={[styles.sleepModeText, sleepMode === 'timer' && styles.sleepModeTextActive]}>טיימר</Text>
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
            {sleepContext.isRunning ? 'לחץ לעצור' : 'לחץ להתחיל'}
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
              <Text style={styles.sleepDurationLabel}>דקות</Text>
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

      {/* Time Range Mode - Matching Breastfeeding Design */}
      {sleepMode === 'timerange' && (
        <View style={styles.breastContainer}>
          <View style={styles.breastTimeRow}>
            {/* Start Time Card */}
            <View style={styles.breastTimeCard}>
              <Text style={styles.breastTimeLabel}>התחלה</Text>
              <TextInput
                style={styles.sleepTimeInput}
                placeholder="19:00"
                placeholderTextColor="#9CA3AF"
                value={sleepStartTime}
                onChangeText={setSleepStartTime}
                onBlur={() => {
                  const clean = sleepStartTime.replace(/[^\d:]/g, '');
                  if (clean && !clean.includes(':')) {
                    const h = Number(clean) || 0;
                    setSleepStartTime(`${String(h).padStart(2, '0')}:00`);
                  } else if (clean.includes(':')) {
                    const [h, m] = clean.split(':');
                    setSleepStartTime(`${String(Number(h) || 0).padStart(2, '0')}:${String(Number(m) || 0).padStart(2, '0')}`);
                  }
                }}
                keyboardType="numbers-and-punctuation"
                textAlign="center"
              />
            </View>

            <Text style={styles.breastArrow}>→</Text>

            {/* End Time Card */}
            <View style={styles.breastTimeCard}>
              <Text style={styles.breastTimeLabel}>סיום</Text>
              <TextInput
                style={styles.sleepTimeInput}
                placeholder="08:00"
                placeholderTextColor="#9CA3AF"
                value={sleepEndTime}
                onChangeText={setSleepEndTime}
                onBlur={() => {
                  const clean = sleepEndTime.replace(/[^\d:]/g, '');
                  if (clean && !clean.includes(':')) {
                    const h = Number(clean) || 0;
                    setSleepEndTime(`${String(h).padStart(2, '0')}:00`);
                  } else if (clean.includes(':')) {
                    const [h, m] = clean.split(':');
                    setSleepEndTime(`${String(Number(h) || 0).padStart(2, '0')}:${String(Number(m) || 0).padStart(2, '0')}`);
                  }
                }}
                keyboardType="numbers-and-punctuation"
                textAlign="center"
              />
            </View>
          </View>
        </View>
      )}

      {/* Free Text Note */}
      <View style={styles.sleepNoteContainer}>
        <Text style={styles.sleepNoteLabel}>הערה (אופציונלי)</Text>
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
          { key: 'pee', label: 'שתן', color: '#3B82F6' },
          { key: 'poop', label: 'יציאה', color: '#8B5CF6' },
          { key: 'both', label: 'שניהם', color: '#10B981' },
        ].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.diaperBtn, subType === opt.key && { backgroundColor: opt.color }]}
            onPress={() => {
              setSubType(opt.key);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.diaperBtnText, subType === opt.key && { color: '#fff' }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
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
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
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

            {/* Content */}
            <View style={styles.content}>{renderContent()}</View>

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
                    <Text style={styles.datePickerBtnText}>היום</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
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
  label: { fontSize: 16, color: '#374151', fontWeight: '600', textAlign: 'center', marginBottom: 16 },

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

  // Food Tabs (4 items) - Minimal
  foodTabs: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  foodTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  activeFoodTab: { backgroundColor: '#F3F4F6', borderColor: '#6366F1', borderWidth: 1.5 },
  foodTabIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodTabText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', fontWeight: '600' },
  activeFoodTabText: { color: '#6366F1' },

  // Bottle/Pumping
  bottleContainer: { alignItems: 'center' },
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
  solidsContainer: { alignItems: 'center', width: '100%' },
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
  sleepNoteLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', textAlign: 'right', marginBottom: 8 },
  sleepNoteInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 60 },

  // New Modern Sleep UI
  sleepModeRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 8, marginBottom: 20, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  sleepModeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  sleepModeBtnActive: { backgroundColor: '#6366F1' },
  sleepModeText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
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

  // Premium Time Picker - Compact
  premiumTimeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginVertical: 8, paddingHorizontal: 16 },
  premiumTimeCard: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  premiumTimeLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 4, fontWeight: '600', letterSpacing: 0.3 },
  premiumTimeDisplay: { flexDirection: 'row', alignItems: 'center' },
  premiumTimeUnit: { paddingHorizontal: 3, paddingVertical: 2 },
  premiumTimeDigit: { fontSize: 22, fontWeight: '400', color: '#1F2937', letterSpacing: -0.5 },
  premiumTimeColon: { fontSize: 20, fontWeight: '300', color: '#9CA3AF', marginHorizontal: 1 },
  premiumTimeArrowContainer: { paddingHorizontal: 6 },
  premiumTimeArrow: { fontSize: 12, color: '#D1D5DB', fontWeight: '300' },

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
  diaperBtn: { paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#F3F4F6', borderRadius: 16 },
  diaperBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  diaperNoteInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, textAlign: 'right', marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB' },

  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  saveBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  saveBtnSuccess: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  saveBtnTextSuccess: { color: '#10B981' },
});
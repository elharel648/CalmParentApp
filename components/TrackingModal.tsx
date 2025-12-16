import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { X, Check, Droplets, Play, Pause, Baby, Moon, Utensils, Apple, Milk } from 'lucide-react-native';
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
    gradient: ['#FEF3C7', '#FDE68A'] as [string, string],
    accent: '#F59E0B',
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

  // Breastfeeding Timers
  const [leftTimer, setLeftTimer] = useState(0);
  const [rightTimer, setRightTimer] = useState(0);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  const breastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Sleep States (Manual entry) ---
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [sleepNote, setSleepNote] = useState('');
  const sleepContext = useSleepTimer();

  // --- Diaper States ---
  const [subType, setSubType] = useState<string | null>(null);
  const [diaperNote, setDiaperNote] = useState('');

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Reset state
      setSubType(null);
      setAmount('');
      setSolidsFoodName('');
      setLeftTimer(0);
      setRightTimer(0);
      setActiveSide(null);
      // Note: pumping timer uses global context, no reset here
      setSleepHours(0);
      setSleepMinutes(30);
      setSleepNote('');
      setDiaperNote('');
      clearIntervals();

      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [visible, slideAnim, scaleAnim]);

  const clearIntervals = () => {
    if (breastTimerRef.current) clearInterval(breastTimerRef.current);
    // pumping timer uses global context, no interval to clear
  };

  // Breast timer
  useEffect(() => {
    if (activeSide) {
      breastTimerRef.current = setInterval(() => {
        if (activeSide === 'left') setLeftTimer(t => t + 1);
        else setRightTimer(t => t + 1);
      }, 1000);
    } else {
      if (breastTimerRef.current) clearInterval(breastTimerRef.current);
    }
    return () => {
      if (breastTimerRef.current) clearInterval(breastTimerRef.current);
    };
  }, [activeSide]);

  // Pumping timer uses global context now - no local effect needed

  const toggleBreastTimer = (side: 'left' | 'right') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeSide === side) setActiveSide(null);
    else setActiveSide(side);
  };

  const togglePumpingTimer = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (foodTimerContext.isRunning) {
      foodTimerContext.stop();
    } else {
      foodTimerContext.start('pumping');
    }
  };

  // Alias for easier access
  const isPumpingActive = foodTimerContext.isRunning && foodTimerContext.timerType === 'pumping';
  const pumpingTimer = foodTimerContext.elapsedSeconds;

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
    onClose();
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
            <Baby size={24} color={foodType === 'breast' ? '#fff' : '#9CA3AF'} strokeWidth={2} />
          </View>
          <Text style={[styles.foodTabText, foodType === 'breast' && styles.activeFoodTabText]}>הנקה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'bottle' && styles.activeFoodTab]}
          onPress={() => { setFoodType('bottle'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            <Milk size={24} color={foodType === 'bottle' ? '#fff' : '#9CA3AF'} strokeWidth={2} />
          </View>
          <Text style={[styles.foodTabText, foodType === 'bottle' && styles.activeFoodTabText]}>בקבוק</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'solids' && styles.activeFoodTab]}
          onPress={() => { setFoodType('solids'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            <Apple size={24} color={foodType === 'solids' ? '#fff' : '#9CA3AF'} strokeWidth={2} />
          </View>
          <Text style={[styles.foodTabText, foodType === 'solids' && styles.activeFoodTabText]}>מזון{"\n"}לתינוקות</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'pumping' && styles.activeFoodTab]}
          onPress={() => { setFoodType('pumping'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={styles.foodTabIconContainer}>
            {isPumpingActive ? (
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{formatTime(pumpingTimer)}</Text>
            ) : pumpingTimer > 0 ? (
              <Text style={{ color: foodType === 'pumping' ? '#fff' : '#6366F1', fontSize: 12, fontWeight: '600' }}>{formatTime(pumpingTimer)}</Text>
            ) : (
              <Droplets size={24} color={foodType === 'pumping' ? '#fff' : '#9CA3AF'} strokeWidth={2} />
            )}
          </View>
          <Text style={[styles.foodTabText, foodType === 'pumping' && styles.activeFoodTabText]}>שאיבה</Text>
        </TouchableOpacity>
      </View>

      {/* Bottle Content */}
      {foodType === 'bottle' && (
        <View style={styles.bottleContainer}>
          <Text style={styles.label}>כמה אכלנו?</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.bigInput}
              placeholder="0"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              textAlign="center"
            />
            <Text style={styles.unitText}>מ"ל</Text>
          </View>
          <View style={styles.presets}>
            {[90, 120, 150, 180, 210].map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.presetBtn, amount === val.toString() && styles.presetBtnActive]}
                onPress={() => {
                  setAmount(val.toString());
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.presetText, amount === val.toString() && styles.presetTextActive]}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Breast Content */}
      {foodType === 'breast' && (
        <View style={styles.breastContainer}>
          <TouchableOpacity
            style={[styles.breastBtn, activeSide === 'right' && styles.activeBreastBtn]}
            onPress={() => toggleBreastTimer('right')}
          >
            <Text style={[styles.breastLabel, activeSide === 'right' && styles.breastLabelActive]}>ימין</Text>
            <Text style={[styles.timerText, activeSide === 'right' && styles.timerTextActive]}>{formatTime(rightTimer)}</Text>
            {activeSide === 'right' ? <Pause size={24} color="#fff" /> : <Play size={24} color="#6366F1" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.breastBtn, activeSide === 'left' && styles.activeBreastBtn]}
            onPress={() => toggleBreastTimer('left')}
          >
            <Text style={[styles.breastLabel, activeSide === 'left' && styles.breastLabelActive]}>שמאל</Text>
            <Text style={[styles.timerText, activeSide === 'left' && styles.timerTextActive]}>{formatTime(leftTimer)}</Text>
            {activeSide === 'left' ? <Pause size={24} color="#fff" /> : <Play size={24} color="#6366F1" />}
          </TouchableOpacity>
        </View>
      )}

      {/* Pumping Content */}
      {foodType === 'pumping' && (
        <View style={styles.bottleContainer}>
          {/* Pumping Timer */}
          <TouchableOpacity
            style={[styles.pumpingTimerBtn, isPumpingActive && styles.pumpingTimerBtnActive]}
            onPress={togglePumpingTimer}
          >
            {isPumpingActive ? <Pause size={20} color="#fff" /> : <Play size={20} color="#6366F1" />}
            <Text style={[styles.pumpingTimerText, isPumpingActive && { color: '#fff' }]}>
              {formatTime(pumpingTimer)}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>כמה נשאב?</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.bigInput}
              placeholder="0"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              textAlign="center"
            />
            <Text style={styles.unitText}>מ"ל</Text>
          </View>
          <View style={styles.presets}>
            {[30, 60, 90, 120, 150].map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.presetBtn, amount === val.toString() && styles.presetBtnActive]}
                onPress={() => {
                  setAmount(val.toString());
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.presetText, amount === val.toString() && styles.presetTextActive]}>{val}</Text>
              </TouchableOpacity>
            ))}
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
          <View style={styles.solidsSuggestions}>
            {['דייסה', 'מחית', 'פירה', 'ביסקוויט', 'פירות'].map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.presetBtn, solidsFoodName === item && styles.presetBtnActive]}
                onPress={() => {
                  setSolidsFoodName(item);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.presetText, solidsFoodName === item && styles.presetTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
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

      {/* Timer Mode */}
      {sleepMode === 'timer' && (
        <View style={styles.sleepTimerSection}>
          <TouchableOpacity
            style={[styles.sleepTimerBig, sleepContext.isRunning && styles.sleepTimerBigActive]}
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
            {sleepContext.isRunning ? <Pause size={28} color="#fff" /> : <Play size={28} color="#6366F1" />}
            <Text style={[styles.sleepTimerBigText, sleepContext.isRunning && { color: '#fff' }]}>
              {sleepContext.isRunning ? sleepContext.formatTime(sleepContext.elapsedSeconds) : 'התחל'}
            </Text>
          </TouchableOpacity>
          {sleepContext.isRunning && (
            <Text style={styles.sleepTimerHint}>⏱️ הטיימר רץ - לחץ לעצירה</Text>
          )}
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

      {/* Time Range Mode - Start & End */}
      {sleepMode === 'timerange' && (
        <View style={styles.sleepTimeRangeSection}>
          <View style={styles.timeRangeRow}>
            <View style={styles.timeRangeItem}>
              <Text style={styles.timeRangeLabel}>🌙 הלך לישון</Text>
              <TextInput
                style={styles.timeRangeInput}
                placeholder="19:00"
                placeholderTextColor="#9CA3AF"
                value={sleepStartTime}
                onChangeText={setSleepStartTime}
                onBlur={() => {
                  // Auto-format on blur: 8 → 08:00, 19 → 19:00
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
            <Text style={styles.timeRangeArrow}>→</Text>
            <View style={styles.timeRangeItem}>
              <Text style={styles.timeRangeLabel}>☀️ קם</Text>
              <TextInput
                style={styles.timeRangeInput}
                placeholder="08:00"
                placeholderTextColor="#9CA3AF"
                value={sleepEndTime}
                onChangeText={setSleepEndTime}
                onBlur={() => {
                  // Auto-format on blur: 8 → 08:00, 19 → 19:00
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
          <Text style={styles.timeRangeHint}>הזן שעה (למשל 8 או 22:30)</Text>
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
    <Modal visible={visible} transparent animationType="none">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.card,
              opacity: slideAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
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

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: config.accent }]} onPress={handleSave}>
            <Check size={20} color="#fff" />
            <Text style={styles.saveBtnText}>שמור תיעוד</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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

  // Food Tabs (4 items)
  foodTabs: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  foodTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: '#F3F4F6' },
  activeFoodTab: { backgroundColor: '#6366F1' },
  foodTabIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodTabText: { fontSize: 13, color: '#6B7280', textAlign: 'center', fontWeight: '600' },
  activeFoodTabText: { color: '#fff' },

  // Bottle/Pumping
  bottleContainer: { alignItems: 'center' },
  inputWrapper: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  bigInput: { fontSize: 48, fontWeight: 'bold', color: '#1F2937', borderBottomWidth: 2, borderBottomColor: '#E5E7EB', width: 120, textAlign: 'center' },
  unitText: { fontSize: 18, color: '#6B7280', marginBottom: 12 },
  presets: { flexDirection: 'row', gap: 10, marginTop: 20 },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 12 },
  presetBtnActive: { backgroundColor: '#6366F1' },
  presetText: { fontWeight: '600', color: '#4B5563' },
  presetTextActive: { color: '#fff' },

  // Breast
  breastContainer: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  breastBtn: { width: 130, height: 150, backgroundColor: '#F3F4F6', borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8 },
  activeBreastBtn: { backgroundColor: '#6366F1' },
  breastLabel: { fontSize: 16, fontWeight: '600', color: '#4B5563' },
  breastLabelActive: { color: '#fff' },
  timerText: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  timerTextActive: { color: '#fff' },

  // Pumping Timer
  pumpingTimerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F3F4F6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, marginBottom: 24 },
  pumpingTimerBtnActive: { backgroundColor: '#6366F1' },
  pumpingTimerText: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

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
  sleepTimerBig: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F3F4F6', paddingVertical: 24, paddingHorizontal: 48, borderRadius: 24 },
  sleepTimerBigActive: { backgroundColor: '#6366F1' },
  sleepTimerBigText: { fontSize: 28, fontWeight: '800', color: '#1F2937' },

  sleepDurationSection: { marginVertical: 16 },
  sleepDurationRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 16 },
  sleepDurationItem: { alignItems: 'center' },
  sleepDurationLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  sleepDurationSeparator: { fontSize: 28, fontWeight: '700', color: '#D1D5DB', marginTop: 24 },

  sleepSlider: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4 },
  sleepSliderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sleepSliderBtnText: { fontSize: 20, fontWeight: '600', color: '#6366F1' },
  sleepSliderValue: { fontSize: 32, fontWeight: '800', color: '#1F2937', minWidth: 50, textAlign: 'center' },

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
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
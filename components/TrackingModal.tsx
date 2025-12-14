import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { X, Check, Droplets, Play, Pause, Baby, Moon, Utensils, Layers } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../context/SleepTimerContext';

interface TrackingModalProps {
  visible: boolean;
  type: 'food' | 'sleep' | 'diaper' | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const TYPE_CONFIG = {
  food: {
    title: 'תיעוד אוכל',
    emoji: '🍼',
    gradient: ['#FEF3C7', '#FDE68A'] as [string, string],
    accent: '#F59E0B',
  },
  sleep: {
    title: 'תיעוד שינה',
    emoji: '😴',
    gradient: ['#E0E7FF', '#C7D2FE'] as [string, string],
    accent: '#6366F1',
  },
  diaper: {
    title: 'החלפת חיתול',
    emoji: '🧷',
    gradient: ['#D1FAE5', '#A7F3D0'] as [string, string],
    accent: '#10B981',
  },
};

export default function TrackingModal({ visible, type, onClose, onSave }: TrackingModalProps) {
  // --- Food States ---
  const [foodType, setFoodType] = useState<'bottle' | 'breast' | 'pumping' | 'solids'>('bottle');
  const [amount, setAmount] = useState('');
  const [solidsFoodName, setSolidsFoodName] = useState('');

  // Breastfeeding Timers
  const [leftTimer, setLeftTimer] = useState(0);
  const [rightTimer, setRightTimer] = useState(0);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  const breastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Sleep Timer (GLOBAL) ---
  const sleepContext = useSleepTimer();

  // --- Diaper States ---
  const [subType, setSubType] = useState<string | null>(null);

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

  const toggleBreastTimer = (side: 'left' | 'right') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeSide === side) setActiveSide(null);
    else setActiveSide(side);
  };

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
        data.subType = 'pumping';
      } else if (foodType === 'solids') {
        data.note = solidsFoodName || 'מזון מוצקים';
        data.subType = 'solids';
      }
    } else if (type === 'sleep') {
      // Use global timer data
      data.note = sleepContext.elapsedSeconds > 0
        ? `משך שינה: ${sleepContext.formatTime(sleepContext.elapsedSeconds)}`
        : 'שינה חדשה';
      // Stop the timer when saving
      if (sleepContext.isRunning) {
        sleepContext.stop();
      }
    } else {
      data.subType = subType || 'default';
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
          <Text style={styles.foodTabEmoji}>🤱</Text>
          <Text style={[styles.foodTabText, foodType === 'breast' && styles.activeFoodTabText]}>הנקה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'bottle' && styles.activeFoodTab]}
          onPress={() => { setFoodType('bottle'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={styles.foodTabEmoji}>🍼</Text>
          <Text style={[styles.foodTabText, foodType === 'bottle' && styles.activeFoodTabText]}>בקבוק</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'solids' && styles.activeFoodTab]}
          onPress={() => { setFoodType('solids'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={styles.foodTabEmoji}>🥣</Text>
          <Text style={[styles.foodTabText, foodType === 'solids' && styles.activeFoodTabText]}>מזון{"\n"}לתינוקות</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'pumping' && styles.activeFoodTab]}
          onPress={() => { setFoodType('pumping'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={styles.foodTabEmoji}>🫙</Text>
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
            {[60, 90, 120, 150, 180].map(val => (
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

  // --- Sleep Content (uses global context) ---
  const renderSleepContent = () => (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Text style={styles.subtitle}>
        {sleepContext.isRunning ? '😴 התינוק ישנה...' : 'מפעילים טיימר או שומרים ידנית?'}
      </Text>
      <TouchableOpacity
        style={[styles.timerCircle, sleepContext.isRunning && styles.timerCircleActive]}
        onPress={() => {
          if (sleepContext.isRunning) {
            sleepContext.stop();
          } else {
            sleepContext.start();
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={sleepContext.isRunning ? ['#6366F1', '#4F46E5'] : ['#F3F4F6', '#E5E7EB']}
          style={styles.timerGradient}
        >
          <Text style={[styles.timerBigText, sleepContext.isRunning && { color: '#fff' }]}>
            {sleepContext.formatTime(sleepContext.elapsedSeconds)}
          </Text>
          <View style={{ marginTop: 8 }}>
            {sleepContext.isRunning ? <Pause size={32} color="#fff" /> : <Play size={32} color="#6366F1" />}
          </View>
        </LinearGradient>
      </TouchableOpacity>
      <Text style={styles.timerHint}>
        {sleepContext.isRunning ? 'הטיימר רץ ברקע! לחץ לעצירה ☸️' : 'לחץ על העיגול להתחלת מדידה ▶️'}
      </Text>
      {sleepContext.isRunning && (
        <Text style={styles.persistHint}>
          ✅ הטיימר ימשיך לרוץ גם אחרי סגירת המודל
        </Text>
      )}
    </View>
  );

  // --- Diaper Content ---
  const renderDiaperContent = () => (
    <View style={{ width: '100%' }}>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>מה היה?</Text>
      <View style={styles.diaperOptions}>
        {[
          { key: 'pee', label: 'פיפי 💧', color: '#3B82F6' },
          { key: 'poop', label: 'קקי 💩', color: '#8B5CF6' },
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
              opacity: slideAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>

          {/* Header */}
          <LinearGradient colors={config.gradient} style={styles.header}>
            <View style={styles.emojiCircle}>
              <Text style={styles.emoji}>{config.emoji}</Text>
            </View>
            <Text style={styles.title}>{config.title}</Text>
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
  foodTabEmoji: { fontSize: 24, marginBottom: 4 },
  foodTabText: { fontSize: 11, color: '#6B7280', fontWeight: '600', textAlign: 'center' },
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

  // Solids
  solidsContainer: { alignItems: 'center', width: '100%' },
  solidsInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  solidsSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },

  // Sleep
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

  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
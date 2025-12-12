import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Check, Droplets, Play, Pause, RotateCcw } from 'lucide-react-native';

interface TrackingModalProps {
  visible: boolean;
  type: 'food' | 'sleep' | 'diaper' | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function TrackingModal({ visible, type, onClose, onSave }: TrackingModalProps) {
  // --- Food States ---
  const [foodType, setFoodType] = useState<'bottle' | 'breast'>('bottle');
  const [amount, setAmount] = useState('');
  
  // Breastfeeding Timers
  const [leftTimer, setLeftTimer] = useState(0);
  const [rightTimer, setRightTimer] = useState(0);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  const breastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Sleep Timer ---
  const [isSleepTimerRunning, setIsSleepTimerRunning] = useState(false);
  const [sleepTimer, setSleepTimer] = useState(0);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Diaper States ---
  const [subType, setSubType] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      // איפוס מלא בפתיחה
      setSubType(null);
      setAmount('');
      setLeftTimer(0);
      setRightTimer(0);
      setSleepTimer(0);
      setActiveSide(null);
      setIsSleepTimerRunning(false);
      clearIntervals();
    }
  }, [visible]);

  const clearIntervals = () => {
    if (breastTimerRef.current) clearInterval(breastTimerRef.current);
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
  };

  // טיימר הנקה
  useEffect(() => {
    if (activeSide) {
      breastTimerRef.current = setInterval(() => {
        if (activeSide === 'left') setLeftTimer(t => t + 1);
        else setRightTimer(t => t + 1);
      }, 1000);
    } else {
      if (breastTimerRef.current) clearInterval(breastTimerRef.current);
    }
    return () => { if (breastTimerRef.current) clearInterval(breastTimerRef.current); };
  }, [activeSide]);

  // טיימר שינה
  useEffect(() => {
    if (isSleepTimerRunning) {
      sleepTimerRef.current = setInterval(() => {
        setSleepTimer(t => t + 1);
      }, 1000);
    } else {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    }
    return () => { if (sleepTimerRef.current) clearInterval(sleepTimerRef.current); };
  }, [isSleepTimerRunning]);

  const toggleBreastTimer = (side: 'left' | 'right') => {
    if (activeSide === side) setActiveSide(null);
    else setActiveSide(side);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSave = () => {
    if (!type) return;
    let data: any = { type, timestamp: new Date() };

    if (type === 'food') {
        if (foodType === 'bottle') {
            data.amount = amount ? `${amount} מ"ל` : 'לא צוין';
            data.subType = 'bottle';
        } else {
            data.note = `שמאל: ${formatTime(leftTimer)} | ימין: ${formatTime(rightTimer)}`;
            data.subType = 'breast';
        }
    } else if (type === 'sleep') {
        data.note = sleepTimer > 0 ? `משך שינה: ${formatTime(sleepTimer)}` : 'שינה חדשה';
    } else {
        data.subType = subType || 'default';
    }
    
    onSave(data);
    onClose();
  };

  // --- תוכן אוכל ---
  const renderFoodContent = () => (
    <View style={{width: '100%'}}>
        <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, foodType === 'bottle' && styles.activeTab]} onPress={() => setFoodType('bottle')}>
                <Text style={[styles.tabText, foodType === 'bottle' && styles.activeTabText]}>בקבוק 🍼</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, foodType === 'breast' && styles.activeTab]} onPress={() => setFoodType('breast')}>
                <Text style={[styles.tabText, foodType === 'breast' && styles.activeTabText]}>הנקה 🤱</Text>
            </TouchableOpacity>
        </View>

        {foodType === 'bottle' ? (
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
                        autoFocus
                    />
                    <Text style={styles.unitText}>מ"ל</Text>
                </View>
                <View style={styles.presets}>
                    {[60, 90, 120, 180].map(val => (
                        <TouchableOpacity key={val} style={styles.presetBtn} onPress={() => setAmount(val.toString())}>
                            <Text style={styles.presetText}>{val}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        ) : (
            <View style={styles.breastContainer}>
                <TouchableOpacity style={[styles.breastBtn, activeSide === 'right' && styles.activeBreastBtn]} onPress={() => toggleBreastTimer('right')}>
                    <Text style={styles.breastLabel}>ימין</Text>
                    <Text style={styles.timerText}>{formatTime(rightTimer)}</Text>
                    {activeSide === 'right' ? <Pause size={24} color="#fff" /> : <Play size={24} color="#4F46E5" />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.breastBtn, activeSide === 'left' && styles.activeBreastBtn]} onPress={() => toggleBreastTimer('left')}>
                    <Text style={styles.breastLabel}>שמאל</Text>
                    <Text style={styles.timerText}>{formatTime(leftTimer)}</Text>
                    {activeSide === 'left' ? <Pause size={24} color="#fff" /> : <Play size={24} color="#4F46E5" />}
                </TouchableOpacity>
            </View>
        )}
    </View>
  );

  // --- תוכן שינה (התיקון הגדול) ---
  const renderSleepContent = () => (
      <View style={{width: '100%', alignItems: 'center'}}>
          <Text style={styles.title}>לילה טוב 😴</Text>
          <Text style={styles.subtitle}>מפעילים טיימר או שומרים ידנית?</Text>
          
          <TouchableOpacity 
            style={[styles.timerCircle, isSleepTimerRunning && styles.timerCircleActive]} 
            onPress={() => setIsSleepTimerRunning(!isSleepTimerRunning)}
          >
              <Text style={[styles.timerBigText, isSleepTimerRunning && {color: '#fff'}]}>
                  {formatTime(sleepTimer)}
              </Text>
              <View style={{marginTop: 8}}>
                  {isSleepTimerRunning ? <Pause size={32} color="#fff" /> : <Play size={32} color="#6366F1" />}
              </View>
          </TouchableOpacity>
          
          <Text style={styles.timerHint}>{isSleepTimerRunning ? 'הטיימר רץ... לחץ לעצירה' : 'לחץ על העיגול להתחלת מדידה'}</Text>
      </View>
  );

  const renderContent = () => {
    switch (type) {
      case 'diaper':
        return (
          <>
            <Text style={styles.title}>החלפת חיתול 🚼</Text>
            <View style={styles.diaperGrid}>
              <TouchableOpacity style={[styles.diaperOption, subType === 'pee' && styles.selectedOption]} onPress={() => setSubType('pee')}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}><Droplets size={28} color="#0EA5E9" /></View>
                <Text style={styles.optionText}>רק פיפי</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.diaperOption, subType === 'poop' && styles.selectedOption]} onPress={() => setSubType('poop')}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}><Text style={{fontSize: 24}}>💩</Text></View>
                <Text style={styles.optionText}>קקי</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.diaperOption, subType === 'both' && styles.selectedOption]} onPress={() => setSubType('both')}>
                <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}><Text style={{fontSize: 24}}>🤢</Text></View>
                <Text style={styles.optionText}>גם וגם</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      case 'food': return renderFoodContent();
      case 'sleep': return renderSleepContent();
      default: return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}><X size={24} color="#9CA3AF" /></TouchableOpacity>
          <View style={styles.content}>{renderContent()}</View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>שמור תיעוד</Text>
            <Check size={20} color="#fff" style={{marginLeft: 8}} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
  closeBtn: { alignSelf: 'flex-end', padding: 8, backgroundColor: '#F3F4F6', borderRadius: 50 },
  content: { alignItems: 'center', marginBottom: 30, width: '100%' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  
  // Diaper
  diaperGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', gap: 12 },
  diaperOption: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingVertical: 20, alignItems: 'center', borderWidth: 2, borderColor: '#F3F4F6' },
  selectedOption: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  optionText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },

  // Food
  tabs: { flexDirection: 'row-reverse', backgroundColor: '#F3F4F6', borderRadius: 16, padding: 4, marginBottom: 24, width: '100%' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#4F46E5', fontWeight: '800' },
  
  bottleContainer: { alignItems: 'center', width: '100%' },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 20 },
  bigInput: { fontSize: 56, fontWeight: '800', color: '#111827', borderBottomWidth: 2, borderBottomColor: '#E5E7EB', width: 120, textAlign: 'center', paddingBottom: 0 },
  unitText: { fontSize: 24, color: '#9CA3AF', marginBottom: 10, marginLeft: 8, fontWeight: '600' },
  presets: { flexDirection: 'row', gap: 10 },
  presetBtn: { backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  presetText: { fontWeight: '700', color: '#4B5563' },

  breastContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 16, width: '100%' },
  breastBtn: { flex: 1, aspectRatio: 1, borderRadius: 24, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F3F4F6' },
  activeBreastBtn: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  breastLabel: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 4 },
  timerText: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },

  // Sleep Timer
  timerCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 4, borderColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  timerCircleActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  timerBigText: { fontSize: 40, fontWeight: '800', color: '#111827' },
  timerHint: { color: '#6B7280', fontSize: 14 },

  saveBtn: { flexDirection: 'row-reverse', backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', width: '100%' },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
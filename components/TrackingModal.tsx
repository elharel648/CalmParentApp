import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Platform 
} from 'react-native';
import { X, Play, Pause, StopCircle, Check, Clock, Baby, Droplet } from 'lucide-react-native';

interface TrackingModalProps {
  visible: boolean;
  type: 'food' | 'sleep' | 'diaper' | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function TrackingModal({ visible, type, onClose, onSave }: TrackingModalProps) {
  // --- סטייטים ---
  const [feedType, setFeedType] = useState<'bottle' | 'nursing'>('bottle');
  const [bottleAmount, setBottleAmount] = useState('120');
  const [nursingSide, setNursingSide] = useState<'left' | 'right' | null>(null);
  const [nursingTimer, setNursingTimer] = useState(0);
  const [isNursing, setIsNursing] = useState(false);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [isSleeping, setIsSleeping] = useState(false);
  const [diaperType, setDiaperType] = useState<'pee' | 'poop' | 'both' | null>(null);

  // איפוס סטייטים בפתיחה מחדש
  useEffect(() => {
    if (visible) {
      setFeedType('bottle');
      setBottleAmount('120');
      setNursingSide(null);
      setNursingTimer(0);
      setIsNursing(false);
      setSleepTimer(0);
      setIsSleeping(false);
      setDiaperType(null);
    }
  }, [visible, type]);

  // ניהול טיימרים
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNursing) {
      interval = setInterval(() => setNursingTimer(t => t + 1), 1000);
    } else if (isSleeping) {
      interval = setInterval(() => setSleepTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isNursing, isSleeping]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSave = () => {
    const data: any = { type, timestamp: new Date(), details: {} };

    if (type === 'food') {
      if (feedType === 'bottle') {
        data.details = { method: 'bottle', amount: parseInt(bottleAmount) || 0 };
      } else {
        if (!nursingSide || nursingTimer === 0) return alert('נא לבחור צד ולהפעיל טיימר');
        data.details = { method: 'nursing', side: nursingSide, duration: nursingTimer };
      }
    } else if (type === 'sleep') {
      if (sleepTimer === 0 && !isSleeping) return alert('לא תועדה שינה');
      data.details = { duration: sleepTimer };
    } else if (type === 'diaper') {
      if (!diaperType) return alert('נא לבחור סוג החתלה');
      data.details = { content: diaperType };
    }

    onSave(data);
    onClose();
  };

  const getTitle = () => {
    switch(type) {
      case 'food': return 'תיעוד ארוחה 🍼';
      case 'sleep': return 'תיעוד שינה 😴';
      case 'diaper': return 'החלפת חיתול 💩';
      default: return '';
    }
  };

  if (!visible || !type) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* כותרת */}
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#6b7280" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            
            {/* --- אוכל --- */}
            {type === 'food' && (
                <>
                    <View style={styles.tabs}>
                        <TouchableOpacity 
                            style={[styles.tab, feedType === 'bottle' && styles.activeTab]}
                            onPress={() => setFeedType('bottle')}
                        >
                            <Text style={[styles.tabText, feedType === 'bottle' && styles.activeTabText]}>בקבוק</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, feedType === 'nursing' && styles.activeTab]}
                            onPress={() => setFeedType('nursing')}
                        >
                            <Text style={[styles.tabText, feedType === 'nursing' && styles.activeTabText]}>הנקה</Text>
                        </TouchableOpacity>
                    </View>

                    {feedType === 'bottle' ? (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>כמות (מ״ל)</Text>
                            <TextInput 
                                style={styles.largeInput} 
                                value={bottleAmount}
                                onChangeText={setBottleAmount}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                        </View>
                    ) : (
                        <View style={styles.nursingContainer}>
                            <View style={styles.timerWrapper}>
                                <Text style={styles.hugeTimer}>{formatTime(nursingTimer)}</Text>
                            </View>
                            
                            <View style={styles.sideSelection}>
                                <TouchableOpacity 
                                    style={[styles.sideBtn, nursingSide === 'right' && styles.activeSideBtn('right')]}
                                    onPress={() => setNursingSide('right')}
                                >
                                    <Text style={[styles.sideText, nursingSide === 'right' && styles.activeSideText]}>ימין</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.sideBtn, nursingSide === 'left' && styles.activeSideBtn('left')]}
                                    onPress={() => setNursingSide('left')}
                                >
                                    <Text style={[styles.sideText, nursingSide === 'left' && styles.activeSideText]}>שמאל</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity 
                                style={[styles.timerControlBtn, isNursing ? styles.stopBtn : styles.startBtn]}
                                onPress={() => setIsNursing(!isNursing)}
                            >
                                {isNursing ? (
                                    <Pause color="#fff" size={32} />
                                ) : (
                                    <Play color="#fff" size={32} style={{marginLeft: 4}} />
                                )}
                            </TouchableOpacity>
                            <Text style={styles.timerControlText}>{isNursing ? 'השהה' : 'התחל'}</Text>
                        </View>
                    )}
                </>
            )}

            {/* --- שינה --- */}
            {type === 'sleep' && (
                <View style={styles.sleepContainer}>
                    <View style={styles.timerWrapper}>
                         <Text style={styles.hugeTimer}>{formatTime(sleepTimer)}</Text>
                    </View>
                    <Text style={styles.subText}>זמן שינה נוכחי</Text>
                    
                    <TouchableOpacity 
                        style={[styles.timerControlBtn, isSleeping ? styles.stopBtn : styles.startBtn]}
                        onPress={() => setIsSleeping(!isSleeping)}
                    >
                         {isSleeping ? (
                            <StopCircle color="#fff" size={32} />
                        ) : (
                            <Clock color="#fff" size={32} />
                        )}
                    </TouchableOpacity>
                    <Text style={styles.timerControlText}>{isSleeping ? 'התעורר' : 'התחל לישון'}</Text>
                </View>
            )}

            {/* --- חיתול --- */}
            {type === 'diaper' && (
                <View style={styles.diaperContainer}>
                    {[
                        { type: 'pee', icon: '💧', label: 'רק פיפי', color: '#3b82f6' },
                        { type: 'poop', icon: '💩', label: 'קקי', color: '#854d0e' },
                        { type: 'both', icon: '🤢', label: 'גם וגם', color: '#10b981' }
                    ].map((option) => (
                        <TouchableOpacity 
                            key={option.type}
                            style={[
                                styles.diaperCard, 
                                diaperType === option.type && { backgroundColor: `${option.color}15`, borderColor: option.color }
                            ]}
                            onPress={() => setDiaperType(option.type as any)}
                        >
                            <Text style={styles.diaperEmoji}>{option.icon}</Text>
                            <Text style={[styles.diaperLabel, diaperType === option.type && { color: option.color, fontWeight: 'bold' }]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* כפתור שמירה ראשי */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Check color="#fff" size={24} />
                <Text style={styles.saveText}>שמור תיעוד</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // Tabs
  tabs: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#4f46e5',
  },
  // Bottle
  inputContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 12,
  },
  largeInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#4f46e5',
    textAlign: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    width: '50%',
  },
  // Nursing & Sleep Timer
  nursingContainer: { alignItems: 'center' },
  sleepContainer: { alignItems: 'center' },
  timerWrapper: {
    marginBottom: 24,
  },
  hugeTimer: {
    fontSize: 64,
    fontWeight: '900',
    color: '#4f46e5',
    fontVariant: ['tabular-nums'],
  },
  subText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 32,
  },
  sideSelection: {
    flexDirection: 'row-reverse',
    gap: 16,
    marginBottom: 32,
    width: '100%',
    paddingHorizontal: 20,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  activeSideBtn: (side: 'left' | 'right') => ({
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  }),
  sideText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeSideText: {
    color: '#fff',
  },
  timerControlBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtn: { backgroundColor: '#10b981' },
  stopBtn: { backgroundColor: '#ef4444' },
  timerControlText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  // Diaper
  diaperContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 12,
  },
  diaperCard: {
    flex: 1,
    aspectRatio: 0.9,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#f3f4f6',
  },
  diaperEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  diaperLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  // Save Button
  saveButton: {
    flexDirection: 'row-reverse',
    backgroundColor: '#4f46e5',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  saveText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
  }
});
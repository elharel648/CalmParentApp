import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Easing, Vibration } from 'react-native';
import { X, Wind, Music, CheckCircle, Play, Pause } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

interface CalmModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalmModeModal({ visible, onClose }: CalmModeModalProps) {
  const [activeTab, setActiveTab] = useState<'noise' | 'breathe' | 'checklist'>('noise');
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // אנימציה לנשימה
  const breatheAnim = useRef(new Animated.Value(1)).current;

  // רשימת בדיקה
  const checklistItems = [
    "האם החיתול נקי?",
    "האם עברו פחות מ-3 שעות מהאוכל?",
    "האם חם/קר לו מדי? (בדיקה בעורף)",
    "האם יש משהו שמציק בבגד (תווית/שערה)?",
    "האם הוא פשוט עייף מדי (Over-tired)?",
    "נסה: חיבוק עור-לעור או מנשא"
  ];

  // ניהול סאונד (רעש לבן)
  useEffect(() => {
    return sound
      ? () => { sound.unloadAsync(); }
      : undefined;
  }, [sound]);

  const toggleSound = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      // כאן טוענים סאונד. שמתי לינק לדוגמה, מומלץ להחליף לקובץ מקומי assets/white_noise.mp3
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/water/rain_heavy_loud.ogg' },
        { shouldPlay: true, isLooping: true }
      );
      setSound(newSound);
      setIsPlaying(true);
    }
  };

  // ניהול נשימה
  useEffect(() => {
    let loop: Animated.CompositeAnimation;
    
    if (activeTab === 'breathe') {
      const breatheIn = Animated.timing(breatheAnim, {
        toValue: 1.5,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });

      const breatheOut = Animated.timing(breatheAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });

      loop = Animated.loop(Animated.sequence([breatheIn, breatheOut]));
      loop.start();

      // אינטרוול לרטט עדין
      const interval = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 4000);

      return () => {
        loop.stop();
        clearInterval(interval);
        breatheAnim.setValue(1);
      };
    }
  }, [activeTab]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* כותרת וסגירה */}
          <View style={styles.header}>
            <Text style={styles.title}>מצב רוגע (SOS)</Text>
            <TouchableOpacity onPress={() => {
                if(isPlaying && sound) sound.stopAsync();
                setIsPlaying(false);
                onClose();
            }}>
              <X color="#374151" size={24} />
            </TouchableOpacity>
          </View>

          {/* טאבים */}
          <View style={styles.tabs}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'noise' && styles.activeTab]} 
                onPress={() => setActiveTab('noise')}
            >
                <Music size={20} color={activeTab === 'noise' ? '#fff' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'noise' && styles.activeTabText]}>רעש לבן</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'breathe' && styles.activeTab]} 
                onPress={() => setActiveTab('breathe')}
            >
                <Wind size={20} color={activeTab === 'breathe' ? '#fff' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'breathe' && styles.activeTabText]}>נשימה</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.tab, activeTab === 'checklist' && styles.activeTab]} 
                onPress={() => setActiveTab('checklist')}
            >
                <CheckCircle size={20} color={activeTab === 'checklist' ? '#fff' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'checklist' && styles.activeTabText]}>צ'ק ליסט</Text>
            </TouchableOpacity>
          </View>

          {/* תוכן מתחלף */}
          <View style={styles.body}>
            
            {activeTab === 'noise' && (
              <View style={styles.centerContent}>
                <TouchableOpacity style={styles.playButton} onPress={toggleSound}>
                  {isPlaying ? <Pause size={40} color="#fff" /> : <Play size={40} color="#fff" style={{marginLeft: 4}} />}
                </TouchableOpacity>
                <Text style={styles.instructionText}>
                  {isPlaying ? "מנגן רעש לבן..." : "לחץ לניגון רעש מרגיע"}
                </Text>
              </View>
            )}

            {activeTab === 'breathe' && (
              <View style={styles.centerContent}>
                <Animated.View style={[styles.breathingCircle, { transform: [{ scale: breatheAnim }] }]}>
                  <Text style={styles.breatheText}>לנשום</Text>
                </Animated.View>
                <Text style={styles.instructionText}>שאף עמוק... ונשוף לאט</Text>
              </View>
            )}

            {activeTab === 'checklist' && (
              <View style={styles.listContainer}>
                {checklistItems.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    height: '70%',
  },
  header: {
    flexDirection: 'row-reverse', // RTL header fix
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabs: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 30,
    backgroundColor: '#f3f4f6',
    padding: 5,
    borderRadius: 15,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#4f46e5',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: 'white',
  },
  body: {
    flex: 1,
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  // עיצוב רעש לבן
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  // עיצוב נשימה
  breathingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  breatheText: {
    color: '#4f46e5',
    fontWeight: 'bold',
    fontSize: 18,
  },
  instructionText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 20,
  },
  // עיצוב צ'ק ליסט
  listContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
    marginLeft: 15,
  },
  listItemText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'right',
    flex: 1,
  },
});
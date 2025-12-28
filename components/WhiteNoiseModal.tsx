import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Platform, Animated } from 'react-native';
import { X, CloudRain, Wind, Heart, Fan, Volume2 } from 'lucide-react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface WhiteNoiseModalProps {
  visible: boolean;
  onClose: () => void;
}

// Sound file imports
const soundFiles = {
  rain: require('../assets/sounds/rain.mp3'),
  shh: require('../assets/sounds/shh.mp3'),
  heartbeat: require('../assets/sounds/heartbeat.mp3'),
  dryer: require('../assets/sounds/dryer.mp3'),
};

export default function WhiteNoiseModal({ visible, onClose }: WhiteNoiseModalProps) {
  const { theme } = useTheme();
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const sounds = [
    { id: 'rain', label: 'גשם', icon: CloudRain, color: '#60A5FA', bg: '#EFF6FF' },
    { id: 'shh', label: 'שששש', icon: Wind, color: '#A78BFA', bg: '#F5F3FF' },
    { id: 'heartbeat', label: 'דופק', icon: Heart, color: '#F472B6', bg: '#FDF2F8' },
    { id: 'dryer', label: 'מאוורר', icon: Fan, color: '#34D399', bg: '#ECFDF5' },
  ];

  // Pulse animation for active sound
  useEffect(() => {
    if (activeSound) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeSound]);

  // Setup audio mode
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.log('Error setting up audio mode:', error);
      }
    };
    setupAudio();
  }, []);

  // Cleanup sound on unmount or close
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Stop sound when modal closes
  useEffect(() => {
    if (!visible && soundRef.current) {
      stopSound();
    }
  }, [visible]);

  const stopSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setActiveSound(null);
    } catch (error) {
      console.log('Error stopping sound:', error);
    }
  };

  const playSound = async (id: string) => {
    try {
      setIsLoading(true);

      // Stop current sound if playing
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // If clicking same sound, just stop
      if (activeSound === id) {
        setActiveSound(null);
        setIsLoading(false);
        return;
      }

      // Load and play new sound
      const { sound } = await Audio.Sound.createAsync(
        soundFiles[id as keyof typeof soundFiles],
        {
          isLooping: true,
          volume: 0.8,
        }
      );

      soundRef.current = sound;
      await sound.playAsync();
      setActiveSound(id);

    } catch (error) {
      console.log('Error playing sound:', error);
      setActiveSound(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSound = async (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await playSound(id);
  };

  const handleClose = async () => {
    await stopSound();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Volume2 size={20} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>רעש לבן</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={theme.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Sound Grid */}
          <View style={styles.grid}>
            {sounds.map((sound) => {
              const isActive = activeSound === sound.id;
              const Icon = sound.icon;
              return (
                <Animated.View
                  key={sound.id}
                  style={[
                    { transform: [{ scale: isActive ? pulseAnim : 1 }] }
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.soundCard,
                      { backgroundColor: isActive ? sound.color : sound.bg },
                      isActive && styles.soundCardActive,
                    ]}
                    onPress={() => toggleSound(sound.id)}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <View style={[
                      styles.soundIcon,
                      { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#fff' }
                    ]}>
                      <Icon
                        size={24}
                        color={isActive ? '#fff' : sound.color}
                        strokeWidth={2}
                      />
                    </View>
                    <Text style={[
                      styles.soundLabel,
                      { color: isActive ? '#fff' : '#4B5563' }
                    ]}>
                      {sound.label}
                    </Text>
                    {isActive && (
                      <View style={styles.playingBadge}>
                        <View style={styles.playingDot} />
                        <Text style={styles.playingText}>מנגן</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Tip */}
          <Text style={styles.tip}>
            🎵 הסאונד ימשיך לנגן גם כשהמסך כבוי
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    marginRight: 12,
  },
  closeBtn: {
    padding: 6
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center'
  },
  soundCard: {
    width: 130,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  soundCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  soundIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  soundLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  playingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  playingText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  tip: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 20,
  },
});
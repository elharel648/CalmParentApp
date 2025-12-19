import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native';
import { X, CloudRain, Wind, Heart, Music, Play, Pause, Volume2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface WhiteNoiseModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WhiteNoiseModal({ visible, onClose }: WhiteNoiseModalProps) {
  const { theme } = useTheme();
  const [activeSound, setActiveSound] = useState<string | null>(null);

  const sounds = [
    { id: 'rain', label: 'גשם', icon: CloudRain, color: '#60A5FA', bg: '#EFF6FF' },
    { id: 'shh', label: 'שששש', icon: Wind, color: '#A78BFA', bg: '#F5F3FF' },
    { id: 'womb', label: 'דופק', icon: Heart, color: '#F472B6', bg: '#FDF2F8' },
    { id: 'dryer', label: 'מייבש', icon: Music, color: '#34D399', bg: '#ECFDF5' },
  ];

  const toggleSound = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveSound(activeSound === id ? null : id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Volume2 size={20} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>רעש לבן</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={theme.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Sound Grid */}
          <View style={styles.grid}>
            {sounds.map((sound) => {
              const isActive = activeSound === sound.id;
              const Icon = sound.icon;
              return (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.soundCard,
                    { backgroundColor: isActive ? sound.color : sound.bg }
                  ]}
                  onPress={() => toggleSound(sound.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.soundIcon, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#fff' }]}>
                    <Icon size={24} color={isActive ? '#fff' : sound.color} strokeWidth={2} />
                  </View>
                  <Text style={[styles.soundLabel, { color: isActive ? '#fff' : '#4B5563' }]}>{sound.label}</Text>
                  {isActive && (
                    <View style={styles.playingIndicator}>
                      <Pause size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8
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
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 16,
    alignItems: 'center',
  },
  soundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  soundLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  playingIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: 4,
  },
});
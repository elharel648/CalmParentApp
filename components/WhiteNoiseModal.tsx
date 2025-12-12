import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { X, CloudRain, Wind, Heart, Music, Play, Pause, Volume2 } from 'lucide-react-native';

interface WhiteNoiseModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WhiteNoiseModal({ visible, onClose }: WhiteNoiseModalProps) {
  const [activeSound, setActiveSound] = useState<string | null>(null);

  const sounds = [
    { id: 'rain', label: 'גשם כבד', icon: <CloudRain size={32} color="#60A5FA" />, bg: '#EFF6FF', border: '#BFDBFE' },
    { id: 'shh', label: 'שששש...', icon: <Wind size={32} color="#A78BFA" />, bg: '#F5F3FF', border: '#DDD6FE' },
    { id: 'womb', label: 'דופק רחם', icon: <Heart size={32} color="#F472B6" />, bg: '#FDF2F8', border: '#FBCFE8' },
    { id: 'dryer', label: 'מייבש שיער', icon: <Music size={32} color="#34D399" />, bg: '#ECFDF5', border: '#A7F3D0' },
  ];

  const toggleSound = (id: string) => {
    setActiveSound(activeSound === id ? null : id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>רעש לבן 🎵</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>לחץ לניגון/עצירה</Text>

          <View style={styles.grid}>
            {sounds.map((sound) => {
              const isActive = activeSound === sound.id;
              return (
                <TouchableOpacity 
                  key={sound.id} 
                  style={[
                    styles.soundCard, 
                    { backgroundColor: sound.bg, borderColor: isActive ? sound.border : 'transparent' },
                    isActive && styles.activeCard
                  ]}
                  onPress={() => toggleSound(sound.id)}
                >
                  <View style={styles.iconContainer}>
                    {sound.icon}
                    {isActive && <View style={styles.playingBadge}><Volume2 size={12} color="#fff" /></View>}
                  </View>
                  <Text style={[styles.soundLabel, isActive && styles.activeLabel]}>{sound.label}</Text>
                  <View style={[styles.playBtn, isActive && { backgroundColor: sound.border }]}>
                    {isActive ? <Pause size={16} color="#fff" /> : <Play size={16} color="#9CA3AF" />}
                  </View>
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
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 28, padding: 24, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 50 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24, textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  soundCard: { width: '48%', aspectRatio: 1, borderRadius: 24, padding: 16, alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: 'transparent' },
  activeCard: { transform: [{ scale: 1.02 }] },
  iconContainer: { position: 'relative' },
  playingBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#10B981', borderRadius: 10, padding: 4 },
  soundLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  activeLabel: { fontWeight: '800' },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
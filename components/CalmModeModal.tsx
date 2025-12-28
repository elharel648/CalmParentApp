import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Platform, Alert, Animated, Dimensions } from 'react-native';
import { X, Phone, Siren, Shield, Skull } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CalmModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalmModeModal({ visible, onClose }: CalmModeModalProps) {
  // Animations
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(400);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const makeCall = async (phoneNumber: string, name: string) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    const url = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        "סימולטור זוהה",
        `במכשיר אמיתי השיחה הייתה יוצאת ל${name}: ${phoneNumber}`,
        [{ text: "הבנתי" }]
      );
    }
  };

  const emergencyContacts = [
    { name: 'מד"א', subtitle: 'חירום רפואי', number: '101', Icon: Siren },
    { name: 'משטרה', subtitle: 'סכנה מיידית', number: '100', Icon: Shield },
    { name: 'הרעלות', subtitle: 'בליעת חומר', number: '048541900', Icon: Skull },
  ];

  const hmoContacts = [
    { name: 'כללית', subtitle: 'מוקד אחיות 24/7', number: '*2700' },
    { name: 'מכבי', subtitle: 'מוקד אחיות', number: '*3555' },
    { name: 'מאוחדת', subtitle: 'היריון ולידה', number: '*3833' },
    { name: 'לאומית', subtitle: 'מוקד רפואי', number: '*507' },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
          ]}
        >
          {/* Header - Ultra Minimalist */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.mainTitle}>מצב חירום</Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Emergency - Minimalist Row */}
            <Text style={styles.sectionTitle}>חירום מיידי</Text>
            <View style={styles.emergencyRow}>
              {emergencyContacts.map((contact, index) => {
                const { Icon } = contact;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.emergencyCard}
                    onPress={() => makeCall(contact.number, contact.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.emergencyIcon}>
                      <Icon size={24} color="#1F2937" strokeWidth={1.5} />
                    </View>
                    <Text style={styles.emergencyName}>{contact.name}</Text>
                    <Text style={styles.emergencyNumber}>{contact.number}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* HMO - Clean List */}
            <Text style={styles.sectionTitle}>קופות חולים</Text>
            {hmoContacts.map((hmo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.hmoRow}
                onPress={() => makeCall(hmo.number, hmo.name)}
                activeOpacity={0.7}
              >
                <View style={styles.hmoInfo}>
                  <Text style={styles.hmoName}>{hmo.name}</Text>
                  <Text style={styles.hmoSubtitle}>{hmo.subtitle}</Text>
                </View>
                <View style={styles.hmoCall}>
                  <Phone size={14} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.hmoNumber}>{hmo.number}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },

  // Header - Minimal
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.3,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Emergency Row - Minimalist
  emergencyRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 28,
  },
  emergencyCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emergencyName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  emergencyNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 4,
  },

  // HMO List - Clean
  hmoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  hmoInfo: {
    alignItems: 'flex-end',
  },
  hmoName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  hmoSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  hmoCall: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  hmoNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
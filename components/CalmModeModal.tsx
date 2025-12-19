import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Platform, Alert, Animated } from 'react-native';
import { X, Phone, ListChecks, Siren, Stethoscope, Activity, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface CalmModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalmModeModal({ visible, onClose }: CalmModeModalProps) {
  const [activeTab, setActiveTab] = useState<'emergency' | 'checklist'>('emergency');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  // Pulse animation for emergency buttons
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset state
      setCheckedItems(new Set());

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for emergency feel
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
      pulseLoop.start();

      return () => pulseLoop.stop();
    }
  }, [visible, fadeAnim, pulseAnim]);

  const makeCall = async (phoneNumber: string, name: string) => {
    // Haptic feedback
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

  const toggleCheckItem = (index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const emergencyContacts = [
    {
      name: 'מד"א',
      subtitle: 'חירום רפואי',
      number: '101',
      gradient: ['#EF4444', '#DC2626'] as [string, string],
      icon: <Siren size={28} color="#fff" />,
    },
    {
      name: 'משטרה',
      subtitle: 'סכנה מיידית',
      number: '100',
      gradient: ['#3B82F6', '#2563EB'] as [string, string],
      icon: <Activity size={28} color="#fff" />,
    },
    {
      name: 'מוקד הרעלות',
      subtitle: 'בליעת חומר',
      number: '048541900',
      gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
      icon: <Text style={{ fontSize: 24 }}>☠️</Text>,
    },
  ];

  const hmoContacts = [
    { name: 'כללית', subtitle: 'מוקד אחיות 24/7', number: '*2700', color: '#E0F2FE' },
    { name: 'מכבי', subtitle: 'מוקד אחיות', number: '*3555', color: '#FEF3C7' },
    { name: 'מאוחדת', subtitle: 'היריון ולידה', number: '*3833', color: '#FCE7F3' },
    { name: 'לאומית', subtitle: 'מוקד רפואי', number: '*507', color: '#DCFCE7' },
  ];

  const checklistItems = [
    { text: "האם החיתול נקי?", emoji: "🧷" },
    { text: "האם עברו פחות מ-3 שעות מהאוכל?", emoji: "🍼" },
    { text: "האם חם/קר לו מדי? (בדיקה בעורף)", emoji: "🌡️" },
    { text: "האם יש שערה כרוכה באצבעות?", emoji: "👆" },
    { text: "האם הוא פשוט עייף מדי (Over-tired)?", emoji: "😴" },
    { text: "האם כואב לו משהו? (אוזניים/שיניים)", emoji: "🦷" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="סגור"
          >
            <X size={22} color="#374151" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>מצב חירום</Text>
            <Text style={styles.subtitle}>אנחנו כאן לעזור 💪</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'emergency' && styles.activeTab]}
            onPress={() => setActiveTab('emergency')}
          >
            <Phone size={18} color={activeTab === 'emergency' ? '#fff' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'emergency' && styles.activeTabText]}>
              טלפונים
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'checklist' && styles.activeTab]}
            onPress={() => setActiveTab('checklist')}
          >
            <ListChecks size={18} color={activeTab === 'checklist' ? '#fff' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'checklist' && styles.activeTabText]}>
              צ'קליסט בכי
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
          {activeTab === 'emergency' ? (
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              {/* Emergency contacts - Big buttons with pulse */}
              <Text style={styles.sectionHeader}>🚨 חירום מיידי</Text>
              <View style={styles.emergencyGrid}>
                {emergencyContacts.map((contact, index) => (
                  <Animated.View
                    key={index}
                    style={{ transform: [{ scale: pulseAnim }] }}
                  >
                    <TouchableOpacity
                      style={styles.emergencyCard}
                      onPress={() => makeCall(contact.number, contact.name)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={contact.gradient}
                        style={styles.emergencyGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.emergencyIconContainer}>
                          {contact.icon}
                        </View>
                        <Text style={styles.emergencyName}>{contact.name}</Text>
                        <Text style={styles.emergencySubtitle}>{contact.subtitle}</Text>
                        <Text style={styles.emergencyNumber}>{contact.number}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              {/* HMO contacts */}
              <Text style={styles.sectionHeader}>🏥 מוקד קופת חולים</Text>
              <View style={styles.hmoList}>
                {hmoContacts.map((hmo, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.hmoRow}
                    onPress={() => makeCall(hmo.number, hmo.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.hmoIcon, { backgroundColor: hmo.color }]}>
                      <Stethoscope size={18} color="#374151" />
                    </View>
                    <View style={styles.hmoInfo}>
                      <Text style={styles.hmoName}>{hmo.name}</Text>
                      <Text style={styles.hmoSubtitle}>{hmo.subtitle}</Text>
                    </View>
                    <View style={styles.callBtn}>
                      <Phone size={14} color="#fff" />
                      <Text style={styles.callBtnText}>{hmo.number}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeader}>📋 בדיקה לפני פאניקה</Text>
              <Text style={styles.checklistHint}>סמן כל דבר שבדקת ✓</Text>

              {checklistItems.map((item, index) => {
                const isChecked = checkedItems.has(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.checkRow, isChecked && styles.checkRowChecked]}
                    onPress={() => toggleCheckItem(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <CheckCircle size={20} color="#fff" />}
                    </View>
                    <Text style={styles.checkEmoji}>{item.emoji}</Text>
                    <Text style={[styles.checkText, isChecked && styles.checkTextChecked]}>
                      {item.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {checkedItems.size === checklistItems.length && (
                <View style={styles.allCheckedContainer}>
                  <Text style={styles.allCheckedText}>
                    בדקת הכל ועדיין בוכה? 🤗{'\n'}
                    לפעמים תינוקות פשוט צריכים לבכות קצת.{'\n'}
                    נשום עמוק, אתה הורה מדהים!
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
  },
  titleContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Tabs - Premium Pills
  tabsContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#EF4444',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#fff',
  },

  // Content
  contentArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'right',
    width: '100%',
  },

  // Emergency cards
  emergencyGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  emergencyCard: {
    width: 105,
    height: 130,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  emergencyGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  emergencyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emergencyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  emergencySubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  emergencyNumber: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
  },

  // HMO list
  hmoList: {
    gap: 10,
  },
  hmoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  hmoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hmoInfo: {
    flex: 1,
    marginRight: 12,
  },
  hmoName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    color: '#1F2937',
  },
  hmoSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  callBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Checklist
  checklistHint: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 16,
  },
  checkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  checkRowChecked: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkEmoji: {
    fontSize: 20,
    marginRight: 12,
    marginLeft: 8,
  },
  checkText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'right',
    flex: 1,
    fontWeight: '500',
  },
  checkTextChecked: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  allCheckedContainer: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 16,
    marginTop: 10,
  },
  allCheckedText: {
    textAlign: 'center',
    color: '#92400E',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
});
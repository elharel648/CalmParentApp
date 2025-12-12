import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Platform, Alert } from 'react-native';
import { X, Phone, ListChecks, Siren, Stethoscope, Activity } from 'lucide-react-native';

interface CalmModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalmModeModal({ visible, onClose }: CalmModeModalProps) {
  const [activeTab, setActiveTab] = useState<'emergency' | 'checklist'>('emergency');

  const makeCall = async (phoneNumber: string) => {
    const url = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      // הודעה מיוחדת לסימולטור
      Alert.alert(
        "סימולטור זוהה", 
        `במכשיר אמיתי השיחה הייתה יוצאת למספר: ${phoneNumber}`,
        [{ text: "הבנתי" }]
      );
    }
  };

  const emergencyContacts = [
    { name: 'מד"א (חירום)', number: '101', icon: <Siren size={24} color="#EF4444" />, color: '#FEE2E2' },
    { name: 'משטרה', number: '100', icon: <Activity size={24} color="#3B82F6" />, color: '#DBEAFE' },
    { name: 'מוקד הרעלים', number: '048541900', icon: <Text style={{fontSize:20}}>☠️</Text>, color: '#F3E8FF' },
  ];

  const hmoContacts = [
    { name: 'כללית - אחיות', number: '*2700', color: '#E0F2FE' },
    { name: 'מכבי - אחיות', number: '*3555', color: '#FEF3C7' },
    { name: 'מאוחדת - היריון', number: '*3833', color: '#FCE7F3' },
    { name: 'לאומית', number: '*507', color: '#DCFCE7' },
  ];

  const checklistItems = [
    "האם החיתול נקי?",
    "האם עברו פחות מ-3 שעות מהאוכל?",
    "האם חם/קר לו מדי? (בדיקה בעורף)",
    "האם יש שערה כרוכה באצבעות?",
    "האם הוא פשוט עייף מדי (Over-tired)?",
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={24} color="#374151" /></TouchableOpacity>
          <Text style={styles.mainTitle}>מצב חירום / SOS 🚨</Text>
          <View style={{width: 24}} /> 
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'emergency' && styles.activeTab]} onPress={() => setActiveTab('emergency')}>
            <Phone size={20} color={activeTab === 'emergency' ? '#fff' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'emergency' && styles.activeTabText]}>טלפונים</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'checklist' && styles.activeTab]} onPress={() => setActiveTab('checklist')}>
            <ListChecks size={20} color={activeTab === 'checklist' ? '#fff' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'checklist' && styles.activeTabText]}>בדיקה</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentArea}>
          {activeTab === 'emergency' ? (
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <Text style={styles.sectionHeader}>📞 עזרה דחופה</Text>
              <View style={styles.grid}>
                {emergencyContacts.map((contact, index) => (
                  <TouchableOpacity key={index} style={[styles.contactCard, { backgroundColor: contact.color }]} onPress={() => makeCall(contact.number)}>
                    {contact.icon}
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sectionHeader}>🏥 מוקד אחיות</Text>
              <View style={styles.listContainer}>
                {hmoContacts.map((hmo, index) => (
                  <TouchableOpacity key={index} style={styles.hmoRow} onPress={() => makeCall(hmo.number)}>
                    <View style={[styles.hmoIcon, { backgroundColor: hmo.color }]}><Stethoscope size={20} color="#374151" /></View>
                    <Text style={styles.hmoName}>{hmo.name}</Text>
                    <View style={styles.callBtn}><Phone size={16} color="#fff" /><Text style={styles.callBtnText}>חייג</Text></View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <Text style={styles.sectionHeader}>📋 צ'ק ליסט בכי</Text>
              {checklistItems.map((item, index) => (
                <View key={index} style={styles.checkRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.checkText}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 20 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  closeButton: { padding: 8, backgroundColor: '#E5E7EB', borderRadius: 20 },
  mainTitle: { fontSize: 20, fontWeight: '800', color: '#EF4444' },
  tabsContainer: { flexDirection: 'row-reverse', paddingHorizontal: 20, marginBottom: 20, gap: 10 },
  tab: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  activeTab: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#fff' },
  contentArea: { flex: 1, paddingHorizontal: 20 },
  scrollContainer: { paddingBottom: 40 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15, textAlign: 'right', width: '100%' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
  contactCard: { width: '30%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 }, // כרטיסים קטנים יותר
  contactName: { fontSize: 12, fontWeight: 'bold', color: '#1F2937', textAlign: 'center' },
  contactNumber: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  listContainer: { gap: 10 },
  hmoRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, justifyContent: 'space-between', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  hmoIcon: { padding: 8, borderRadius: 10 },
  hmoName: { flex: 1, marginRight: 12, fontSize: 16, fontWeight: '600', textAlign: 'right', color: '#374151' },
  callBtn: { flexDirection: 'row-reverse', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 4 },
  callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  checkRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1', marginLeft: 12 },
  checkText: { fontSize: 16, color: '#374151', textAlign: 'right', flex: 1 },
});
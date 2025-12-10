import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Moon, Share2, MessageCircle, Star, LogOut, Trash2, ChevronLeft } from 'lucide-react-native';

const SettingRow = ({ icon: Icon, label, isSwitch, value, onToggle, isDestructive }: any) => (
  <TouchableOpacity style={styles.settingRow} onPress={!isSwitch ? onToggle : undefined}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
       {isSwitch && <Switch value={value} onValueChange={onToggle} trackColor={{false: '#e5e7eb', true: '#4f46e5'}} />}
       {!isSwitch && <ChevronLeft size={20} color="#9ca3af" />}
    </View>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
       <Text style={[styles.settingLabel, isDestructive && {color: '#ef4444'}]}>{label}</Text>
       <View style={[styles.settingIconBox, isDestructive && {backgroundColor: '#fee2e2'}]}>
          <Icon size={20} color={isDestructive ? '#ef4444' : '#4b5563'} />
       </View>
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.simpleHeader, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.simpleTitle}>הגדרות</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.settingsProfileCard}>
           <Image source={{uri: 'https://images.unsplash.com/photo-1522771753035-4a5000b5ad88?q=80&w=200&auto=format&fit=crop'}} style={styles.settingsAvatar} />
           <View><Text style={styles.settingsName}>עלמא</Text><Text style={styles.settingsSub}>הורה ראשי</Text></View>
        </View>
        <Text style={styles.settingsSectionTitle}>כללי</Text>
        <View style={styles.settingsGroup}>
           <SettingRow icon={Bell} label="קבלת התראות" isSwitch value={notifications} onToggle={() => setNotifications(!notifications)} />
           <SettingRow icon={Moon} label="מצב לילה" isSwitch value={darkMode} onToggle={() => setDarkMode(!darkMode)} />
        </View>
        <Text style={styles.settingsSectionTitle}>שיתוף ותמיכה</Text>
        <View style={styles.settingsGroup}>
           <SettingRow icon={Share2} label="שתף גישה" onToggle={() => Alert.alert('שיתוף', 'קישור נשלח!')} />
           <SettingRow icon={MessageCircle} label="צור קשר" onToggle={() => {}} />
           <SettingRow icon={Star} label="דרג אותנו" onToggle={() => {}} />
        </View>
        <Text style={styles.settingsSectionTitle}>איזור מסוכן</Text>
        <View style={styles.settingsGroup}>
           <SettingRow icon={LogOut} label="התנתק" isDestructive onToggle={() => Alert.alert('התנתקות', 'האם אתה בטוח?')} />
           <SettingRow icon={Trash2} label="מחק חשבון" isDestructive onToggle={() => Alert.alert('מחיקה', 'בלתי הפיך')} />
        </View>
        <Text style={styles.versionText}>גרסה 1.0.0 (Beta)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  simpleHeader: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  simpleTitle: { fontSize: 24, fontWeight: '900', textAlign: 'right' },
  settingsProfileCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 20, marginBottom: 24, gap: 16 },
  settingsAvatar: { width: 56, height: 56, borderRadius: 28 },
  settingsName: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  settingsSub: { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  settingsSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#9ca3af', textAlign: 'right', marginBottom: 8, marginTop: 16 },
  settingsGroup: { backgroundColor: 'white', borderRadius: 20, overflow: 'hidden' },
  settingRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  settingIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  versionText: { textAlign: 'center', marginTop: 40, color: '#d1d5db', fontSize: 12, fontWeight: '600' },
});
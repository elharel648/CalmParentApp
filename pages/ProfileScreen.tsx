import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Camera, Crown, Activity, TrendingUp, Star, Ruler, Weight, Smile, ShieldCheck, Syringe, Edit2, Image as ImageIcon, Plus } from 'lucide-react-native';

const GrowthCard = ({ icon: Icon, label, value, unit, color, iconColor }: any) => (
  <View style={styles.growthCard}>
    <View style={styles.growthHeader}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Icon size={20} color="white" />
      </View>
      <TouchableOpacity>
        <Edit2 size={16} color="#e5e7eb" />
      </TouchableOpacity>
    </View>
    <View>
      <Text style={styles.growthLabel}>{label}</Text>
      <View style={styles.growthValueContainer}>
        <Text style={styles.growthValue}>{value}</Text>
        <Text style={styles.growthUnit}>{unit}</Text>
      </View>
    </View>
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: '70%', backgroundColor: iconColor }]} />
    </View>
    <View style={styles.percentileRow}>
      <Text style={styles.percentileText}>רגיל</Text>
      <Text style={styles.percentileText}>82%</Text>
    </View>
  </View>
);

const VaccineRow = ({ name, date, completed }: any) => (
  <View style={styles.vaccineRow}>
    <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 12}}>
      <View style={[styles.checkbox, completed && styles.checkboxChecked]}>
        {completed && <View style={styles.checkboxInner} />}
      </View>
      <View>
        <Text style={[styles.vaccineName, completed && {color: '#111827'}]}>{name}</Text>
        <Text style={styles.vaccineDate}>{date}</Text>
      </View>
    </View>
  </View>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const child = { name: 'עלמא', age: 'בת 4 חודשים', avatar: 'https://images.unsplash.com/photo-1522771753035-4a5000b5ad88?q=80&w=200&auto=format&fit=crop', weight: '3.0', height: '50', head: '35', teeth: '0' };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeaderContainer}>
          <LinearGradient colors={['#1e1b4b', '#4338ca']} style={StyleSheet.absoluteFill} />
          <View style={[styles.profileNavBar, { marginTop: insets.top + 10 }]}>
            <TouchableOpacity style={styles.navButton}><Settings size={24} color="white" /></TouchableOpacity>
            <Text style={styles.navTitle}>פרופיל אישי</Text>
            <View style={{width: 40}} /> 
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing1} /><View style={styles.avatarRing2} />
              <Image source={{ uri: child.avatar }} style={styles.profileAvatar} />
              <View style={styles.cameraButton}><Camera size={16} color="white" /></View>
            </View>
            <Text style={styles.profileName}>{child.name}</Text>
            <View style={styles.ageBadge}><Crown size={14} color="#fcd34d" /><Text style={styles.ageText}>{child.age}</Text></View>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}><Activity size={22} color="#6366f1" style={{marginBottom: 4}} /><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>תיעודים</Text></View>
          <View style={styles.divider} />
          <View style={styles.statItem}><TrendingUp size={22} color="#10b981" style={{marginBottom: 4}} /><Text style={styles.statValue}>0%</Text><Text style={styles.statLabel}>עקביות</Text></View>
          <View style={styles.divider} />
          <View style={styles.statItem}><Star size={22} color="#f59e0b" style={{marginBottom: 4}} /><Text style={styles.statValue}>4.3</Text><Text style={styles.statLabel}>בריאות</Text></View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>מדדי גדילה</Text><Ruler size={18} color="#6366f1" /></View>
          <View style={styles.grid}>
            <GrowthCard icon={Weight} label="משקל" value={child.weight} unit="ק״ג" color="#3b82f6" iconColor="#3b82f6" />
            <GrowthCard icon={Ruler} label="גובה" value={child.height} unit="ס״מ" color="#f97316" iconColor="#f97316" />
            <GrowthCard icon={Activity} label="היקף ראש" value={child.head} unit="ס״מ" color="#8b5cf6" iconColor="#8b5cf6" />
            <GrowthCard icon={Smile} label="שיניים" value={child.teeth} unit="שיניים" color="#10b981" iconColor="#10b981" />
          </View>
        </View>
        <View style={styles.medicalCard}>
          <View style={styles.medicalHeader}>
            <View><Text style={styles.medicalTitle}>תיק רפואי</Text><Text style={styles.medicalSubtitle}>חיסונים ורגישויות</Text></View>
            <View style={styles.medicalIconBox}><ShieldCheck size={24} color="#ef4444" /></View>
          </View>
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { borderColor: '#fee2e2', backgroundColor: 'white' }]}><Text style={styles.badgeLabel}>סוג דם</Text><Text style={[styles.badgeValue, { color: '#ef4444' }]}>לא ידוע</Text></View>
            <View style={[styles.badge, { borderColor: '#fef3c7', backgroundColor: 'white' }]}><Text style={[styles.badgeLabel, { color: '#d97706' }]}>רגישויות</Text><Text style={[styles.badgeValue, { color: '#b45309' }]}>אין</Text></View>
          </View>
          <View style={styles.vaccineList}>
            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 12}}><Syringe size={16} color="#10b981" /><Text style={{fontSize: 14, fontWeight: 'bold', color: '#374151'}}>פנקס חיסונים</Text></View>
            <VaccineRow name="הפטיטיס B (מנה 1)" date="גיל: לידה" completed={false} />
            <VaccineRow name="הפטיטיס B (מנה 2)" date="גיל: חודש 1" completed={false} />
            <VaccineRow name="מחומשת + רוטה + פרבנר" date="גיל: חודשיים" completed={false} />
            <TouchableOpacity><Text style={{color: '#4f46e5', textAlign: 'center', marginTop: 10, fontWeight: '600'}}>הצג עוד 3 חיסונים...</Text></TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>אבני דרך</Text><Star size={18} color="#f97316" /></View>
          <View style={styles.addMilestoneContainer}><TouchableOpacity style={styles.addMilestoneBtn}><Plus size={32} color="#9ca3af" /><Text style={styles.addMilestoneText}>הוסף חדש</Text></TouchableOpacity></View>
        </View>
        <View style={styles.albumContainer}>
          <Image source={{uri: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800&auto=format&fit=crop'}} style={styles.albumImage} />
          <View style={styles.albumOverlay}><View style={styles.albumIcon}><ImageIcon size={24} color="white" /></View><View><Text style={styles.albumTitle}>האלבום שלי</Text><Text style={styles.albumSubtitle}>12 חודשים של רגעים קסומים</Text></View></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  profileHeaderContainer: { height: 300, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', paddingHorizontal: 20 },
  profileNavBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  navTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  profileInfo: { alignItems: 'center', marginTop: 10 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  profileAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: 'white' },
  avatarRing1: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', zIndex: -1 },
  avatarRing2: { position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', zIndex: -2 },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4f46e5', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#1e1b4b' },
  profileName: { fontSize: 28, fontWeight: '900', color: 'white', marginBottom: 6 },
  ageBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, gap: 6 },
  ageText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  statsContainer: { flexDirection: 'row-reverse', backgroundColor: 'white', marginHorizontal: 20, marginTop: -40, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  divider: { width: 1, height: 30, backgroundColor: '#f3f4f6' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#1f2937' },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: 'bold', marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  growthCard: { width: '48%', backgroundColor: 'white', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  growthHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
  iconContainer: { padding: 8, borderRadius: 12 },
  growthLabel: { fontSize: 12, color: '#9ca3af', fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  growthValueContainer: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 },
  growthValue: { fontSize: 24, fontWeight: '900', color: '#111827' },
  growthUnit: { fontSize: 12, color: '#6b7280' },
  progressBarBg: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, marginTop: 12 },
  progressBarFill: { height: '100%', borderRadius: 2 },
  percentileRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 },
  percentileText: { fontSize: 10, color: '#9ca3af', fontWeight: 'bold' },
  medicalCard: { marginHorizontal: 20, marginTop: 24, backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  medicalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  medicalTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937', textAlign: 'right' },
  medicalSubtitle: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  medicalIconBox: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 16 },
  badgesRow: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
  badge: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'flex-end' },
  badgeLabel: { fontSize: 11, fontWeight: 'bold', color: '#6b7280', marginBottom: 4 },
  badgeValue: { fontSize: 16, fontWeight: '900' },
  vaccineList: { gap: 10 },
  vaccineRow: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 16 },
  vaccineName: { fontSize: 14, fontWeight: '700', color: '#9ca3af', textAlign: 'right' },
  vaccineDate: { fontSize: 11, color: '#d1d5db', textAlign: 'right' },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: '#10b981', backgroundColor: '#10b981' },
  checkboxInner: { width: 8, height: 8, backgroundColor: 'white', borderRadius: 4 },
  addMilestoneContainer: { alignItems: 'flex-end', marginTop: 10 },
  addMilestoneBtn: { width: 120, height: 110, borderRadius: 20, borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white' },
  addMilestoneText: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af' },
  albumContainer: { marginHorizontal: 20, marginTop: 24, height: 160, borderRadius: 32, overflow: 'hidden' },
  albumImage: { width: '100%', height: '100%' },
  albumOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(30, 27, 75, 0.6)', flexDirection: 'row-reverse', alignItems: 'center', padding: 24, gap: 16 },
  albumIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',  borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  albumTitle: { fontSize: 22, fontWeight: '900', color: 'white', textAlign: 'right' },
  albumSubtitle: { fontSize: 13, color: '#e0e7ff', textAlign: 'right' },
});
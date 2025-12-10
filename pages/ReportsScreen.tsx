import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Baby, Moon, Activity, BarChart2, Clock, Calendar, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('general'); // general | sleep | feed

  // נתונים לגרף
  const data = [12, 14, 11, 15, 13, 10, 14.5];
  const maxVal = Math.max(...data);
  const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.reportsHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.dateSelector}>
           <TouchableOpacity><ChevronRight size={20} color="#9ca3af" /></TouchableOpacity>
           <Text style={styles.dateText}>7 ימים אחרונים • 10.12.2025</Text>
           <TouchableOpacity><Calendar size={20} color="#374151" /></TouchableOpacity>
        </View>
        <Text style={styles.reportsTitle}>מרכז נתונים</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* טאבים סגולים */}
        <View style={styles.tabsWrapper}>
           <TouchableOpacity onPress={() => setActiveTab('feed')} style={[styles.reportTab, activeTab === 'feed' && styles.reportTabActive]}>
              <Text style={[styles.reportTabText, activeTab === 'feed' && styles.reportTabTextActive]}>תזונה</Text>
              <Baby size={16} color={activeTab === 'feed' ? 'white' : '#6b7280'} />
           </TouchableOpacity>
           <TouchableOpacity onPress={() => setActiveTab('sleep')} style={[styles.reportTab, activeTab === 'sleep' && styles.reportTabActive]}>
              <Text style={[styles.reportTabText, activeTab === 'sleep' && styles.reportTabTextActive]}>שינה</Text>
              <Moon size={16} color={activeTab === 'sleep' ? 'white' : '#6b7280'} />
           </TouchableOpacity>
           <TouchableOpacity onPress={() => setActiveTab('general')} style={[styles.reportTab, activeTab === 'general' && styles.reportTabActive]}>
              <Text style={[styles.reportTabText, activeTab === 'general' && styles.reportTabTextActive]}>כללי</Text>
              <Activity size={16} color={activeTab === 'general' ? 'white' : '#6b7280'} />
           </TouchableOpacity>
        </View>

        {/* גרף עמודות */}
        <View style={styles.chartCard}>
           <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>שעות שינה</Text>
              <Moon size={20} color="#4f46e5" />
           </View>
           <Text style={styles.chartSubtitle}>ממוצע שבועי: 12.8 שעות</Text>
           
           <View style={styles.barChartContainer}>
              {data.map((val, index) => (
                 <View key={index} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                       <LinearGradient
                          colors={['#6366f1', '#818cf8']}
                          style={[styles.barFill, { height: `${(val / maxVal) * 100}%` }]}
                       />
                    </View>
                    <Text style={styles.barLabel}>{days[index]}</Text>
                 </View>
              ))}
           </View>
        </View>

        {/* כרטיסיות סיכום */}
        <View style={styles.statsGrid}>
           <View style={styles.statBox}>
              <View style={[styles.statIcon, {backgroundColor: '#e0e7ff'}]}><Clock size={20} color="#4f46e5" /></View>
              <Text style={styles.statBoxValue}>0.0</Text>
              <Text style={styles.statBoxLabel}>ממוצע שעות שינה</Text>
           </View>
           <View style={styles.statBox}>
              <View style={[styles.statIcon, {backgroundColor: '#fce7f3'}]}><Baby size={20} color="#db2777" /></View>
              <Text style={styles.statBoxValue}>0</Text>
              <Text style={styles.statBoxLabel}>ממוצע מ״ל ליום</Text>
           </View>
        </View>

        {/* באנר שחור (Pro) */}
        <View style={styles.proBanner}>
           <Text style={styles.proTitle}>רוצה תובנות עמוקות יותר?</Text>
           <Text style={styles.proText}>ה-AI שלנו יכול לנתח קשרים בין תזונה לשינה.</Text>
           <TouchableOpacity style={styles.proButton}>
              <Text style={styles.proButtonText}>בקרוב בגרסת Pro</Text>
           </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  reportsHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reportsTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  dateSelector: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
  tabsWrapper: { flexDirection: 'row-reverse', backgroundColor: '#f3f4f6', borderRadius: 16, padding: 4, marginBottom: 24 },
  reportTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  reportTabActive: { backgroundColor: '#6366f1', shadowColor: '#6366f1', shadowOpacity: 0.3, elevation: 4 },
  reportTabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  reportTabTextActive: { color: 'white' },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, height: 300, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  chartHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 },
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  chartSubtitle: { fontSize: 12, color: '#6b7280', alignSelf: 'flex-end', marginBottom: 24 },
  barChartContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', height: 180, alignItems: 'flex-end' },
  barColumn: { alignItems: 'center', gap: 8, flex: 1 },
  barTrack: { width: 12, height: '100%', backgroundColor: '#f3f4f6', borderRadius: 6, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
  statBox: { width: '48%', backgroundColor: 'white', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statBoxValue: { fontSize: 24, fontWeight: '900', color: '#111827' },
  statBoxLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  proBanner: { backgroundColor: '#111827', borderRadius: 24, padding: 24, alignItems: 'center', overflow: 'hidden' },
  proTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  proText: { color: '#9ca3af', fontSize: 13, marginBottom: 16 },
  proButton: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  proButtonText: { fontWeight: 'bold', fontSize: 13, color: '#111827' },
});
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Moon, Milk, Ruler, Clock, TrendingUp, ArrowUpRight, 
  ArrowDownRight, Activity, Plus 
} from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { getReportData, addDailyLogEntry } from '../services/babyService';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// --- סוגי דוחות ---
type ActivityRange = 'week' | 'month' | 'day';
type ReportTab = 'sleep' | 'food' | 'growth';

// --- הגדרות עיצוב לגרפים ---
const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
  strokeWidth: 3,
  barPercentage: 0.6,
  useShadowColorFromDataset: false,
  decimalPlaces: 1, // נקודה עשרונית אחת
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#4f46e5" }
};

// --- רכיבים ---

const TabButton = ({ title, icon: Icon, isActive, onPress }: { title: string, icon: any, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.tabBtn, isActive && styles.tabBtnActive]} 
    onPress={onPress}
  >
    <Icon size={18} color={isActive ? "#4f46e5" : "white"} />
    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
  </TouchableOpacity>
);

const TimeRangeSelector = ({ selected, onSelect }: { selected: ActivityRange, onSelect: (range: ActivityRange) => void }) => (
  <View style={styles.rangeSelectorContainer}>
    <TouchableOpacity onPress={() => onSelect('day')} style={[styles.rangeBtn, selected === 'day' && styles.rangeBtnActive]}>
      <Text style={[styles.rangeText, selected === 'day' && styles.rangeTextActive]}>יום</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => onSelect('week')} style={[styles.rangeBtn, selected === 'week' && styles.rangeBtnActive]}>
      <Text style={[styles.rangeText, selected === 'week' && styles.rangeTextActive]}>שבוע</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => onSelect('month')} style={[styles.rangeBtn, selected === 'month' && styles.rangeBtnActive]}>
      <Text style={[styles.rangeText, selected === 'month' && styles.rangeTextActive]}>חודש</Text>
    </TouchableOpacity>
  </View>
);

const StatCard = ({ title, value, subtext, trend }: any) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <Text style={styles.statTitle}>{title}</Text>
      {trend === 'up' ? <ArrowUpRight size={16} color="#10b981" /> : <ArrowDownRight size={16} color="#ef4444" />}
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statSub}>{subtext}</Text>
  </View>
);


export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sleep'); // שינוי ל'sleep' כי זה הדוח הראשון
  const [timeRange, setTimeRange] = useState<ActivityRange>('week');
  const [reportData, setReportData] = useState({ labels: [], data: [0], totalSum: 0, totalCount: 0 });
  const [loading, setLoading] = useState(false);

  // ממפה את הטאב לסוג הדוח בפיירבס
  const getReportType = (tab: ReportTab) => {
    if (tab === 'sleep') return 'sleep';
    if (tab === 'food') return 'food';
    return 'general'; // גדילה וכללי זה אותו דבר כרגע
  };

  const fetchData = async (range: ActivityRange, tab: ReportTab) => {
    setLoading(true);
    const type = getReportType(tab);
    
    // קריאה לפונקציה החכמה
    const data = await getReportData(range, type as 'sleep' | 'food' | 'general');
    setReportData(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      // טעינה ראשונית עם טאב וטווח נוכחי
      fetchData(timeRange, activeTab);
    }, [activeTab, timeRange])
  );
  
  // כפתור בדיקה: מוסיף רשומת יומן
  const handleAddLog = async (type: 'sleep' | 'food' | 'general', value: number) => {
      await addDailyLogEntry(type, value);
      await fetchData(timeRange, activeTab); 
      Alert.alert('נוסף תיעוד', `נוסף: ${value} ${type === 'sleep' ? 'שעות' : 'מ״ל'}`);
  };

  // --- רנדור תוכן ---

  const renderSleepContent = () => {
    const avgValue = reportData.totalCount > 0 ? (reportData.totalSum / reportData.totalCount) : 0;
    const unit = "שעות";

    return (
      <>
        <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <TouchableOpacity onPress={() => handleAddLog('sleep', Math.random() * 3 + 0.5)} style={styles.addActivityBtn}>
               <Plus size={16} color="#4f46e5" />
               <Text style={styles.addActivityText}>הוסף שינה (בדיקה)</Text>
            </TouchableOpacity>
            <Text style={styles.chartTitle}>ממוצע שינה יומי ({unit})</Text>
          </View>

          {loading ? (
             <ActivityIndicator size="large" color="#4f46e5" style={{height: 220}} />
          ) : (
            <LineChart
              data={{
                labels: reportData.labels,
                datasets: [{ data: reportData.data.length > 0 ? reportData.data : [0] }]
              }}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
            />
          )}
        </View>

        <View style={styles.statsRow}>
          <StatCard title={`ממוצע (${unit})`} value={`${avgValue.toFixed(1)} ${unit}`} subtext="בטווח הנבחר" trend="up" />
          <StatCard title="סה״כ רשומות" value={`${reportData.totalCount}`} subtext="תיעודי שינה" trend="up" />
        </View>
        
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}><Moon size={24} color="#4f46e5" /></View>
          <View style={{flex: 1}}>
            <Text style={styles.insightTitle}>תובנת שינה</Text>
            <Text style={styles.insightText}>כדי לקבל ניתוח מדויק, עליך לתעד את שעות ההירדמות וההתעוררות באופן קבוע.</Text>
          </View>
        </View>
      </>
    );
  };

  const renderFoodContent = () => {
     const avgValue = reportData.totalCount > 0 ? (reportData.totalSum / reportData.totalCount) : 0;
     const unit = "מ״ל";

     return (
        <>
          <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
          
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <TouchableOpacity onPress={() => handleAddLog('food', Math.random() * 100 + 50)} style={styles.addActivityBtn}>
                 <Plus size={16} color="#f59e0b" />
                 <Text style={[styles.addActivityText, {color: '#f59e0b'}]}>הוסף האכלה (בדיקה)</Text>
              </TouchableOpacity>
              <Text style={styles.chartTitle}>ממוצע אוכל יומי ({unit})</Text>
            </View>
            
            {loading ? (
             <ActivityIndicator size="large" color="#f59e0b" style={{height: 220}} />
            ) : (
                <BarChart
                  data={{
                    labels: reportData.labels,
                    datasets: [{ data: reportData.data.length > 0 ? reportData.data : [0] }]
                  }}
                  width={width - 40}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})` }}
                  style={styles.chartStyle}
                />
            )}
          </View>

          <View style={styles.statsRow}>
            <StatCard title={`ממוצע האכלה (${unit})`} value={`${avgValue.toFixed(1)} ${unit}`} subtext="בטווח הנבחר" trend="up" />
            <StatCard title="סה״כ האכלות" value={`${reportData.totalCount}`} subtext="תיעודי אוכל" trend="up" />
          </View>
        </>
     );
  };

  const renderGrowthContent = () => (
    <>
      <Text style={styles.chartHeaderTitle}>עקומת גדילה (משקל)</Text>
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: ["חודש 1", "2", "3", "4", "5", "6"],
            datasets: [
              { data: [3.5, 4.2, 5.1, 6.0, 6.8, 7.5], color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})` },
              { data: [3.4, 4.0, 4.8, 5.6, 6.4, 7.2], color: (opacity = 1) => `rgba(200, 200, 200, ${opacity})` } 
            ],
            legend: ["הילד שלי", "ממוצע"]
          }}
          width={width - 40}
          height={220}
          chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})` }}
          bezier
          style={styles.chartStyle}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard title="משקל נוכחי" value="7.5 ק״ג" subtext="אחוזון 65" trend="up" />
        <StatCard title="גובה" value="68 ס״מ" subtext="אחוזון 80" trend="up" />
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <LinearGradient colors={['#1e1b4b', '#4338ca']} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>דוחות וניתוחים 📈</Text>
          <Text style={styles.headerSubtitle}>סקירה מקיפה של ההתפתחות</Text>
        </View>
        
        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TabButton title="שינה" icon={Moon} isActive={activeTab === 'sleep'} onPress={() => { setActiveTab('sleep'); fetchData(timeRange, 'sleep'); }} />
          <TabButton title="תזונה" icon={Milk} isActive={activeTab === 'food'} onPress={() => { setActiveTab('food'); fetchData(timeRange, 'food'); }} />
          <TabButton title="גדילה" icon={Ruler} isActive={activeTab === 'growth'} onPress={() => { setActiveTab('growth'); }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'sleep' && renderSleepContent()}
        {activeTab === 'food' && renderFoodContent()}
        {activeTab === 'growth' && renderGrowthContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerContainer: { paddingTop: 60, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  headerContent: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#e0e7ff', opacity: 0.9 },
  
  tabsContainer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 10, paddingHorizontal: 20, marginTop: 10 },
  tabBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: 'white' },
  tabText: { color: '#e0e7ff', fontWeight: '600' },
  tabTextActive: { color: '#4f46e5', fontWeight: 'bold' },

  scrollContent: { padding: 20, paddingBottom: 100 },

  chartContainer: { backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, alignItems: 'center' },
  chartHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 4 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, textAlign: 'right' },
  chartHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 10, textAlign: 'right' },
  
  addActivityBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  addActivityText: { color: '#4f46e5', fontWeight: '600', fontSize: 12 },
  chartStyle: { borderRadius: 16, marginVertical: 8 },

  statsRow: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  statHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statTitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', textAlign: 'right' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 2, textAlign: 'right' },
  statSub: { fontSize: 11, color: '#10b981', fontWeight: '500', textAlign: 'right' },
  
  rangeSelectorContainer: { flexDirection: 'row-reverse', justifyContent: 'center', backgroundColor: 'white', borderRadius: 20, padding: 4, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  rangeBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  rangeBtnActive: { backgroundColor: '#4f46e5' },
  rangeText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280' },
  rangeTextActive: { color: 'white' },

  insightCard: { flexDirection: 'row-reverse', backgroundColor: '#e0e7ff', borderRadius: 20, padding: 16, alignItems: 'center', gap: 16 },
  insightIcon: { width: 48, height: 48, backgroundColor: 'white', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 16, fontWeight: 'bold', color: '#312e81', marginBottom: 4, textAlign: 'right' },
  insightText: { fontSize: 13, color: '#4338ca', lineHeight: 18, textAlign: 'right' },
});
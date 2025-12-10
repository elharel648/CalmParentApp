import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, Image, TextInput, FlatList } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Home, BarChart2, User, Settings, Mic, Moon, Baby, Droplets, HeartPulse, Trash2, Sun, X, Plus, Minus, Clock, Play, Pause, Thermometer, Pill, Sparkles, Calendar, Lightbulb } from 'lucide-react-native';

// --- מודל היומן ---
const JournalModal = ({ visible, onClose, activities, onDelete }: any) => {
  if (!visible) return null;
  return (
    <Modal animationType="slide" visible={visible} presentationStyle="pageSheet">
      <View style={styles.journalContainer}>
        <View style={styles.journalHeader}>
          <Text style={styles.journalTitle}>יומן פעילות מלא</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={24} color="#374151" /></TouchableOpacity>
        </View>
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.journalRow}>
               <View style={styles.journalRowContent}>
                  <Text style={styles.journalTime}>{new Date(item.time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <View>
                    <Text style={styles.journalItemTitle}>{item.title}</Text>
                    {item.detail ? <Text style={styles.journalItemDetail}>{item.detail}</Text> : null}
                  </View>
               </View>
               <TouchableOpacity onPress={() => onDelete(item.id)}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#9ca3af'}}>אין פעילויות רשומות</Text>}
        />
      </View>
    </Modal>
  );
};

// --- המודל החכם ---
const ActionModal = ({ visible, type, onClose, onSave }: any) => {
  const [feedType, setFeedType] = useState<'bottle' | 'nursing'>('bottle');
  const [amount, setAmount] = useState(120);
  const [nursingSide, setNursingSide] = useState<'left' | 'right' | null>(null);
  const [timerLeft, setTimerLeft] = useState(0);
  const [timerRight, setTimerRight] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [diaperSelections, setDiaperSelections] = useState<string[]>([]);
  const [healthTab, setHealthTab] = useState<'fever' | 'meds'>('fever');
  const [temp, setTemp] = useState(36.6);
  const [medication, setMedication] = useState<string | null>(null);
  const [otherMedText, setOtherMedText] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && nursingSide) {
      interval = setInterval(() => { if (nursingSide === 'left') setTimerLeft(t => t + 1); else setTimerRight(t => t + 1); }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, nursingSide]);

  if (!visible) return null;
  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); return `${m}:${s}`; };
  const toggleDiaperSelection = (sel: string) => { if (diaperSelections.includes(sel)) setDiaperSelections(diaperSelections.filter(s => s !== sel)); else setDiaperSelections([...diaperSelections, sel]); };
  const handleSave = () => {
    let details = '', displayTitle = '';
    if (type === 'feeding') { displayTitle = feedType === 'bottle' ? 'בקבוק' : 'הנקה'; details = feedType === 'bottle' ? `${amount} מ״ל` : `שמאל: ${formatTime(timerLeft)}, ימין: ${formatTime(timerRight)}`; } 
    else if (type === 'diaper') { displayTitle = 'החלפה'; details = diaperSelections.length > 0 ? diaperSelections.join(' + ') : 'נקי'; } 
    else if (type === 'health') { displayTitle = healthTab === 'fever' ? 'מדידת חום' : 'תרופה'; details = healthTab === 'fever' ? `חום: ${temp.toFixed(1)}°` : (medication === 'אחר' ? otherMedText : medication) || 'תרופה כללית'; }
    onSave({ type, displayTitle, details });
    setTimerLeft(0); setTimerRight(0); setIsTimerRunning(false); setDiaperSelections([]); setOtherMedText(''); setMedication(null);
  };
  const getTitle = () => { if (type === 'feeding') return 'פרטי האכלה'; if (type === 'diaper') return 'פרטי החתלה'; if (type === 'health') return 'תיעוד בריאות'; return ''; };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={24} color="#6b7280" /></TouchableOpacity><Text style={styles.modalTitle}>{getTitle()}</Text><View style={{width: 24}} /></View>
          {type === 'feeding' && (
            <View style={{width: '100%'}}>
              <View style={styles.tabsContainer}><TouchableOpacity onPress={() => setFeedType('bottle')} style={[styles.tab, feedType === 'bottle' && styles.activeTab]}><Baby size={18} color={feedType === 'bottle' ? '#db2777' : '#6b7280'} /><Text style={[styles.tabText, feedType === 'bottle' && styles.activeTabText]}>בקבוק</Text></TouchableOpacity><TouchableOpacity onPress={() => setFeedType('nursing')} style={[styles.tab, feedType === 'nursing' && styles.activeTab]}><Clock size={18} color={feedType === 'nursing' ? '#db2777' : '#6b7280'} /><Text style={[styles.tabText, feedType === 'nursing' && styles.activeTabText]}>הנקה</Text></TouchableOpacity></View>
              {feedType === 'bottle' ? (
                <View style={{alignItems: 'center'}}><Text style={styles.bigValue}>{amount}</Text><Text style={styles.unitLabel}>מ״ל</Text><View style={styles.rowControls}><TouchableOpacity onPress={() => setAmount(a => Math.max(0, a - 10))} style={styles.roundBtn}><Minus size={24} color="#374151"/></TouchableOpacity><TouchableOpacity onPress={() => setAmount(a => a + 10)} style={styles.roundBtn}><Plus size={24} color="#374151"/></TouchableOpacity></View></View>
              ) : (
                <View style={styles.rowControls}><TouchableOpacity style={[styles.nursingCard, nursingSide === 'left' && styles.nursingCardActive]} onPress={() => { if (nursingSide === 'left' && isTimerRunning) setIsTimerRunning(false); else { setNursingSide('left'); setIsTimerRunning(true); } }}>{nursingSide === 'left' && isTimerRunning ? <Pause size={32} color="#db2777" /> : <Play size={32} color="#6b7280" />}<Text style={styles.nursingLabel}>שמאל</Text><Text style={styles.nursingTimer}>{formatTime(timerLeft)}</Text></TouchableOpacity><TouchableOpacity style={[styles.nursingCard, nursingSide === 'right' && styles.nursingCardActive]} onPress={() => { if (nursingSide === 'right' && isTimerRunning) setIsTimerRunning(false); else { setNursingSide('right'); setIsTimerRunning(true); } }}>{nursingSide === 'right' && isTimerRunning ? <Pause size={32} color="#db2777" /> : <Play size={32} color="#6b7280" />}<Text style={styles.nursingLabel}>ימין</Text><Text style={styles.nursingTimer}>{formatTime(timerRight)}</Text></TouchableOpacity></View>
              )}
            </View>
          )}
          {type === 'diaper' && (
            <View style={{width: '100%'}}>
              <View style={styles.rowControls}><TouchableOpacity style={[styles.diaperCard, diaperSelections.includes('פיפי') && styles.diaperCardSelected]} onPress={() => toggleDiaperSelection('פיפי')}><Droplets size={40} color={diaperSelections.includes('פיפי') ? '#0891b2' : '#9ca3af'} /><Text style={[styles.diaperText, diaperSelections.includes('פיפי') && {color:'#0891b2', fontWeight:'bold'}]}>פיפי</Text></TouchableOpacity><TouchableOpacity style={[styles.diaperCard, diaperSelections.includes('קקי') && styles.diaperCardSelected]} onPress={() => toggleDiaperSelection('קקי')}><Baby size={40} color={diaperSelections.includes('קקי') ? '#854d0e' : '#9ca3af'} /><Text style={[styles.diaperText, diaperSelections.includes('קקי') && {color:'#854d0e', fontWeight:'bold'}]}>קקי</Text></TouchableOpacity></View><Text style={styles.statusText}>סטטוס: {diaperSelections.length === 0 ? 'יבש (נקי)' : diaperSelections.join(' + ')}</Text>
            </View>
          )}
          {type === 'health' && (
            <View style={{width: '100%', alignItems: 'center'}}>
               <View style={styles.tabsContainer}><TouchableOpacity onPress={() => setHealthTab('fever')} style={[styles.tab, healthTab === 'fever' && styles.activeTab]}><Thermometer size={18} color={healthTab === 'fever' ? '#ef4444' : '#6b7280'} /><Text style={[styles.tabText, healthTab === 'fever' && {color:'#ef4444'}]}>חום</Text></TouchableOpacity><TouchableOpacity onPress={() => setHealthTab('meds')} style={[styles.tab, healthTab === 'meds' && styles.activeTab]}><Pill size={18} color={healthTab === 'meds' ? '#ef4444' : '#6b7280'} /><Text style={[styles.tabText, healthTab === 'meds' && {color:'#ef4444'}]}>תרופה</Text></TouchableOpacity></View>
               {healthTab === 'fever' ? (
                 <><Text style={[styles.bigValue, {color: '#ef4444'}]}>{temp.toFixed(1)}</Text><Text style={styles.unitLabel}>מעלות צלזיוס</Text><View style={styles.rowControls}><TouchableOpacity onPress={() => setTemp(t => +(t - 0.1).toFixed(1))} style={styles.roundBtn}><Minus size={24} color="#374151"/></TouchableOpacity><TouchableOpacity onPress={() => setTemp(t => +(t + 0.1).toFixed(1))} style={styles.roundBtn}><Plus size={24} color="#374151"/></TouchableOpacity></View></>
               ) : (
                 <View style={{width: '100%'}}><View style={styles.medsContainer}>{['אקמולי', 'נורופן', 'סימפוקל', 'אחר'].map((med) => (<TouchableOpacity key={med} style={[styles.medChip, medication === med && styles.medChipActive]} onPress={() => setMedication(med === medication ? null : med)}><Text style={[styles.medText, medication === med && {color:'white'}]}>{med}</Text></TouchableOpacity>))}</View>{medication === 'אחר' && <TextInput style={styles.inputField} placeholder="איזו תרופה?" value={otherMedText} onChangeText={setOtherMedText} />}</View>
               )}
            </View>
          )}
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: type === 'feeding' ? '#db2777' : type === 'diaper' ? '#0891b2' : '#ef4444' }]} onPress={handleSave}><Text style={styles.saveButtonText}>שמור פעילות</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- קומפוננטת מסך הבית הראשית ---
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [isSleeping, setIsSleeping] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [journalVisible, setJournalVisible] = useState(false);
  const [activeModalType, setActiveModalType] = useState('feeding');
  const [bannerMode, setBannerMode] = useState<'prediction' | 'tip'>('prediction');
  const [activities, setActivities] = useState([
    { id: '1', type: 'feeding', title: 'האכלה', time: new Date().toISOString(), detail: '120 מ״ל' },
    { id: '2', type: 'diaper', title: 'החלפה', time: new Date(Date.now() - 3600000).toISOString(), detail: 'פיפי' }
  ]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('בוקר טוב');
    else if (hour >= 12 && hour < 18) setGreeting('צהריים טובים');
    else if (hour >= 18 && hour < 22) setGreeting('ערב טוב');
    else setGreeting('לילה טוב');
  }, []);

  const openModal = (type: string) => { setActiveModalType(type); setModalVisible(true); };
  const handleSaveActivity = (data: any) => { setActivities([{ id: Date.now().toString(), type: data.type, title: data.displayTitle || (data.type === 'feeding' ? 'האכלה' : data.type === 'diaper' ? 'החלפה' : 'בריאות'), time: new Date().toISOString(), detail: data.details }, ...activities]); setModalVisible(false); };
  const handleDeleteActivity = (id: string) => { setActivities(activities.filter(a => a.id !== id)); };
  const ActivityIcon = ({ type }: { type: string }) => { if (type === 'sleep') return <Moon size={18} color="#4f46e5" />; if (type === 'feeding') return <Baby size={18} color="#db2777" />; if (type === 'diaper') return <Droplets size={18} color="#0891b2" />; if (type === 'health') return <HeartPulse size={18} color="#ef4444" />; return <Sun size={18} color="gray" />; };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isSleeping ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={isSleeping ? ['#1e1b4b', '#312e81'] : ['#fff7ed', '#ffffff']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}><Image source={{uri: 'https://images.unsplash.com/photo-1522771753035-4a5000b5ad88?q=80&w=200&auto=format&fit=crop'}} style={styles.avatar} /><View><Text style={styles.greeting}>{greeting},</Text><Text style={[styles.childName, { color: isSleeping ? '#fff' : '#111827' }]}>עלמא</Text></View></View><TouchableOpacity style={styles.micButton}><Mic size={24} color={isSleeping ? '#fff' : '#4f46e5'} /></TouchableOpacity></View>
        <View style={styles.dailyStatsRow}><View style={styles.dailyStatItem}><Text style={styles.dailyStatValue}>0.0</Text><Text style={styles.dailyStatLabel}>ש׳ שינה</Text></View><View style={styles.dailyStatItem}><Text style={styles.dailyStatValue}>0</Text><Text style={styles.dailyStatLabel}>מ״ל אוכל</Text></View><View style={styles.dailyStatItem}><Text style={styles.dailyStatValue}>0</Text><Text style={styles.dailyStatLabel}>החלפות</Text></View></View>
        {!isSleeping && (
            <View style={styles.smartBanner}>
                <View style={styles.bannerHeader}><TouchableOpacity onPress={() => setBannerMode('prediction')} style={styles.bannerTab}><Text style={[styles.bannerTabTitle, bannerMode === 'prediction' && styles.bannerTabActive]}>הצעד הבא</Text>{bannerMode === 'prediction' && <View style={styles.bannerIndicator} />}</TouchableOpacity><View style={{width: 1, height: 16, backgroundColor: '#f3f4f6'}} /><TouchableOpacity onPress={() => setBannerMode('tip')} style={styles.bannerTab}><Text style={[styles.bannerTabTitle, bannerMode === 'tip' && styles.bannerTabActive]}>טיפ יומי</Text>{bannerMode === 'tip' && <View style={styles.bannerIndicator} />}</TouchableOpacity></View>
                <View style={styles.bannerContent}>{bannerMode === 'prediction' ? (<View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}><Sparkles size={18} color="#6366f1" /><Text style={styles.bannerText}>עלמא כנראה תהיה רעבה סביב 14:30. כדאי להכין בקבוק בקרוב.</Text></View>) : (<View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}><Lightbulb size={18} color="#f59e0b" /><Text style={styles.bannerText}>בגיל 3 חודשים תינוקות מתחילים לזהות פרצופים. נסו לחייך אליה מקרוב!</Text></View>)}</View>
            </View>
        )}
        <View style={[styles.heroCard, isSleeping ? { backgroundColor: 'rgba(30,41,59,0.8)' } : { backgroundColor: '#fff' }]}><View style={styles.heroContent}><View style={styles.heroIconCircle}>{isSleeping ? <Moon size={32} color="#fff" /> : <Sun size={32} color="#f97316" />}</View><Text style={[styles.heroStatus, { color: isSleeping ? '#a5b4fc' : '#fb923c' }]}>{isSleeping ? 'לילה טוב' : 'בוקר אור'}</Text><TouchableOpacity onPress={() => setIsSleeping(!isSleeping)} style={styles.heroButton}><Text style={styles.heroButtonText}>{isSleeping ? 'התעוררנו' : 'לישון עכשיו'}</Text></TouchableOpacity></View></View>
        {!isSleeping && (
            <View style={styles.controlGrid}><TouchableOpacity style={styles.controlItem} onPress={() => openModal('feeding')}><View style={[styles.controlIcon, { backgroundColor: '#ec4899' }]}><Baby size={28} color="#fff" /></View><Text style={styles.controlLabel}>האכלה</Text></TouchableOpacity><TouchableOpacity style={styles.controlItem} onPress={() => openModal('diaper')}><View style={[styles.controlIcon, { backgroundColor: '#06b6d4' }]}><Droplets size={28} color="#fff" /></View><Text style={styles.controlLabel}>החתלה</Text></TouchableOpacity><TouchableOpacity style={styles.controlItem} onPress={() => openModal('health')}><View style={[styles.controlIcon, { backgroundColor: '#ef4444' }]}><HeartPulse size={28} color="#fff" /></View><Text style={styles.controlLabel}>בריאות</Text></TouchableOpacity><TouchableOpacity style={styles.controlItem} onPress={() => setJournalVisible(true)}><View style={[styles.controlIcon, { backgroundColor: '#8b5cf6' }]}><Calendar size={28} color="#fff" /></View><Text style={styles.controlLabel}>יומן</Text></TouchableOpacity></View>
        )}
        <View style={styles.timelineSection}><View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}><Text style={styles.sectionTitle}>הפעילות היום</Text></View>{activities.slice(0, 3).map((activity, index) => (
                <View key={activity.id} style={styles.timelineRow}><View style={styles.timelineLineContainer}><View style={[styles.timelineDot, { backgroundColor: activity.type === 'feeding' ? '#fce7f3' : '#ecfeff' }]}><ActivityIcon type={activity.type} /></View>{index !== activities.length - 1 && <View style={styles.timelineLine} />}</View><View style={styles.timelineContent}><Text style={styles.timelineTime}>{new Date(activity.time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.timelineTitle}>{activity.title}</Text>{activity.detail ? <Text style={styles.timelineDetail}>{activity.detail}</Text> : null}</View></View>
            ))}</View>
      </ScrollView>
      <ActionModal visible={modalVisible} type={activeModalType} onClose={() => setModalVisible(false)} onSave={handleSaveActivity} />
      <JournalModal visible={journalVisible} onClose={() => setJournalVisible(false)} activities={activities} onDelete={handleDeleteActivity} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'white' },
  greeting: { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  childName: { fontSize: 22, fontWeight: '900', textAlign: 'right' },
  micButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 50 },
  dailyStatsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  dailyStatItem: { flex: 1, backgroundColor: 'white', borderRadius: 16, paddingVertical: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  dailyStatValue: { fontSize: 18, fontWeight: '900', color: '#111827' },
  dailyStatLabel: { fontSize: 11, color: '#9ca3af', fontWeight: 'bold', marginTop: 2 },
  smartBanner: { backgroundColor: 'white', borderRadius: 20, marginBottom: 20, padding: 0, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2, overflow: 'hidden' },
  bannerHeader: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 16 },
  bannerTab: { paddingBottom: 4 },
  bannerTabTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  bannerTabActive: { color: '#4f46e5', fontWeight: '800' },
  bannerIndicator: { width: 12, height: 3, borderRadius: 2, backgroundColor: '#4f46e5', marginTop: 2, alignSelf: 'center' },
  bannerContent: { padding: 16, paddingTop: 8, alignItems: 'center', backgroundColor: '#fafafa' },
  bannerText: { fontSize: 14, color: '#374151', textAlign: 'right', lineHeight: 20 },
  heroCard: { borderRadius: 28, padding: 20, marginBottom: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: {width:0, height:4}, elevation: 6 },
  heroContent: { alignItems: 'center' },
  heroIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroStatus: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, letterSpacing: 1 },
  heroButton: { backgroundColor: '#0f172a', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14 },
  heroButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  controlGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 24 },
  controlItem: { alignItems: 'center', gap: 6, width: '23%' },
  controlIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  controlLabel: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  timelineSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, textAlign: 'right', color: '#374151' },
  timelineRow: { flexDirection: 'row-reverse', minHeight: 60 },
  timelineLineContainer: { alignItems: 'center', width: 40 },
  timelineDot: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
  timelineContent: { flex: 1, paddingRight: 12, paddingBottom: 20 },
  timelineTime: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: 2 },
  timelineTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', textAlign: 'right' },
  timelineDetail: { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4f46e5', marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, minHeight: 420, shadowColor: '#000', shadowOpacity: 0.15, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  closeButton: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 50 },
  tabsContainer: { flexDirection: 'row-reverse', backgroundColor: '#f3f4f6', borderRadius: 14, padding: 4, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  tabText: { fontWeight: '600', color: '#6b7280' },
  activeTabText: { color: '#db2777' },
  bigValue: { fontSize: 60, fontWeight: '900', color: '#111827', textAlign: 'center', letterSpacing: -1 },
  unitLabel: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  rowControls: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 16, marginBottom: 20, width: '100%' },
  roundBtn: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  nursingCard: { width: 140, height: 130, borderRadius: 20, borderWidth: 2, borderColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', gap: 6 },
  nursingCardActive: { borderColor: '#db2777', backgroundColor: '#fff1f2' },
  nursingLabel: { fontSize: 15, fontWeight: 'bold', color: '#374151' },
  nursingTimer: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'], color: '#111827' },
  diaperCard: { width: 140, height: 130, borderRadius: 20, borderWidth: 2, borderColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f9fafb' },
  diaperCardSelected: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  diaperText: { fontSize: 16, fontWeight: '600', color: '#9ca3af' },
  statusText: { textAlign: 'center', marginTop: 12, fontSize: 15, fontWeight: 'bold', color: '#059669', backgroundColor: '#d1fae5', padding: 10, borderRadius: 10, overflow: 'hidden' },
  medsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  medChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  medChipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  medText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  inputField: { width: '100%', backgroundColor: '#f3f4f6', padding: 14, borderRadius: 14, textAlign: 'right', fontSize: 15 },
  saveButton: { width: '100%', paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 'auto' },
  saveButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  journalContainer: { flex: 1, backgroundColor: 'white', paddingTop: 20 },
  journalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  journalTitle: { fontSize: 22, fontWeight: '900' },
  journalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  journalRowContent: { flexDirection: 'row-reverse', gap: 16 },
  journalTime: { fontSize: 14, fontWeight: '600', color: '#6b7280', width: 50 },
  journalItemTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  journalItemDetail: { fontSize: 14, color: '#9ca3af', textAlign: 'right' }
});
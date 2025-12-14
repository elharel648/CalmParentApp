import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Settings, Edit2, Camera, Ruler, Weight, Activity, ChevronRight, 
  Crown, Star, Plus, X, ShieldCheck, Syringe, 
  Trash2, Calendar as CalendarIcon, Check, Info,
  Smile, Footprints, MessageCircle, Gift, Heart
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
  getBabyData, updateBabyData, addMilestone, removeMilestone, 
  toggleVaccineStatus, saveAlbumImage, addCustomVaccine, 
  toggleCustomVaccine, removeCustomVaccine, BabyData 
} from '../services/babyService';
import { Timestamp } from 'firebase/firestore';

// --- נתונים מבוססי משרד הבריאות ---
const VACCINE_SCHEDULE = [
  { ageTitle: 'לאחר הלידה', vaccines: [{ key: 'hepB_1', name: 'צהבת B (מנה 1)' }] },
  { ageTitle: 'גיל חודש', vaccines: [{ key: 'hepB_2', name: 'צהבת B (מנה 2)' }] },
  { ageTitle: 'גיל חודשיים', vaccines: [{ key: 'm5_1', name: 'מחומשת (מנה 1)' }, { key: 'prevnar_1', name: 'פרבנר (מנה 1)' }, { key: 'rota_1', name: 'רוטה (מנה 1)' }] },
  { ageTitle: 'גיל 4 חודשים', vaccines: [{ key: 'm5_2', name: 'מחומשת (מנה 2)' }, { key: 'prevnar_2', name: 'פרבנר (מנה 2)' }, { key: 'rota_2', name: 'רוטה (מנה 2)' }] },
  { ageTitle: 'גיל 6 חודשים', vaccines: [{ key: 'm5_3', name: 'מחומשת (מנה 3)' }, { key: 'hepB_3', name: 'צהבת B (מנה 3)' }, { key: 'rota_3', name: 'רוטה (מנה 3)' }] },
  { ageTitle: 'גיל שנה', vaccines: [{ key: 'mmrv_1', name: 'MMRV (מנה 1)' }, { key: 'prevnar_3', name: 'פרבנר (מנה 3)' }] },
];

// --- פונקציית עזר לזיהוי אייקון לפי טקסט ---
const getMilestoneConfig = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('שן') || t.includes('tooth')) return { icon: Smile, color: ['#fbbf24', '#d97706'], bg: '#fef3c7' };
  if (t.includes('הליכה') || t.includes('צעד') || t.includes('walk')) return { icon: Activity, color: ['#10b981', '#059669'], bg: '#d1fae5' };
  if (t.includes('מילה') || t.includes('אבא') || t.includes('אמא')) return { icon: MessageCircle, color: ['#3b82f6', '#2563eb'], bg: '#dbeafe' };
  if (t.includes('יום הולדת') || t.includes('שנה')) return { icon: Gift, color: ['#ec4899', '#db2777'], bg: '#fce7f3' };
  if (t.includes('זחילה') || t.includes('התהפך')) return { icon: Crown, color: ['#8b5cf6', '#7c3aed'], bg: '#ede9fe' };
  
  // ברירת מחדל
  return { icon: Star, color: ['#6366f1', '#4f46e5'], bg: '#e0e7ff' };
};

// --- רכיבים ---

const GrowthCard = ({ icon: Icon, label, value, unit, percentile, color, onEdit }: any) => {
  const colors: any = {
    blue: ['#3b82f6', '#1d4ed8'],
    emerald: ['#10b981', '#047857'],
    purple: ['#a855f7', '#7e22ce'],
    orange: ['#f97316', '#c2410c'],
  };
  
  return (
    <TouchableOpacity onPress={onEdit} style={styles.growthCard}>
      <View style={styles.growthHeader}>
        <LinearGradient colors={colors[color] || ['#6b7280', '#374151']} style={styles.iconBox}>
          <Icon size={16} color="white" />
        </LinearGradient>
        <Text style={styles.growthLabel}>{label}</Text>
      </View>
      <View style={styles.growthContent}>
        <View style={{flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 4}}>
           <Text style={styles.growthValue}>{value && value !== '0' ? value : '-'}</Text>
           <Text style={styles.growthUnit}>{unit}</Text>
        </View>
        <View style={styles.percentileBadge}>
          <Text style={[styles.percentileText, {color: colors[color][1]}]}>
            {value ? `אחוזון ${percentile}` : '-'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// --- העיצוב החדש והיפה של אבן דרך ---
const MilestoneTimelineItem = ({ title, date, onDelete, isLast, birthDate }: any) => {
  const config = getMilestoneConfig(title);
  const Icon = config.icon;
  
  // חישוב גיל בעת האירוע (בערך)
  let ageAtEvent = '';
  if (birthDate) {
    const eventDate = new Date(date.split('.').reverse().join('-')); // המרת תאריך ישראלי לאובייקט
    const birth = new Date(birthDate.seconds * 1000);
    const months = Math.floor((eventDate.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months >= 0) ageAtEvent = months === 0 ? 'שבועות ראשונים' : `גיל ${months} חודשים`;
  }

  return (
    <View style={styles.timelineItem}>
      {/* צד שמאל - הציר והאייקון */}
      <View style={styles.timelineLeft}>
        <LinearGradient colors={config.color} style={styles.timelineIconBubble}>
           <Icon size={16} color="white" />
        </LinearGradient>
        {!isLast && <View style={[styles.timelineLine, {backgroundColor: config.bg}]} />}
      </View>

      {/* צד ימין - הכרטיס */}
      <View style={[styles.timelineCard, { borderRightColor: config.color[0] }]}>
        <View style={styles.timelineHeader}>
           <Text style={styles.milestoneTitle}>{title}</Text>
           {ageAtEvent ? <Text style={styles.milestoneAgeBadge}>{ageAtEvent}</Text> : null}
        </View>
        <View style={styles.timelineFooter}>
           <Text style={styles.milestoneDate}>{date}</Text>
           <TouchableOpacity onPress={onDelete} style={styles.timelineDeleteIcon}>
             <Trash2 size={14} color="#ef4444" />
           </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [baby, setBaby] = useState<BabyData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [editMetric, setEditMetric] = useState<{type: string, value: string, title: string, unit: string} | null>(null);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState(new Date());
  const [showMilestonePicker, setShowMilestonePicker] = useState(false);
  const [newVaccineName, setNewVaccineName] = useState('');
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [savingImg, setSavingImg] = useState(false);

  const loadData = async () => {
    try {
      const data = await getBabyData();
      if (data) setBaby(data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onBirthDateChange = async (event: any, selectedDate?: Date) => {
    setShowBirthDatePicker(false);
    if (selectedDate && baby?.id) {
      const timestamp = Timestamp.fromDate(selectedDate);
      await updateBabyData(baby.id, { birthDate: timestamp });
      setBaby({ ...baby, birthDate: timestamp });
    }
  };

  const handleSaveMetric = async (val: string) => {
    if (!editMetric || !baby?.id) return;
    const updates: any = {};
    const currentStats = baby.stats || {};
    if (editMetric.type === 'weight') updates.stats = { ...currentStats, weight: val };
    if (editMetric.type === 'height') updates.stats = { ...currentStats, height: val };
    if (editMetric.type === 'head') updates.stats = { ...currentStats, headCircumference: val };
    await updateBabyData(baby.id, updates);
    setBaby({ ...baby, ...updates });
    setEditMetric(null);
  };

  const handleAddMilestone = async () => {
    if (!baby?.id || !newMilestoneTitle.trim()) return;
    await addMilestone(baby.id, newMilestoneTitle, newMilestoneDate);
    await loadData();
    setIsMilestoneOpen(false);
    setNewMilestoneTitle('');
  };

  const handleDeleteMilestone = (milestone: any) => {
    Alert.alert("מחיקה", "האם למחוק?", [{ text: "ביטול" }, { text: "מחק", style: "destructive", onPress: async () => { if(baby?.id) { await removeMilestone(baby.id, milestone); loadData(); }}}]);
  };

  const handleToggleVaccine = async (key: string) => {
    if (!baby?.id) return;
    await toggleVaccineStatus(baby.id, baby.vaccines, key);
    const newVal = !baby.vaccines?.[key];
    setBaby({ ...baby, vaccines: { ...baby.vaccines, [key]: newVal } });
  };

  const handleAddCustomVaccine = async () => {
    if (!baby?.id || !newVaccineName.trim()) return;
    await addCustomVaccine(baby.id, newVaccineName);
    await loadData();
    setIsVaccineModalOpen(false);
    setNewVaccineName('');
  };

  const handleToggleCustomVaccine = async (vaccine: any) => {
    if (!baby?.id) return;
    await toggleCustomVaccine(baby.id, baby.customVaccines, vaccine.id);
    await loadData();
  };

  const handleDeleteCustomVaccine = (vaccine: any) => {
     if(baby?.id) { removeCustomVaccine(baby.id, vaccine).then(loadData); }
  };

  const handleImagePick = async (type: 'profile' | 'album', monthIndex?: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('שגיאה', 'חובה אישור לגלריה');
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: type === 'profile' ? [1,1] : [3,4], quality: 0.3, base64: true,
    });

    if (!result.canceled && result.assets[0].base64 && baby?.id) {
      setSavingImg(true);
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        if (type === 'profile') {
          await updateBabyData(baby.id, { photoUrl: base64Img });
          setBaby(prev => prev ? { ...prev, photoUrl: base64Img } : null);
        } else if (type === 'album' && monthIndex !== undefined) {
          await saveAlbumImage(baby.id, monthIndex, base64Img);
          setBaby(prev => { if (!prev) return null; return { ...prev, album: { ...prev.album, [monthIndex]: base64Img } }; });
        }
      } catch (e) { Alert.alert('שגיאה בשמירה'); }
      finally { setSavingImg(false); }
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;

  const birthDateObj = baby?.birthDate ? new Date(baby.birthDate.seconds * 1000) : new Date();
  const babyAgeMonths = Math.floor((new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30));

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <LinearGradient colors={['#4f46e5', '#818cf8']} style={StyleSheet.absoluteFill} />
        <View style={styles.navbar}>
           <TouchableOpacity onPress={() => navigation.navigate('הגדרות')} style={styles.navBtn}><Settings size={20} color="white" /></TouchableOpacity>
           <Text style={styles.navTitle}>הבייבי שלי</Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}><ChevronRight size={20} color="white" /></TouchableOpacity>
        </View>
        
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={() => handleImagePick('profile')}>
            {baby?.photoUrl ? <Image source={{ uri: baby.photoUrl }} style={styles.avatar} /> : <View style={[styles.avatar, {backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center'}]}><Text style={{fontSize: 40}}>👶</Text></View>}
            <View style={styles.cameraBtn}><Camera size={12} color="#4f46e5" /></View>
          </TouchableOpacity>
          <View style={styles.nameSection}>
            <Text style={styles.babyName}>{baby?.name || 'הבייבי'}</Text>
            <TouchableOpacity style={styles.agePill} onPress={() => setShowBirthDatePicker(true)}>
              <Text style={styles.ageText}>{babyAgeMonths} חודשים</Text>
              <Edit2 size={10} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Quick Stats Overlay */}
        <View style={styles.statsOverlay}>
          <View style={styles.statItem}>
             <Text style={styles.statVal}>{baby?.stats?.weight || '-'} ק״ג</Text>
             <Text style={styles.statLabel}>משקל</Text>
          </View>
          <View style={styles.verticalLine} />
          <View style={styles.statItem}>
             <Text style={styles.statVal}>{baby?.stats?.height || '-'} ס״מ</Text>
             <Text style={styles.statLabel}>גובה</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* קרוסלת זכרונות */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>רגעים קסומים 📸</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 15, paddingRight: 20}}>
             {Array.from({ length: 12 }).map((_, i) => {
               const m = i + 1;
               const img = baby?.album?.[m];
               return (
                 <View key={m} style={{alignItems: 'center', gap: 6}}>
                   <TouchableOpacity style={styles.storyCircle} onPress={() => handleImagePick('album', m)}>
                     {img ? <Image source={{uri: img}} style={styles.storyImage} /> : <View style={styles.emptyStory}><Plus size={20} color="#cbd5e1" /></View>}
                   </TouchableOpacity>
                   <Text style={styles.storyLabel}>חודש {m}</Text>
                 </View>
               )
             })}
          </ScrollView>
        </View>

        {/* מדדי גדילה */}
        <View style={styles.sectionContainer}>
           <Text style={styles.sectionHeader}>מעקב גדילה</Text>
           <View style={{flexDirection: 'row-reverse', gap: 10}}>
              <View style={{flex: 1}}>
                <GrowthCard icon={Weight} label="משקל" value={baby?.stats?.weight} unit="ק״ג" percentile={50} color="blue" onEdit={() => setEditMetric({type: 'weight', value: baby?.stats?.weight || '', title: 'עדכון משקל', unit: 'ק״ג'})} />
              </View>
              <View style={{flex: 1}}>
                <GrowthCard icon={Ruler} label="גובה" value={baby?.stats?.height} unit="ס״מ" percentile={75} color="emerald" onEdit={() => setEditMetric({type: 'height', value: baby?.stats?.height || '', title: 'עדכון גובה', unit: 'ס״מ'})} />
              </View>
           </View>
           <View style={{marginTop: 10}}>
              <GrowthCard icon={Activity} label="היקף ראש" value={baby?.stats?.headCircumference} unit="ס״מ" percentile={60} color="purple" onEdit={() => setEditMetric({type: 'head', value: baby?.stats?.headCircumference || '', title: 'עדכון היקף ראש', unit: 'ס״מ'})} />
           </View>
        </View>

        {/* פנקס חיסונים */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>💉 פנקס חיסונים</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.health.gov.il/Subjects/pregnancy/Childbirth/Vaccination_of_infants/Pages/default.aspx')}>
              <Info size={18} color="#6366f1" />
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimerText}>לפי המלצות משרד הבריאות</Text>
          
          {VACCINE_SCHEDULE.map((group, idx) => (
            <View key={idx} style={styles.vaccineGroup}>
               <Text style={styles.vaccineAgeTitle}>{group.ageTitle}</Text>
               {group.vaccines.map((v) => {
                 const isDone = baby?.vaccines?.[v.key];
                 return (
                   <TouchableOpacity key={v.key} style={[styles.vaccineRow, isDone && styles.vaccineRowDone]} onPress={() => handleToggleVaccine(v.key)}>
                     <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                       {isDone && <Check size={12} color="white" />}
                     </View>
                     <Text style={[styles.vaccineText, isDone && styles.vaccineTextDone]}>{v.name}</Text>
                   </TouchableOpacity>
                 );
               })}
            </View>
          ))}
          
          <TouchableOpacity style={styles.addCustomBtn} onPress={() => setIsVaccineModalOpen(true)}>
            <Plus size={16} color="#6366f1" />
            <Text style={styles.addCustomText}>הוסף חיסון אחר</Text>
          </TouchableOpacity>

          {baby?.customVaccines?.map((v, i) => (
             <TouchableOpacity key={i} style={[styles.vaccineRow, v.isDone && styles.vaccineRowDone]} onPress={() => handleToggleCustomVaccine(v)} onLongPress={() => handleDeleteCustomVaccine(v)}>
                <View style={[styles.checkbox, v.isDone && styles.checkboxDone]}>{v.isDone && <Check size={12} color="white" />}</View>
                <Text style={styles.vaccineText}>{v.name} (אישי)</Text>
             </TouchableOpacity>
          ))}
        </View>

        {/* --- אבני דרך (העיצוב החדש) --- */}
        <View style={styles.sectionContainer}>
          <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
             <Text style={styles.sectionHeader}>⭐ אבני דרך</Text>
             <TouchableOpacity onPress={() => setIsMilestoneOpen(true)}><Plus size={24} color="#6366f1" /></TouchableOpacity>
          </View>
          
          <View style={{paddingRight: 10}}>
             {baby?.milestones?.length ? (
               baby.milestones.map((m, i) => (
                 <MilestoneTimelineItem 
                    key={i} 
                    title={m.title} 
                    date={new Date(m.date.seconds * 1000).toLocaleDateString('he-IL')} 
                    onDelete={() => handleDeleteMilestone(m)}
                    isLast={i === baby.milestones.length - 1}
                    birthDate={baby.birthDate} // העברת תאריך לידה לחישוב גיל
                 />
               ))
             ) : (
               <Text style={styles.emptyText}>הוסיפו את הרגע המיוחד הראשון!</Text>
             )}
          </View>
        </View>

      </ScrollView>

      {/* --- מודאלים --- */}
      {showBirthDatePicker && <DateTimePicker value={birthDateObj} mode="date" display="default" maximumDate={new Date()} onChange={onBirthDateChange} />}

      <Modal visible={!!editMetric} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
             <Text style={styles.modalHeaderTitle}>{editMetric?.title}</Text>
             <View style={{flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'center', gap: 5, marginVertical: 20}}>
                <TextInput style={styles.hugeInput} value={editMetric?.value} onChangeText={(t) => setEditMetric(prev => prev ? {...prev, value: t} : null)} keyboardType="numeric" autoFocus />
                <Text style={styles.unitText}>{editMetric?.unit}</Text>
             </View>
             <View style={{flexDirection: 'row-reverse', gap: 10}}>
                <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#e2e8f0'}]} onPress={() => setEditMetric(null)}><Text>ביטול</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#4f46e5'}]} onPress={() => handleSaveMetric(editMetric?.value || '')}><Text style={{color: 'white', fontWeight: 'bold'}}>שמור</Text></TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isMilestoneOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
           <View style={styles.modalCard}>
              <Text style={styles.modalHeaderTitle}>רגע מיוחד חדש ✨</Text>
              <TextInput style={styles.normalInput} placeholder="למשל: התהפך בפעם הראשונה" value={newMilestoneTitle} onChangeText={setNewMilestoneTitle} textAlign="right" />
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowMilestonePicker(true)}>
                 <CalendarIcon size={20} color="#64748b" />
                 <Text>{newMilestoneDate.toLocaleDateString('he-IL')}</Text>
              </TouchableOpacity>
              {showMilestonePicker && <DateTimePicker value={newMilestoneDate} mode="date" display="default" onChange={(e, d) => { setShowMilestonePicker(false); if(d) setNewMilestoneDate(d); }} />}
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#4f46e5', marginTop: 10}]} onPress={handleAddMilestone}><Text style={{color: 'white'}}>הוסף ליומן</Text></TouchableOpacity>
              <TouchableOpacity style={{alignItems: 'center', marginTop: 15}} onPress={() => setIsMilestoneOpen(false)}><Text style={{color: '#64748b'}}>ביטול</Text></TouchableOpacity>
           </View>
        </View>
      </Modal>

      <Modal visible={isVaccineModalOpen} transparent>
         <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
               <Text style={styles.modalHeaderTitle}>חיסון נוסף</Text>
               <TextInput style={styles.normalInput} placeholder="שם החיסון" value={newVaccineName} onChangeText={setNewVaccineName} textAlign="right" />
               <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#4f46e5'}]} onPress={handleAddCustomVaccine}><Text style={{color: 'white'}}>הוסף</Text></TouchableOpacity>
               <TouchableOpacity style={{alignItems: 'center', marginTop: 15}} onPress={() => setIsVaccineModalOpen(false)}><Text style={{color: '#64748b'}}>ביטול</Text></TouchableOpacity>
            </View>
         </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { height: 280, paddingTop: 50, paddingHorizontal: 20, position: 'relative', marginBottom: 40 },
  navbar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50 },
  navTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  profileSection: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 30, gap: 15 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'white' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', padding: 6, borderRadius: 20 },
  nameSection: { alignItems: 'flex-end' },
  babyName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  agePill: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6, alignItems: 'center' },
  ageText: { color: 'white', fontSize: 12, fontWeight: '600' },
  statsOverlay: { position: 'absolute', bottom: -30, left: 20, right: 20, backgroundColor: 'white', borderRadius: 20, padding: 15, flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b' },
  verticalLine: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  scrollContent: { paddingBottom: 100, paddingTop: 10 },
  sectionContainer: { marginBottom: 25, paddingHorizontal: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, textAlign: 'right' },
  
  // Story Styles (Circles)
  storyCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#6366f1', padding: 3 },
  storyImage: { width: '100%', height: '100%', borderRadius: 35 },
  emptyStory: { width: '100%', height: '100%', borderRadius: 35, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  storyLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  growthCard: { backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  growthHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  growthLabel: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  growthContent: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end' },
  growthValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  growthUnit: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  percentileBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  percentileText: { fontSize: 10, fontWeight: 'bold' },
  cardContainer: { backgroundColor: 'white', marginHorizontal: 20, padding: 20, borderRadius: 20, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  disclaimerText: { fontSize: 11, color: '#64748b', textAlign: 'right', marginBottom: 20 },
  vaccineGroup: { marginBottom: 20 },
  vaccineAgeTitle: { fontSize: 14, fontWeight: 'bold', color: '#6366f1', textAlign: 'right', marginBottom: 8, backgroundColor: '#e0e7ff', alignSelf: 'flex-end', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  vaccineRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8, gap: 10 },
  vaccineRowDone: { opacity: 0.6 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  vaccineText: { fontSize: 14, color: '#334155', flex: 1, textAlign: 'right' },
  vaccineTextDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  addCustomBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#f5f3ff', borderRadius: 8 },
  addCustomText: { color: '#6366f1', fontWeight: '600', fontSize: 14 },
  
  // New Timeline Styles
  timelineItem: { flexDirection: 'row-reverse', minHeight: 80, marginBottom: 5 },
  timelineLeft: { width: 40, alignItems: 'center', marginRight: 5 },
  timelineIconBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineLine: { width: 2, flex: 1, marginTop: -5, marginBottom: -5, borderRadius: 2 },
  timelineCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15, marginRight: 10, borderRightWidth: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  timelineHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  milestoneTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  milestoneAgeBadge: { fontSize: 11, color: '#6366f1', backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', fontWeight: '600' },
  timelineFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  milestoneDate: { fontSize: 12, color: '#94a3b8' },
  timelineDeleteIcon: { padding: 5 },
  
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 20, padding: 24 },
  modalHeaderTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#1e293b' },
  hugeInput: { fontSize: 48, fontWeight: 'bold', color: '#1e293b', borderBottomWidth: 2, borderBottomColor: '#e2e8f0', textAlign: 'center', minWidth: 100 },
  unitText: { fontSize: 18, color: '#64748b', marginBottom: 8 },
  normalInput: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, marginBottom: 15 },
  dateSelector: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  modalBtn: { padding: 15, borderRadius: 12, flex: 1, alignItems: 'center' }
});
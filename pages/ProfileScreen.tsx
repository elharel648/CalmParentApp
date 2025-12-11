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
  RefreshControl,
  ActivityIndicator,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Settings, Edit2, Camera, Ruler, Weight, Activity, ChevronRight, 
  Crown, Star, Smile, TrendingUp, Plus, X, ShieldCheck, Syringe, 
  ImageIcon, Trash2, Calendar as CalendarIcon, Check
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

const ISRAELI_VACCINES = [
  { key: 'hepB_1', name: 'צהבת B (מנה 1)', age: 'לאחר הלידה' },
  { key: 'hepB_2', name: 'צהבת B (מנה 2)', age: 'גיל חודש' },
  { key: 'm5_1', name: 'מחומשת + פרבנר + רוטה (מנה 1)', age: 'גיל חודשיים' },
  { key: 'm5_2', name: 'מחומשת + פרבנר + רוטה (מנה 2)', age: 'גיל 4 חודשים' },
  { key: 'm5_3', name: 'מחומשת + צהבת B + רוטה (מנה 3)', age: 'גיל 6 חודשים' },
  { key: 'mmrv_1', name: 'MMRV + פרבנר (גיל שנה)', age: 'גיל 12 חודשים' },
];

// --- רכיבים ---

const GrowthCard = ({ icon: Icon, label, value, unit, percentile, color, onEdit }: any) => {
  let bgIcon;
  switch (color) {
    case 'blue': bgIcon = '#3b82f6'; break;
    case 'emerald': bgIcon = '#10b981'; break;
    case 'purple': bgIcon = '#a855f7'; break;
    case 'orange': bgIcon = '#f97316'; break;
    default: bgIcon = '#6b7280';
  }

  return (
    <View style={styles.growthCard}>
      <View style={styles.growthHeader}>
        <View style={[styles.iconBox, { backgroundColor: bgIcon }]}>
          <Icon size={18} color="white" />
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.editIconSmall}>
          <Edit2 size={14} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      <View style={{marginTop: 10}}>
        <Text style={styles.growthLabel}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.growthValue}>{value && value !== '0' ? value : '-'}</Text>
          <Text style={styles.growthUnit}>{unit}</Text>
        </View>
      </View>
      <View style={{marginTop: 12}}>
        <View style={styles.percentileRow}>
          <Text style={styles.percentileText}>{value ? percentile : 0}%</Text>
          <Text style={styles.percentileText}>{value ? 'תקין' : '-'}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { backgroundColor: bgIcon, width: value ? `${percentile}%` : '0%' }]} />
        </View>
      </View>
    </View>
  );
};

const MilestoneCard = ({ title, date, onDelete }: any) => (
  <View style={styles.milestoneCard}>
    <TouchableOpacity onPress={onDelete} style={styles.deleteMilestone}>
      <Trash2 size={14} color="#ef4444" />
    </TouchableOpacity>
    <View style={styles.milestoneIconBg}>
      <Star size={20} color="#f97316" fill="#f97316"/>
    </View>
    <View>
      <Text style={styles.milestoneTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.milestoneDate}>{date}</Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [baby, setBaby] = useState<BabyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingImg, setSavingImg] = useState(false);

  // מודאלים
  const [editMetric, setEditMetric] = useState<{type: string, value: string, title: string, unit: string} | null>(null);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false); // חדש: מודל חיסון

  // סטייט לטפסים
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState(new Date());
  const [showMilestonePicker, setShowMilestonePicker] = useState(false);
  
  const [newVaccineName, setNewVaccineName] = useState(''); // שם חיסון חדש

  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);

  const loadData = async () => {
    try {
      const data = await getBabyData();
      if (data) setBaby(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onBirthDateChange = async (event: any, selectedDate?: Date) => {
    setShowBirthDatePicker(false);
    if (selectedDate && baby?.id) {
      const timestamp = Timestamp.fromDate(selectedDate);
      await updateBabyData(baby.id, { birthDate: timestamp });
      setBaby({ ...baby, birthDate: timestamp });
    }
  };

  const onMilestoneDateChange = (event: any, selectedDate?: Date) => {
    setShowMilestonePicker(false);
    if (selectedDate) {
      setNewMilestoneDate(selectedDate);
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
    setNewMilestoneDate(new Date());
  };

  const handleDeleteMilestone = (milestone: any) => {
    Alert.alert("מחיקה", "למחוק אבן דרך זו?", [
      { text: "ביטול", style: "cancel" },
      { text: "מחק", style: "destructive", onPress: async () => { if(baby?.id) { await removeMilestone(baby.id, milestone); loadData(); }}}
    ]);
  };

  // --- חיסונים ---
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
    if (!baby?.id || !baby.customVaccines) return;
    await toggleCustomVaccine(baby.id, baby.customVaccines, vaccine.id);
    await loadData();
  };

  const handleDeleteCustomVaccine = (vaccine: any) => {
    Alert.alert("מחיקה", `למחוק את החיסון "${vaccine.name}"?`, [
      { text: "ביטול", style: "cancel" },
      { text: "מחק", style: "destructive", onPress: async () => { if(baby?.id) { await removeCustomVaccine(baby.id, vaccine); loadData(); }}}
    ]);
  };

  // --- תמונות (תיקון באג הדריסה) ---
  const handleImagePick = async (type: 'profile' | 'album', monthIndex?: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('שגיאה', 'חייב גישה לגלריה'); return; }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [3, 4],
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64 && baby?.id) {
        setSavingImg(true);
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (base64Img.length > 900000) { 
           Alert.alert('התמונה כבדה מדי', 'נסה לחתוך או לבחור אחרת');
           setSavingImg(false);
           return;
        }

        if (type === 'profile') {
          await updateBabyData(baby.id, { photoUrl: base64Img });
          setBaby(prev => prev ? { ...prev, photoUrl: base64Img } : null);
        } else if (type === 'album' && monthIndex !== undefined) {
          // שימוש בפונקציה החדשה למניעת דריסה
          await saveAlbumImage(baby.id, monthIndex, base64Img);
          
          // עדכון מקומי חכם (מיזוג)
          setBaby(prev => {
             if (!prev) return null;
             const newAlbum = { ...prev.album, [monthIndex]: base64Img };
             return { ...prev, album: newAlbum };
          });
        }
        setSavingImg(false);
      }
    } catch (error) {
      console.log(error);
      Alert.alert('שגיאה', 'לא הצלחנו לשמור');
      setSavingImg(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;

  const birthDateObj = baby?.birthDate ? new Date(baby.birthDate.seconds * 1000) : new Date();
  const babyAgeMonths = Math.floor((new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30));

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.bgEffect1} />
        <View style={styles.bgEffect2} />
        <View style={styles.navbar}>
           <TouchableOpacity onPress={() => navigation.navigate('הגדרות')} style={styles.navBtn}>
            <Settings size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>פרופיל אישי</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
            <ChevronRight size={20} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileContent}>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => handleImagePick('profile')}>
            <LinearGradient colors={['#ec4899', '#8b5cf6', '#6366f1']} style={styles.glowRing} />
            {savingImg ? (
              <ActivityIndicator color="white" style={styles.avatarImage} />
            ) : baby?.photoUrl ? (
              <Image source={{ uri: baby.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, { backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{fontSize: 40}}>👶</Text>
              </View>
            )}
            <View style={styles.cameraBadge}><Camera size={14} color="white" /></View>
          </TouchableOpacity>
          <Text style={styles.babyName}>{baby?.name || 'תינוק'}</Text>
          <TouchableOpacity style={styles.ageBadge} onPress={() => setShowBirthDatePicker(true)}>
            <Crown size={12} color="#facc15" fill="#facc15" />
            <Text style={styles.ageText}>
               {babyAgeMonths > 0 ? `גיל: ${babyAgeMonths} חודשים` : 'תינוק חדש'} • {birthDateObj.toLocaleDateString('he-IL')}
            </Text>
            <Edit2 size={10} color="rgba(255,255,255,0.6)" style={{marginRight: 4}} />
          </TouchableOpacity>
        </View>
      </View>

      {/* תאריך לידה פיקר */}
      {showBirthDatePicker && (
        <DateTimePicker value={birthDateObj} mode="date" display="default" maximumDate={new Date()} onChange={onBirthDateChange} />
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Star size={20} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.statNum}>100</Text>
            <Text style={styles.statLabel}>בריאות</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <TrendingUp size={20} color="#10b981" />
            <Text style={styles.statNum}>{Math.min(100, (baby?.milestones?.length || 0) * 10)}%</Text>
            <Text style={styles.statLabel}>עקביות</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Activity size={20} color="#6366f1" />
            <Text style={styles.statNum}>{baby?.milestones?.length || 0}</Text>
            <Text style={styles.statLabel}>תיעודים</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* מדדים */}
        <View style={{ marginBottom: 25 }}>
          <Text style={styles.sectionTitle}>
            <Ruler size={18} color="#6366f1" style={{ marginRight: 8 }} /> מדדי גדילה
          </Text>
          <View style={styles.gridRow}>
            <View style={styles.gridItem}><GrowthCard icon={Weight} label="משקל" value={baby?.stats?.weight} unit="ק״ג" percentile={65} color="blue" onEdit={() => setEditMetric({ type: 'weight', value: baby?.stats?.weight || '', title: 'עריכת משקל', unit: 'ק״ג' })} /></View>
            <View style={styles.gridItem}><GrowthCard icon={Ruler} label="גובה" value={baby?.stats?.height} unit="ס״מ" percentile={82} color="orange" onEdit={() => setEditMetric({ type: 'height', value: baby?.stats?.height || '', title: 'עריכת גובה', unit: 'ס״מ' })} /></View>
          </View>
          <View style={[styles.gridRow, { marginTop: 12 }]}>
            <View style={styles.gridItem}><GrowthCard icon={Activity} label="היקף ראש" value={baby?.stats?.headCircumference} unit="ס״מ" percentile={50} color="purple" onEdit={() => setEditMetric({ type: 'head', value: baby?.stats?.headCircumference || '', title: 'עריכת היקף ראש', unit: 'ס״מ' })} /></View>
            <View style={styles.gridItem}><GrowthCard icon={Smile} label="שיניים" value="0" unit="שיניים" percentile={0} color="emerald" onEdit={() => Alert.alert('בקרוב', 'מעקב שיניים יתווסף בקרוב')} /></View>
          </View>
        </View>

        {/* --- פנקס חיסונים --- */}
        <View style={styles.medicalCard}>
          <View style={styles.medicalHeader}>
            <TouchableOpacity onPress={() => setIsVaccineModalOpen(true)} style={styles.addVaccineBtn}>
               <Plus size={16} color="white" />
            </TouchableOpacity>
            <View>
              <Text style={styles.medicalTitle}>פנקס חיסונים</Text>
              <Text style={styles.medicalSubtitle}>משרד הבריאות + אישיים</Text>
            </View>
            <View style={styles.medicalIconBox}><ShieldCheck size={24} color="#ef4444" /></View>
          </View>

          <Text style={styles.vaccineHeader}><Syringe size={16} color="#10b981" /> שגרה</Text>
          <View style={{gap: 8, marginBottom: 15}}>
            {ISRAELI_VACCINES.map((vaccine, index) => {
              const isDone = baby?.vaccines?.[vaccine.key] || false;
              return (
                <TouchableOpacity key={index} style={[styles.vaccineRow, isDone && {backgroundColor: '#ecfdf5', borderColor: '#10b981'}]} onPress={() => handleToggleVaccine(vaccine.key)}>
                  <View style={[styles.checkCircle, isDone && {backgroundColor: '#10b981', borderColor: '#10b981'}]}>{isDone && <Check size={14} color="white" />}</View>
                  <View style={{flex: 1}}>
                    <Text style={[styles.vaccineName, isDone && {color: '#065f46'}]}>{vaccine.name}</Text>
                    <Text style={styles.vaccineDate}>{vaccine.age}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* חיסונים נוספים */}
          {baby?.customVaccines && baby.customVaccines.length > 0 && (
            <>
              <Text style={styles.vaccineHeader}><Syringe size={16} color="#f59e0b" /> נוספים</Text>
              <View style={{gap: 8}}>
                {baby.customVaccines.map((vaccine, index) => (
                  <TouchableOpacity key={index} style={[styles.vaccineRow, vaccine.isDone && {backgroundColor: '#fffbeb', borderColor: '#f59e0b'}]} onPress={() => handleToggleCustomVaccine(vaccine)} onLongPress={() => handleDeleteCustomVaccine(vaccine)}>
                    <View style={[styles.checkCircle, vaccine.isDone && {backgroundColor: '#f59e0b', borderColor: '#f59e0b'}]}>{vaccine.isDone && <Check size={14} color="white" />}</View>
                    <View style={{flex: 1}}>
                      <Text style={[styles.vaccineName, vaccine.isDone && {color: '#92400e'}]}>{vaccine.name}</Text>
                      <Text style={styles.vaccineDate}>חיסון אישי</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* אבני דרך */}
        <View style={{ marginBottom: 30 }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}><Star size={18} color="#f97316" fill="#f97316" /> אבני דרך</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
            {baby?.milestones?.length > 0 ? (
              baby.milestones.map((m, i) => (
                <MilestoneCard key={i} title={m.title} date={new Date(m.date.seconds * 1000).toLocaleDateString('he-IL')} onDelete={() => handleDeleteMilestone(m)} />
              ))
            ) : (
               <Text style={{padding: 10, color: '#9ca3af'}}>לחץ על הוסף כדי לתעד</Text>
            )}
            <TouchableOpacity onPress={() => setIsMilestoneOpen(true)} style={styles.addMilestoneBtn}>
              <Plus size={24} color="#9ca3af" />
              <Text style={styles.addMilestoneText}>הוסף חדש</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* באנר אלבום */}
        <TouchableOpacity onPress={() => setIsMemoriesOpen(true)} style={styles.albumBanner}>
          <Image source={{ uri: baby?.album?.[1] || "https://images.unsplash.com/photo-1519689680058-324335c77eba" }} style={StyleSheet.absoluteFill} />
          <View style={styles.albumOverlay}>
            <View style={styles.albumIconBox}><ImageIcon size={24} color="white" /></View>
            <Text style={styles.albumTitle}>האלבום שלי</Text>
            <Text style={styles.albumSub}>12 חודשים של רגעים קסומים</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* --- מודאלים --- */}
      
      {/* עריכת מדדים */}
      <Modal visible={!!editMetric} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editMetric?.title}</Text>
              <TouchableOpacity onPress={() => setEditMetric(null)}><X size={24} color="#9ca3af"/></TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TextInput style={styles.bigInput} value={editMetric?.value} onChangeText={(t) => setEditMetric(prev => prev ? {...prev, value: t} : null)} keyboardType="numeric" />
              <Text style={styles.inputUnit}>{editMetric?.unit}</Text>
            </View>
            <TouchableOpacity onPress={() => handleSaveMetric(editMetric?.value || '')} style={styles.saveBtn}><Text style={styles.saveBtnText}>שמור שינויים</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* הוספת אבן דרך */}
      <Modal visible={isMilestoneOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>הוסף אבן דרך</Text>
              <TouchableOpacity onPress={() => setIsMilestoneOpen(false)}><X size={24} color="#9ca3af"/></TouchableOpacity>
            </View>
            
            <TextInput style={styles.textInput} placeholder="מה קרה?" value={newMilestoneTitle} onChangeText={setNewMilestoneTitle} textAlign="right" />
            
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowMilestonePicker(true)}>
              <CalendarIcon size={20} color="#6b7280" />
              <Text style={styles.datePickerText}>{newMilestoneDate.toLocaleDateString('he-IL')}</Text>
            </TouchableOpacity>

            {showMilestonePicker && (
              <DateTimePicker value={newMilestoneDate} mode="date" display="default" maximumDate={new Date()} onChange={onMilestoneDateChange} />
            )}

            <TouchableOpacity onPress={handleAddMilestone} style={[styles.saveBtn, {marginTop: 10}]}><Text style={styles.saveBtnText}>הוסף</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* הוספת חיסון אישי */}
      <Modal visible={isVaccineModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>חיסון אישי</Text>
              <TouchableOpacity onPress={() => setIsVaccineModalOpen(false)}><X size={24} color="#9ca3af"/></TouchableOpacity>
            </View>
            <TextInput style={styles.textInput} placeholder="שם החיסון (למשל: שפעת)" value={newVaccineName} onChangeText={setNewVaccineName} textAlign="right" />
            <TouchableOpacity onPress={handleAddCustomVaccine} style={styles.saveBtn}><Text style={styles.saveBtnText}>הוסף לרשימה</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* אלבום */}
      <Modal visible={isMemoriesOpen} animationType="slide">
        <View style={styles.memoriesContainer}>
          <View style={styles.memoriesHeader}>
            <TouchableOpacity onPress={() => setIsMemoriesOpen(false)} style={styles.closeRoundBtn}><X size={24} color="#1f2937" /></TouchableOpacity>
            <Text style={styles.memoriesTitle}>אלבום חודשי</Text>
            <View style={{width: 40}} />
          </View>
          <ScrollView contentContainerStyle={styles.memoriesGrid}>
            {Array.from({ length: 12 }).map((_, i) => {
              const month = i + 1;
              const img = baby?.album?.[month];
              return (
                <TouchableOpacity key={month} style={styles.memoryCard} onPress={() => handleImagePick('album', month)}>
                  {img ? (
                    <>
                      <Image source={{ uri: img }} style={StyleSheet.absoluteFill} />
                      <View style={styles.memoryOverlay}><Text style={styles.memoryText}>חודש {month}</Text></View>
                    </>
                  ) : (
                    <View style={styles.emptyMemory}>
                       <View style={styles.emptyMemoryIcon}><Camera size={20} color="#cbd5e1" /></View>
                       <Text style={styles.emptyMemoryText}>חודש {month}</Text>
                       {savingImg && <ActivityIndicator />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { height: 340, backgroundColor: '#0f172a', borderBottomLeftRadius: 48, borderBottomRightRadius: 48, overflow: 'hidden', paddingTop: 50, position: 'relative' },
  bgEffect1: { position: 'absolute', top: -80, left: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(79, 70, 229, 0.4)' },
  bgEffect2: { position: 'absolute', top: 40, right: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(147, 51, 234, 0.4)' },
  navbar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, zIndex: 10 },
  navBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 50 },
  navTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', opacity: 0.8, letterSpacing: 1 },
  profileContent: { alignItems: 'center', marginTop: 30, zIndex: 10 },
  avatarContainer: { marginBottom: 15, position: 'relative' },
  glowRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 100, opacity: 0.7 },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: 'white' },
  cameraBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#4f46e5', padding: 8, borderRadius: 50, borderWidth: 2, borderColor: '#0f172a' },
  babyName: { fontSize: 32, fontWeight: '900', color: 'white', marginBottom: 10 },
  ageBadge: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 6 },
  ageText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  statsContainer: { paddingHorizontal: 24, marginTop: -45, marginBottom: 30, zIndex: 20 },
  statsCard: { backgroundColor: 'white', borderRadius: 24, padding: 16, flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, height: 90 },
  statCol: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 24, fontWeight: '900', color: '#1e293b', lineHeight: 28 },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' },
  statDivider: { width: 1, height: 40, backgroundColor: '#f3f4f6' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12, textAlign: 'right' },
  sectionRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  gridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12 },
  gridItem: { width: '48%' },
  growthCard: { backgroundColor: 'white', borderRadius: 24, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, height: 160, justifyContent: 'space-between' },
  growthHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: { padding: 10, borderRadius: 16 },
  editIconSmall: { padding: 6, backgroundColor: '#f9fafb', borderRadius: 50 },
  growthLabel: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af', textAlign: 'right', marginBottom: 2 },
  valueRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 },
  growthValue: { fontSize: 26, fontWeight: '900', color: '#111827' },
  growthUnit: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  percentileRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 },
  percentileText: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af' },
  progressBarBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 10 },
  medicalCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, overflow: 'hidden', position: 'relative' },
  medicalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, zIndex: 10 },
  medicalIconBox: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 16 },
  medicalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  medicalSubtitle: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  addVaccineBtn: { padding: 8, backgroundColor: '#10b981', borderRadius: 50, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  vaccineHeader: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 12, textAlign: 'right', flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  vaccineRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f9fafb', padding: 12, borderRadius: 16, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  vaccineName: { fontSize: 14, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  vaccineDate: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  milestoneCard: { minWidth: 140, backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center', marginRight: 12, height: 120, justifyContent: 'center', position: 'relative' },
  deleteMilestone: { position: 'absolute', top: 8, left: 8, padding: 6, backgroundColor: '#fef2f2', borderRadius: 20, zIndex: 10 },
  milestoneIconBg: { width: 40, height: 40, backgroundColor: '#fff7ed', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  milestoneTitle: { fontSize: 12, fontWeight: 'bold', color: '#1f2937', textAlign: 'center' },
  milestoneDate: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  addMilestoneBtn: { minWidth: 130, backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', height: 120 },
  addMilestoneText: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af', marginTop: 8 },
  albumBanner: { height: 180, width: '100%', borderRadius: 32, overflow: 'hidden', marginBottom: 40, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  albumOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(30, 27, 75, 0.8)', alignItems: 'center', justifyContent: 'center' },
  albumIconBox: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  albumTitle: { fontSize: 24, fontWeight: '900', color: 'white' },
  albumSub: { fontSize: 14, color: '#e0e7ff', opacity: 0.9 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 320, backgroundColor: 'white', borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 24 },
  bigInput: { fontSize: 40, fontWeight: '900', color: '#111827', borderBottomWidth: 2, borderBottomColor: '#e0e7ff', paddingBottom: 4, minWidth: 80, textAlign: 'center' },
  inputUnit: { fontSize: 20, fontWeight: '500', color: '#9ca3af' },
  textInput: { width: '100%', backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  saveBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  memoriesContainer: { flex: 1, backgroundColor: '#F2F2F7' },
  memoriesHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: 'white', paddingTop: 60 },
  closeRoundBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 50 },
  memoriesTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
  memoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, justifyContent: 'space-between' },
  memoryCard: { width: '48%', aspectRatio: 1, backgroundColor: 'white', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6' },
  memoryOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, alignItems: 'center' },
  memoryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  emptyMemory: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  emptyMemoryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  emptyMemoryText: { fontSize: 16, fontWeight: '900', color: '#cbd5e1' },
  datePickerBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  datePickerText: { fontSize: 16, color: '#374151', fontWeight: '500' }
});
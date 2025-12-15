import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Alert, TextInput, Animated, Dimensions, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Syringe, Thermometer, Pill, Stethoscope, X, ChevronLeft, ChevronRight, Plus, Check, Trash2, Camera, FileText, Image as ImageIcon, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@react-native-community/slider';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { VACCINE_SCHEDULE, CustomVaccine } from '../../types/profile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HealthCardProps {
    dynamicStyles: { text: string };
}

type HealthScreen = 'menu' | 'vaccines' | 'doctor' | 'illness' | 'temperature' | 'medications';

interface HealthOption {
    key: HealthScreen;
    label: string;
    description: string;
    icon: any;
    gradientColors: [string, string];
    bgColor: string;
}

// Common illnesses and medications
const COMMON_ILLNESSES = [
    'אדמת', 'אבעבועות רוח', 'ברונכיטיס', 'דלקת הגרון', 'דלקת אוזניים',
    'זיהום בדרכי הנשימה', 'כאבי בקיעת שיניים', 'נזלת', 'קר', 'שלשול',
    'שפעת', 'שיעול יבש', 'שיעול רטוב', 'חום'
];

const COMMON_MEDICATIONS = [
    'אנטיביוטיקה', 'אנטי דלקתי', 'הקלה בכאב', 'ויטמין C', 'ויטמין D',
    'טיפות', 'מחטא', 'נוגד חום', 'פרוביוטיקה', 'תרסיסים'
];

const HEALTH_OPTIONS: HealthOption[] = [
    { key: 'doctor', label: 'ביקור רופא', description: 'תיעוד ביקורים', icon: Stethoscope, gradientColors: ['#10B981', '#059669'], bgColor: '#ECFDF5' },
    { key: 'vaccines', label: 'חיסונים', description: 'מעקב חיסונים', icon: Syringe, gradientColors: ['#6366F1', '#4F46E5'], bgColor: '#EEF2FF' },
    { key: 'illness', label: 'מחלות', description: 'היסטוריית מחלות', icon: Heart, gradientColors: ['#EF4444', '#DC2626'], bgColor: '#FEF2F2' },
    { key: 'temperature', label: 'טמפרטורה', description: 'מעקב חום', icon: Thermometer, gradientColors: ['#F59E0B', '#D97706'], bgColor: '#FFFBEB' },
    { key: 'medications', label: 'תרופות', description: 'ניהול תרופות', icon: Pill, gradientColors: ['#8B5CF6', '#7C3AED'], bgColor: '#F5F3FF' },
];

const HealthCard = memo(({ dynamicStyles }: HealthCardProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentScreen, setCurrentScreen] = useState<HealthScreen>('menu');
    const scaleAnims = useRef(HEALTH_OPTIONS.map(() => new Animated.Value(1))).current;

    // Vaccine state
    const [vaccines, setVaccines] = useState<Record<string, boolean>>({});
    const [customVaccines, setCustomVaccines] = useState<CustomVaccine[]>([]);
    const [babyId, setBabyId] = useState<string | null>(null);
    const [newVaccineName, setNewVaccineName] = useState('');
    const [showAddVaccine, setShowAddVaccine] = useState(false);

    // Temperature state with slider
    const [temperature, setTemperature] = useState(37.0);
    const [tempNote, setTempNote] = useState('');

    // Illness state
    const [selectedIllness, setSelectedIllness] = useState<string | null>(null);
    const [illnessNote, setIllnessNote] = useState('');

    // Medication state
    const [selectedMed, setSelectedMed] = useState<string | null>(null);
    const [medNote, setMedNote] = useState('');

    // Doctor visit state with real uploads
    const [doctorReason, setDoctorReason] = useState('');
    const [doctorNote, setDoctorNote] = useState('');
    const [doctorPhoto, setDoctorPhoto] = useState<string | null>(null);
    const [doctorDocument, setDoctorDocument] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    useEffect(() => {
        if (isModalOpen && currentScreen === 'vaccines') {
            loadVaccines();
        }
    }, [isModalOpen, currentScreen]);

    const loadVaccines = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Query for baby by parentId (not direct doc ID)
            const q = query(collection(db, 'babies'), where('parentId', '==', user.uid), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const babyDoc = querySnapshot.docs[0];
                const data = babyDoc.data();
                setBabyId(babyDoc.id); // Use actual baby doc ID
                setVaccines(data.vaccines || {});
                setCustomVaccines(data.customVaccines || []);
            }
        } catch (error) {
            console.error('Error loading vaccines:', error);
        }
    };

    const toggleVaccine = async (key: string) => {
        if (!babyId) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        const newVal = !vaccines[key];
        const updated = { ...vaccines, [key]: newVal };
        setVaccines(updated);

        try {
            await updateDoc(doc(db, 'babies', babyId), { vaccines: updated });
        } catch (error) {
            console.error('Error updating vaccine:', error);
        }
    };

    const addCustomVaccine = async () => {
        if (!babyId || !newVaccineName.trim()) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const newVaccine: CustomVaccine = {
            id: Date.now().toString(),
            name: newVaccineName.trim(),
            date: new Date().toISOString(),
        };

        const updated = [...customVaccines, newVaccine];
        setCustomVaccines(updated);
        setNewVaccineName('');
        setShowAddVaccine(false);

        try {
            await updateDoc(doc(db, 'babies', babyId), { customVaccines: updated });
        } catch (error) {
            console.error('Error adding custom vaccine:', error);
        }
    };

    const deleteCustomVaccine = async (id: string) => {
        if (!babyId) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const updated = customVaccines.filter(v => v.id !== id);
        setCustomVaccines(updated);

        try {
            await updateDoc(doc(db, 'babies', babyId), { customVaccines: updated });
        } catch (error) {
            console.error('Error deleting custom vaccine:', error);
        }
    };

    // Photo picker for doctor visit
    const pickPhoto = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('שגיאה', 'נדרשת הרשאה לגלריה');
                return;
            }

            setUploadingPhoto(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setDoctorPhoto(result.assets[0].uri);
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch (error) {
            console.error('Photo pick error:', error);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Document picker for doctor visit
    const pickDocument = async () => {
        try {
            setUploadingDoc(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });

            if (result.canceled === false && result.assets?.[0]) {
                setDoctorDocument(result.assets[0].name);
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch (error) {
            console.error('Document pick error:', error);
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleCardPressIn = (index: number) => {
        Animated.spring(scaleAnims[index], { toValue: 0.95, useNativeDriver: true }).start();
    };

    const handleCardPressOut = (index: number) => {
        Animated.spring(scaleAnims[index], { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    const handleOptionPress = (option: HealthOption) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentScreen(option.key);
    };

    const openModal = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentScreen('menu');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentScreen('menu');
        resetForms();
    };

    const resetForms = () => {
        setTemperature(37.0);
        setTempNote('');
        setSelectedIllness(null);
        setIllnessNote('');
        setSelectedMed(null);
        setMedNote('');
        setDoctorReason('');
        setDoctorNote('');
        setDoctorPhoto(null);
        setDoctorDocument(null);
    };

    const goBack = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentScreen('menu');
    };

    const saveEntry = async (type: string, data: any) => {
        if (!babyId) {
            // Fetch babyId if not already loaded
            const user = auth.currentUser;
            if (!user) return;
            try {
                const q = query(collection(db, 'babies'), where('parentId', '==', user.uid), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const docId = querySnapshot.docs[0].id;
                    setBabyId(docId);
                    const entry = { ...data, timestamp: new Date().toISOString(), type };
                    await updateDoc(doc(db, 'babies', docId), { healthLog: arrayUnion(entry) });
                }
            } catch (error) {
                console.error('Error saving entry:', error);
                Alert.alert('שגיאה', 'לא ניתן לשמור');
                return;
            }
        } else {
            try {
                const entry = { ...data, timestamp: new Date().toISOString(), type };
                await updateDoc(doc(db, 'babies', babyId), { healthLog: arrayUnion(entry) });
            } catch (error) {
                console.error('Error saving entry:', error);
                Alert.alert('שגיאה', 'לא ניתן לשמור');
                return;
            }
        }

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert('נשמר! ✅', 'הנתונים נשמרו בהצלחה');
        goBack();
    };

    // Get temperature color based on value
    const getTemperatureColor = () => {
        if (temperature < 37.5) return '#10B981';
        if (temperature < 38) return '#F59E0B';
        return '#EF4444';
    };

    // Menu
    const renderMenu = () => (
        <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>מחלות השנה</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>ביקורי רופא</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#10B981' }]}>✓</Text>
                    <Text style={styles.statLabel}>חיסונים עדכניים</Text>
                </View>
            </View>

            <View style={styles.optionsGrid}>
                {HEALTH_OPTIONS.map((option, index) => {
                    const Icon = option.icon;
                    return (
                        <Animated.View key={option.key} style={[styles.optionCardWrapper, { transform: [{ scale: scaleAnims[index] }] }]}>
                            <TouchableOpacity
                                style={[styles.optionCard, { backgroundColor: option.bgColor }]}
                                onPress={() => handleOptionPress(option)}
                                onPressIn={() => handleCardPressIn(index)}
                                onPressOut={() => handleCardPressOut(index)}
                                activeOpacity={1}
                            >
                                <LinearGradient colors={option.gradientColors} style={styles.optionIconGradient}>
                                    <Icon size={26} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.optionLabel}>{option.label}</Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </ScrollView>
    );

    // Vaccines with strikethrough
    const renderVaccines = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.screenHeaderIcon}>
                    <Syringe size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.screenSubtitle}>לפי המלצות משרד הבריאות</Text>
            </View>

            {/* Add Custom Vaccine Button */}
            <TouchableOpacity
                style={styles.addVaccineBtn}
                onPress={() => setShowAddVaccine(!showAddVaccine)}
            >
                <Plus size={20} color="#6366F1" />
                <Text style={styles.addVaccineBtnText}>הוסף חיסון</Text>
            </TouchableOpacity>

            {showAddVaccine && (
                <View style={styles.addVaccineForm}>
                    <TextInput
                        style={styles.addVaccineInput}
                        value={newVaccineName}
                        onChangeText={setNewVaccineName}
                        placeholder="שם החיסון"
                        placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity style={styles.addVaccineSubmit} onPress={addCustomVaccine}>
                        <Check size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Custom Vaccines */}
            {customVaccines.length > 0 && (
                <View style={styles.vaccineGroup}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.ageBadge}>
                        <Text style={styles.ageBadgeText}>חיסונים מותאמים</Text>
                    </LinearGradient>
                    {customVaccines.map(vaccine => (
                        <View key={vaccine.id} style={styles.vaccineRowDone}>
                            <Text style={styles.vaccineNameDone}>{vaccine.name}</Text>
                            <TouchableOpacity onPress={() => deleteCustomVaccine(vaccine.id)}>
                                <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {VACCINE_SCHEDULE.map((group, gIdx) => (
                <View key={gIdx} style={styles.vaccineGroup}>
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.ageBadge}>
                        <Text style={styles.ageBadgeText}>{group.ageTitle}</Text>
                    </LinearGradient>

                    {group.vaccines.map((vaccine, vIdx) => {
                        const isChecked = vaccines[vaccine.key] || false;
                        return (
                            <TouchableOpacity
                                key={vIdx}
                                style={[styles.vaccineRow, isChecked && styles.vaccineRowDone]}
                                onPress={() => toggleVaccine(vaccine.key)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                    {isChecked && <Check size={14} color="#fff" />}
                                </View>
                                <Text style={[styles.vaccineName, isChecked && styles.vaccineNameDone]}>
                                    {vaccine.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );

    // Temperature with Slider
    const renderTemperature = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.screenHeaderIcon}>
                    <Thermometer size={28} color="#fff" />
                </LinearGradient>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>טמפרטורה (°C)</Text>

                {/* Big temperature display */}
                <View style={[styles.temperatureDisplay, { borderColor: getTemperatureColor() }]}>
                    <Text style={[styles.temperatureValue, { color: getTemperatureColor() }]}>
                        {temperature.toFixed(1)}
                    </Text>
                    <Text style={styles.temperatureUnit}>°C</Text>
                </View>

                {/* Slider */}
                <View style={styles.sliderContainer}>
                    <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setTemperature(Math.max(35, temperature - 0.1))}
                    >
                        <Minus size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <Slider
                        style={styles.slider}
                        minimumValue={35}
                        maximumValue={42}
                        step={0.1}
                        value={temperature}
                        onValueChange={setTemperature}
                        minimumTrackTintColor={getTemperatureColor()}
                        maximumTrackTintColor="#E5E7EB"
                        thumbTintColor={getTemperatureColor()}
                    />

                    <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setTemperature(Math.min(42, temperature + 0.1))}
                    >
                        <Plus size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Quick buttons */}
                <View style={styles.quickSelectRow}>
                    {[36.6, 37.0, 37.5, 38.0, 38.5, 39.0].map(temp => (
                        <TouchableOpacity
                            key={temp}
                            style={[
                                styles.quickSelectBtn,
                                Math.abs(temperature - temp) < 0.05 && styles.quickSelectBtnActive,
                                temp >= 38 && styles.quickSelectBtnWarning
                            ]}
                            onPress={() => setTemperature(temp)}
                        >
                            <Text style={[
                                styles.quickSelectText,
                                Math.abs(temperature - temp) < 0.05 && styles.quickSelectTextActive
                            ]}>{temp.toFixed(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>הערות</Text>
                <TextInput
                    style={styles.textArea}
                    value={tempNote}
                    onChangeText={setTempNote}
                    placeholder="הוסף הערות..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => saveEntry('temperature', { value: temperature.toFixed(1), note: tempNote })}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.saveButtonGradient}>
                    <Text style={styles.saveButtonText}>שמור</Text>
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );

    // Doctor with real uploads
    const renderDoctor = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.screenHeaderIcon}>
                    <Stethoscope size={28} color="#fff" />
                </LinearGradient>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>סיבת הביקור</Text>
                <TextInput
                    style={styles.textInput}
                    value={doctorReason}
                    onChangeText={setDoctorReason}
                    placeholder="למשל: בדיקה שגרתית, חום..."
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>סיכום / המלצות הרופא</Text>
                <TextInput
                    style={styles.textArea}
                    value={doctorNote}
                    onChangeText={setDoctorNote}
                    placeholder="המלצות, תרופות שנרשמו..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                />
            </View>

            {/* Photo Upload */}
            <View style={styles.uploadSection}>
                <TouchableOpacity
                    style={[styles.uploadButton, doctorPhoto && styles.uploadButtonSuccess]}
                    onPress={pickPhoto}
                    disabled={uploadingPhoto}
                >
                    {uploadingPhoto ? (
                        <ActivityIndicator color="#6B7280" />
                    ) : doctorPhoto ? (
                        <>
                            <Image source={{ uri: doctorPhoto }} style={styles.uploadPreview} />
                            <Text style={styles.uploadButtonTextSuccess}>תמונה הועלתה ✓</Text>
                        </>
                    ) : (
                        <>
                            <Camera size={24} color="#6B7280" />
                            <Text style={styles.uploadButtonText}>הוסף תמונה</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Document Upload */}
                <TouchableOpacity
                    style={[styles.uploadButton, doctorDocument && styles.uploadButtonSuccess]}
                    onPress={pickDocument}
                    disabled={uploadingDoc}
                >
                    {uploadingDoc ? (
                        <ActivityIndicator color="#6B7280" />
                    ) : doctorDocument ? (
                        <>
                            <FileText size={24} color="#10B981" />
                            <Text style={styles.uploadButtonTextSuccess} numberOfLines={1}>
                                {doctorDocument} ✓
                            </Text>
                        </>
                    ) : (
                        <>
                            <FileText size={24} color="#6B7280" />
                            <Text style={styles.uploadButtonText}>הוסף מסמך</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.saveButton}
                onPress={() => saveEntry('doctor', {
                    reason: doctorReason,
                    note: doctorNote,
                    hasPhoto: !!doctorPhoto,
                    hasDocument: !!doctorDocument
                })}
            >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.saveButtonGradient}>
                    <Text style={styles.saveButtonText}>שמור ביקור</Text>
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );

    // Illness
    const renderIllness = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.screenHeaderIcon}>
                    <Heart size={28} color="#fff" />
                </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>בחר מחלה</Text>
            <View style={styles.chipsContainer}>
                {COMMON_ILLNESSES.map(illness => (
                    <TouchableOpacity
                        key={illness}
                        style={[styles.chip, selectedIllness === illness && styles.chipActive]}
                        onPress={() => setSelectedIllness(illness)}
                    >
                        <Text style={[styles.chipText, selectedIllness === illness && styles.chipTextActive]}>{illness}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>הערות</Text>
                <TextInput style={styles.textArea} value={illnessNote} onChangeText={setIllnessNote} placeholder="תסמינים, טיפול..." placeholderTextColor="#9CA3AF" multiline />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => saveEntry('illness', { name: selectedIllness, note: illnessNote })}>
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.saveButtonGradient}>
                    <Text style={styles.saveButtonText}>שמור</Text>
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );

    // Medications
    const renderMedications = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.screenHeaderIcon}>
                    <Pill size={28} color="#fff" />
                </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>בחר סוג תרופה</Text>
            <View style={styles.chipsContainer}>
                {COMMON_MEDICATIONS.map(med => (
                    <TouchableOpacity key={med} style={[styles.chip, selectedMed === med && styles.chipActivePurple]} onPress={() => setSelectedMed(med)}>
                        <Text style={[styles.chipText, selectedMed === med && styles.chipTextActive]}>{med}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>הערות (מינון, תדירות)</Text>
                <TextInput style={styles.textArea} value={medNote} onChangeText={setMedNote} placeholder="מינון: 5 מ״ל, פעמיים ביום..." placeholderTextColor="#9CA3AF" multiline />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => saveEntry('medication', { name: selectedMed, note: medNote })}>
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.saveButtonGradient}>
                    <Text style={styles.saveButtonText}>שמור</Text>
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );

    const getScreenTitle = () => {
        switch (currentScreen) {
            case 'vaccines': return 'פנקס חיסונים';
            case 'doctor': return 'ביקור רופא';
            case 'illness': return 'מחלות';
            case 'temperature': return 'טמפרטורה';
            case 'medications': return 'תרופות';
            default: return 'בריאות';
        }
    };

    const getHeaderGradient = (): [string, string] => {
        switch (currentScreen) {
            case 'vaccines': return ['#6366F1', '#4F46E5'];
            case 'doctor': return ['#10B981', '#059669'];
            case 'illness': return ['#EF4444', '#DC2626'];
            case 'temperature': return ['#F59E0B', '#D97706'];
            case 'medications': return ['#8B5CF6', '#7C3AED'];
            default: return ['#10B981', '#059669'];
        }
    };

    return (
        <>
            <TouchableOpacity onPress={openModal} activeOpacity={0.9}>
                <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
                    <View style={styles.cardContent}>
                        <View style={styles.cardIconWrapper}>
                            <Heart size={28} color="#fff" />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>בריאות</Text>
                            <Text style={styles.cardSubtitle}>חיסונים • טמפרטורה • תרופות</Text>
                        </View>
                        <View style={styles.cardArrow}>
                            <ChevronLeft size={24} color="rgba(255,255,255,0.8)" />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <LinearGradient colors={getHeaderGradient()} style={styles.modalHeader}>
                            {currentScreen !== 'menu' ? (
                                <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
                                    <ChevronRight size={24} color="#fff" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={closeModal} style={styles.headerBtn}>
                                    <X size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.modalTitle}>{getScreenTitle()}</Text>
                            <View style={{ width: 40 }} />
                        </LinearGradient>

                        <View style={styles.modalBody}>
                            {currentScreen === 'menu' && renderMenu()}
                            {currentScreen === 'vaccines' && renderVaccines()}
                            {currentScreen === 'doctor' && renderDoctor()}
                            {currentScreen === 'illness' && renderIllness()}
                            {currentScreen === 'temperature' && renderTemperature()}
                            {currentScreen === 'medications' && renderMedications()}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
});

HealthCard.displayName = 'HealthCard';

const styles = StyleSheet.create({
    card: { borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    cardContent: { flexDirection: 'row-reverse', alignItems: 'center' },
    cardIconWrapper: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    cardText: { flex: 1, marginRight: 16, alignItems: 'flex-end' },
    cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    cardSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    cardArrow: { opacity: 0.8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '92%', overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
    headerBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    modalTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    modalBody: { flex: 1, backgroundColor: '#F9FAFB' },

    menuContainer: { padding: 20 },
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    statCard: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#E5E7EB' },
    statNumber: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    optionCardWrapper: { width: '48%', marginBottom: 16 },
    optionCard: { borderRadius: 24, padding: 20, alignItems: 'center', minHeight: 140, justifyContent: 'center' },
    optionIconGradient: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    optionLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    optionDescription: { fontSize: 12, color: '#6B7280', marginTop: 4 },

    screenContent: { padding: 20, paddingBottom: 40 },
    screenHeader: { alignItems: 'center', marginBottom: 24 },
    screenHeaderIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    screenSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 12 },

    // Vaccine styles
    addVaccineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EEF2FF', padding: 14, borderRadius: 14, marginBottom: 20 },
    addVaccineBtnText: { fontSize: 15, fontWeight: '600', color: '#6366F1' },
    addVaccineForm: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    addVaccineInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB' },
    addVaccineSubmit: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
    vaccineGroup: { marginBottom: 20 },
    ageBadge: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
    ageBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    vaccineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    vaccineRowDone: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#10B981' },
    vaccineName: { fontSize: 15, color: '#1F2937', fontWeight: '500' },
    vaccineNameDone: { fontSize: 15, color: '#10B981', fontWeight: '600', textDecorationLine: 'line-through' },
    checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },

    // Temperature slider
    temperatureDisplay: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 3, marginBottom: 20 },
    temperatureValue: { fontSize: 64, fontWeight: '800' },
    temperatureUnit: { fontSize: 24, color: '#6B7280', marginTop: -8 },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sliderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    slider: { flex: 1, marginHorizontal: 10, height: 40 },

    // Forms
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'right' },
    textInput: { backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB' },
    textArea: { backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 100, textAlignVertical: 'top' },
    quickSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    quickSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    quickSelectBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    quickSelectBtnWarning: { borderColor: '#EF4444' },
    quickSelectText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    quickSelectTextActive: { color: '#fff' },

    // Upload
    uploadSection: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    uploadButton: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 100 },
    uploadButtonSuccess: { backgroundColor: '#F0FDF4', borderColor: '#10B981' },
    uploadButtonText: { fontSize: 14, color: '#6B7280', marginTop: 8, fontWeight: '500' },
    uploadButtonTextSuccess: { fontSize: 12, color: '#10B981', marginTop: 8, fontWeight: '600' },
    uploadPreview: { width: 50, height: 50, borderRadius: 8 },

    // Chips
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12, textAlign: 'right' },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    chipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    chipActivePurple: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    chipText: { fontSize: 14, fontWeight: '500', color: '#374151' },
    chipTextActive: { color: '#fff' },

    saveButton: { marginTop: 8 },
    saveButtonGradient: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    saveButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});

export default HealthCard;

import React, { memo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Syringe, Thermometer, Pill, Stethoscope, X, ChevronLeft, ChevronRight, Plus, Check, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { VACCINE_SCHEDULE, CustomVaccine } from '../../types/profile';

interface HealthCardProps {
    dynamicStyles: { text: string };
}

type HealthScreen = 'menu' | 'vaccines' | 'doctor' | 'illness' | 'temperature' | 'medications';

interface HealthOption {
    key: HealthScreen;
    label: string;
    icon: any;
    color: string;
    bgColor: string;
}

const HEALTH_OPTIONS: HealthOption[] = [
    { key: 'doctor', label: 'ביקור רופא', icon: Stethoscope, color: '#10B981', bgColor: '#D1FAE5' },
    { key: 'vaccines', label: 'חיסונים', icon: Syringe, color: '#6366F1', bgColor: '#E0E7FF' },
    { key: 'illness', label: 'מחלות', icon: Heart, color: '#EF4444', bgColor: '#FEE2E2' },
    { key: 'temperature', label: 'טמפרטורה', icon: Thermometer, color: '#F59E0B', bgColor: '#FEF3C7' },
    { key: 'medications', label: 'תרופות', icon: Pill, color: '#8B5CF6', bgColor: '#EDE9FE' },
];

const HealthCard = memo(({ dynamicStyles }: HealthCardProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentScreen, setCurrentScreen] = useState<HealthScreen>('menu');

    // Vaccine state
    const [vaccines, setVaccines] = useState<Record<string, boolean>>({});
    const [customVaccines, setCustomVaccines] = useState<CustomVaccine[]>([]);
    const [babyId, setBabyId] = useState<string | null>(null);

    // Load vaccines when modal opens
    useEffect(() => {
        if (isModalOpen && currentScreen === 'vaccines') {
            loadVaccines();
        }
    }, [isModalOpen, currentScreen]);

    const loadVaccines = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const babyDoc = await getDoc(doc(db, 'babies', user.uid));
            if (babyDoc.exists()) {
                const data = babyDoc.data();
                setBabyId(user.uid);
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    const handleOptionPress = (option: HealthOption) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setCurrentScreen(option.key);
    };

    const openModal = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setCurrentScreen('menu');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentScreen('menu');
    };

    const goBack = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setCurrentScreen('menu');
    };

    // Render the main menu
    const renderMenu = () => (
        <ScrollView
            contentContainerStyle={styles.optionsGrid}
            showsVerticalScrollIndicator={false}
        >
            {HEALTH_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                    <TouchableOpacity
                        key={option.key}
                        style={[styles.optionCard, { backgroundColor: option.bgColor }]}
                        onPress={() => handleOptionPress(option)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                            <Icon size={28} color="#fff" />
                        </View>
                        <Text style={[styles.optionLabel, { color: option.color }]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );

    // Render vaccine screen
    const renderVaccines = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.vaccineContent}>
            <Text style={styles.vaccineSubtitle}>לפי המלצות משרד הבריאות</Text>

            {VACCINE_SCHEDULE.map((group, gIdx) => (
                <View key={gIdx} style={styles.vaccineGroup}>
                    <View style={styles.ageBadge}>
                        <Text style={styles.ageBadgeText}>{group.ageTitle}</Text>
                    </View>

                    {group.vaccines.map((vaccine, vIdx) => {
                        const isChecked = vaccines[vaccine.key] || false;

                        return (
                            <TouchableOpacity
                                key={vIdx}
                                style={styles.vaccineRow}
                                onPress={() => toggleVaccine(vaccine.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.vaccineName}>{vaccine.name}</Text>
                                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                    {isChecked && <Check size={14} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );

    // Render coming soon screen
    const renderComingSoon = (title: string) => (
        <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonEmoji}>🚧</Text>
            <Text style={styles.comingSoonTitle}>{title}</Text>
            <Text style={styles.comingSoonText}>פיצ'ר זה יהיה זמין בקרוב!</Text>
        </View>
    );

    const getScreenTitle = () => {
        switch (currentScreen) {
            case 'vaccines': return '💉 פנקס חיסונים';
            case 'doctor': return '🩺 ביקורי רופא';
            case 'illness': return '🤒 מחלות';
            case 'temperature': return '🌡️ טמפרטורה';
            case 'medications': return '💊 תרופות';
            default: return '🏥 בריאות';
        }
    };

    return (
        <>
            {/* Health Card */}
            <TouchableOpacity onPress={openModal} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.iconContainer}>
                            <Heart size={28} color="#fff" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>בריאות</Text>
                            <Text style={styles.cardSubtitle}>חיסונים, רופא, תרופות</Text>
                        </View>
                        <ChevronLeft size={24} color="rgba(255,255,255,0.7)" />
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {/* Health Modal */}
            <Modal
                visible={isModalOpen}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            {currentScreen !== 'menu' ? (
                                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                                    <ChevronRight size={24} color="#6B7280" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.modalTitle}>{getScreenTitle()}</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Content */}
                        {currentScreen === 'menu' && renderMenu()}
                        {currentScreen === 'vaccines' && renderVaccines()}
                        {currentScreen === 'doctor' && renderComingSoon('ביקורי רופא')}
                        {currentScreen === 'illness' && renderComingSoon('מעקב מחלות')}
                        {currentScreen === 'temperature' && renderComingSoon('מעקב טמפרטורה')}
                        {currentScreen === 'medications' && renderComingSoon('ניהול תרופות')}
                    </View>
                </View>
            </Modal>
        </>
    );
});

HealthCard.displayName = 'HealthCard';

const styles = StyleSheet.create({
    // Card styles
    card: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    cardContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
        marginRight: 15,
        alignItems: 'flex-end',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    cardSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 20,
        paddingBottom: 40,
        height: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    closeBtn: {
        padding: 8,
    },
    backBtn: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingHorizontal: 15,
        gap: 12,
    },
    optionCard: {
        width: '45%',
        aspectRatio: 1.2,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
    },
    optionIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },

    // Vaccine styles
    vaccineContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    vaccineSubtitle: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 13,
        marginBottom: 20,
    },
    vaccineGroup: {
        marginBottom: 20,
    },
    ageBadge: {
        backgroundColor: '#6366F1',
        alignSelf: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 10,
    },
    ageBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    vaccineRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 15,
        borderRadius: 12,
        marginBottom: 8,
    },
    vaccineName: {
        fontSize: 15,
        color: '#1F2937',
        fontWeight: '500',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },

    // Coming soon
    comingSoonContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 60,
    },
    comingSoonEmoji: {
        fontSize: 60,
        marginBottom: 20,
    },
    comingSoonTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 10,
    },
    comingSoonText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
});

export default HealthCard;

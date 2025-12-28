import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useActiveChild } from '../../context/ActiveChildContext';
import { db } from '../../services/firebaseConfig';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TeethTrackerModalProps {
    visible: boolean;
    onClose: () => void;
}

// Teeth Layout Configuration matching the "Oval" design
// We'll arrange them in a continuous loop or two arcs that meet.
// IDs must match standard naming we used before to preserve data.
// 20 Primary Teeth.
// Numbering/Types for visual reference:
// Central Incisor (1), Lateral Incisor (2), Canine (3), First Molar (4), Second Molar (5)
// Quadrants: Upper Right (UR), Upper Left (UL), Lower Left (LL), Lower Right (LR)

const TEETH_CONFIG = [
    // --- Upper Arch (Left to Right) ---
    // Upper Left (Outer to Center)
    { id: 'start_upper_left_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: 30, top: 100, left: 40 }, // Purple
    { id: 'start_upper_left_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: 20, top: 60, left: 50 }, // Blue
    { id: 'start_upper_left_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: 10, top: 35, left: 75 }, // Green
    { id: 'start_upper_left_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: 5, top: 15, left: 105 }, // Lime
    { id: 'start_upper_left_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 10, left: 135 }, // Red

    // Upper Right (Center to Outer)
    { id: 'start_upper_right_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 10, left: 175 },
    { id: 'start_upper_right_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: -5, top: 15, left: 205 },
    { id: 'start_upper_right_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: -10, top: 35, left: 235 },
    { id: 'start_upper_right_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: -20, top: 60, left: 260 },
    { id: 'start_upper_right_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: -30, top: 100, left: 270 },

    // --- Lower Arch (Left to Right) ---
    // Lower Left (Outer to Center)
    { id: 'start_lower_left_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: -30, top: 280, left: 40 },
    { id: 'start_lower_left_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: -20, top: 320, left: 50 },
    { id: 'start_lower_left_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: -10, top: 345, left: 75 },
    { id: 'start_lower_left_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: -5, top: 365, left: 105 },
    { id: 'start_lower_left_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 370, left: 135 },

    // Lower Right (Center to Outer)
    { id: 'start_lower_right_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 370, left: 175 },
    { id: 'start_lower_right_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: 5, top: 365, left: 205 },
    { id: 'start_lower_right_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: 10, top: 345, left: 235 },
    { id: 'start_lower_right_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: 20, top: 320, left: 260 },
    { id: 'start_lower_right_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: 30, top: 280, left: 270 },
];

// Helper to get organic "stone" shapes
const getToothShapeStyle = (type: string) => {
    switch (type) {
        case 'incisor_cen': return { width: 28, height: 32, borderRadius: 10, borderTopLeftRadius: 14, borderTopRightRadius: 14 };
        case 'incisor_lat': return { width: 26, height: 30, borderRadius: 12, borderBottomLeftRadius: 18 };
        case 'canine': return { width: 28, height: 28, borderRadius: 14, borderTopLeftRadius: 4 }; // Pointy
        case 'molar_1': return { width: 34, height: 34, borderRadius: 12, borderTopRightRadius: 16, borderBottomLeftRadius: 16 }; // Irregular square
        case 'molar_2': return { width: 38, height: 36, borderRadius: 14, borderTopLeftRadius: 18, borderBottomRightRadius: 18 }; // Big irregular
        default: return { width: 30, height: 30, borderRadius: 15 };
    }
};

export default function TeethTrackerModal({ visible, onClose }: TeethTrackerModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();
    const [teethData, setTeethData] = useState<Record<string, Date | null>>({});
    const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (visible && activeChild?.childId) {
            loadTeethData();
        }
    }, [visible, activeChild?.childId]);

    const loadTeethData = async () => {
        if (!activeChild?.childId) return;
        try {
            const docRef = doc(db, 'babies', activeChild.childId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const rawTeeth = data.teeth || {};
                const parsed: Record<string, Date | null> = {};

                Object.keys(rawTeeth).forEach(key => {
                    const val = rawTeeth[key];
                    if (val) {
                        try {
                            if (val.seconds) {
                                parsed[key] = new Date(val.seconds * 1000);
                            } else if (val instanceof Date) {
                                parsed[key] = val;
                            } else {
                                parsed[key] = new Date(val);
                            }
                        } catch (e) {
                            console.log('Error parsing date', e);
                        }
                    }
                });
                setTeethData(parsed);
            }
        } catch (e) {
            console.error('Failed to load teeth data', e);
        }
    };

    const handleToothPress = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedTooth(id);
        const existingDate = teethData[id];
        // If exists, default to that date. If not, default to today.
        setCurrentDate(existingDate || new Date());

        // If it already exists, toggle off? Or just edit date?
        // Let's assume press opens date picker to confirm/change or Remove.
        // For now: Always open date picker.
        setShowDatePicker(true);
    };

    const handleDateChange = async (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate && selectedTooth && activeChild?.childId) {
            const newDate = selectedDate;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Optimistic
            setTeethData(prev => ({ ...prev, [selectedTooth]: newDate }));

            // Save
            try {
                const docRef = doc(db, 'babies', activeChild.childId);
                await updateDoc(docRef, {
                    [`teeth.${selectedTooth}`]: Timestamp.fromDate(newDate)
                });
            } catch (e) {
                console.error('Failed to save tooth', e);
            }
        }
    };

    // Toggle logic: If user cancels date picker but wants to remove tooth?
    // We can add a "Remove" button in a separate Alert or customized logic.
    // For now, let's keep it simple: Click -> Date Picker -> Set.

    const renderTooth = (tooth: typeof TEETH_CONFIG[0]) => {
        const isErupted = !!teethData[tooth.id];
        const shapeStyle = getToothShapeStyle(tooth.type);

        // For inactive: Outline only with theme color or gray
        // For active: Filled with specific color

        return (
            <TouchableOpacity
                key={tooth.id}
                style={[
                    styles.toothAbsolute,
                    {
                        top: tooth.top,
                        left: tooth.left,
                        transform: [{ rotate: `${tooth.rot}deg` }]
                    }
                ]}
                onPress={() => handleToothPress(tooth.id)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.toothShape,
                    shapeStyle,
                    isErupted
                        ? { backgroundColor: tooth.color, borderColor: tooth.color } // Filled
                        : { backgroundColor: 'transparent', borderColor: isDarkMode ? '#475569' : '#CBD5E1', borderWidth: 1.5 } // Outline
                ]}>
                    {/* Show number/icon only if erupted? Or maybe just shape. Screenshot shows plain shapes or numbers. Let's keep it clean shapes for now. */}
                    {isErupted && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                        <X size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>תרשים שיני תינוק</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    {/* Main Oval Chart */}
                    <View style={styles.chartContainer}>
                        {/* Center Labels */}
                        <View style={styles.centerLabels}>
                            <Text style={[styles.jawLabel, { color: theme.textSecondary, marginBottom: 40 }]}>שיניים עליונות</Text>
                            <Text style={[styles.jawLabel, { color: theme.textSecondary }]}>שיניים תחתונות</Text>
                        </View>

                        {/* Render All Teeth */}
                        {TEETH_CONFIG.map(renderTooth)}

                        {/* Side Labels */}
                        <Text style={[styles.sideLabel, { left: 10, top: '50%' }]}>שמאל</Text>
                        <Text style={[styles.sideLabel, { right: 10, top: '50%' }]}>ימין</Text>
                    </View>

                    {/* Stats / Legend Card */}
                    <View style={[styles.legendCard, { backgroundColor: theme.card }]}>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>חותכת מרכזית</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#A3E635' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>חותכת צידית</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>ניב</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>טוחנת ראשונה</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>טוחנת שנייה</Text>
                        </View>
                    </View>

                    <View style={[styles.statsRow, { marginTop: 20 }]}>
                        <Text style={[styles.statsText, { color: theme.textPrimary }]}>
                            סה"כ שיניים שבקעו: {Object.keys(teethData).length} / 20
                        </Text>
                    </View>

                </ScrollView>

                {showDatePicker && (
                    <DateTimePicker
                        value={currentDate}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                        textColor={theme.textPrimary} // Fix for dark mode
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 24,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
        alignItems: 'center',
    },
    chartContainer: {
        width: 350,
        height: 420,
        position: 'relative',
        // backgroundColor: '#111', // Debug
        borderRadius: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    centerLabels: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toothAbsolute: {
        position: 'absolute',
        zIndex: 10,
    },
    toothShape: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    jawLabel: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    sideLabel: {
        position: 'absolute',
        color: '#64748B',
        fontSize: 14,
    },

    // Legend
    legendCard: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    legendRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    statsRow: {
        alignItems: 'center',
    },
    statsText: {
        fontSize: 18,
        fontWeight: '700',
    }
});

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { X, Award, Calendar, FileText, Plus, Trash2, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addMilestone, removeMilestone } from '../../services/babyService';

interface Milestone {
    title: string;
    date: any;
    notes?: string;
}

interface MilestonesModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MilestonesModal({ visible, onClose }: MilestonesModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { baby, refresh } = useBabyProfile();

    const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Get milestones from baby profile
    const milestones: Milestone[] = baby?.milestones || [];

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setTitle('');
        setNotes('');
        setDate(new Date());
        setActiveTab('add');
        onClose();
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('שגיאה', 'נא להזין כותרת');
            return;
        }

        if (!baby?.id) {
            Alert.alert('שגיאה', 'לא נמצא פרופיל תינוק');
            return;
        }

        setLoading(true);
        try {
            await addMilestone(baby.id, title.trim(), date);
            await refresh();

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            setTitle('');
            setNotes('');
            setDate(new Date());
            setActiveTab('history');
        } catch (error) {
            if (__DEV__) console.log('Error saving milestone:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את אבן הדרך');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (milestone: Milestone) => {
        if (!baby?.id) return;

        try {
            await removeMilestone(baby.id, milestone);
            await refresh();

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            if (__DEV__) console.log('Error deleting milestone:', error);
        }
    };

    const formatDate = (d: Date | any) => {
        const dateObj = d?.toDate ? d.toDate() : new Date(d);
        return dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatRelativeDate = (d: Date | any) => {
        const dateObj = d?.toDate ? d.toDate() : new Date(d);
        const now = new Date();
        const diffTime = now.getTime() - dateObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'היום';
        if (diffDays === 1) return 'אתמול';
        if (diffDays < 7) return `לפני ${diffDays} ימים`;
        if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
        return formatDate(d);
    };

    // Sort milestones by date (newest first)
    const sortedMilestones = [...milestones].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    // Group milestones by month
    const groupedMilestones = sortedMilestones.reduce((acc, milestone) => {
        const dateObj = milestone.date?.toDate ? milestone.date.toDate() : new Date(milestone.date);
        const monthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
        const monthLabel = dateObj.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

        if (!acc[monthKey]) {
            acc[monthKey] = { label: monthLabel, items: [] };
        }
        acc[monthKey].items.push(milestone);
        return acc;
    }, {} as Record<string, { label: string; items: Milestone[] }>);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ width: 40 }} />
                        <View style={styles.headerContent}>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>אבני דרך</Text>
                            <Award size={20} color="#F59E0B" strokeWidth={2.5} />
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F3F4F6' }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'add' && styles.tabActive]}
                            onPress={() => setActiveTab('add')}
                        >
                            <Plus size={16} color={activeTab === 'add' ? '#F59E0B' : theme.textSecondary} />
                            <Text style={[styles.tabText, { color: activeTab === 'add' ? '#F59E0B' : theme.textSecondary }]}>
                                הוסף חדש
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                            onPress={() => setActiveTab('history')}
                        >
                            <Clock size={16} color={activeTab === 'history' ? '#F59E0B' : theme.textSecondary} />
                            <Text style={[styles.tabText, { color: activeTab === 'history' ? '#F59E0B' : theme.textSecondary }]}>
                                היסטוריה ({milestones.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                        {activeTab === 'add' ? (
                            /* Add Tab - Minimalist */
                            <View style={styles.inputSection}>
                                {/* Title Row */}
                                <View style={styles.rowMinimal}>
                                    <TextInput
                                        style={[styles.inputMinimal, {
                                            backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                                            color: theme.textPrimary,
                                        }]}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="למשל: צעד ראשון"
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="center"
                                    />
                                    <Text style={[styles.labelMinimal, { color: theme.textPrimary }]}>כותרת</Text>
                                </View>

                                {/* Date Row */}
                                <View style={styles.rowMinimal}>
                                    <TouchableOpacity
                                        style={[styles.inputMinimal, {
                                            backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                                        }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={[styles.dateTextMinimal, { color: theme.textPrimary }]}>
                                            {formatDate(date)}
                                        </Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.labelMinimal, { color: theme.textPrimary }]}>תאריך</Text>
                                </View>

                                {/* Notes Row */}
                                <View style={styles.rowMinimal}>
                                    <TextInput
                                        style={[styles.notesInputMinimal, {
                                            backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                                            color: theme.textPrimary,
                                        }]}
                                        value={notes}
                                        onChangeText={setNotes}
                                        placeholder="הערות..."
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="right"
                                        multiline
                                        numberOfLines={2}
                                    />
                                    <Text style={[styles.labelMinimal, { color: theme.textPrimary }]}>הערות</Text>
                                </View>

                                {/* Save Button - Green */}
                                <TouchableOpacity
                                    style={[styles.saveBtnGreen, { opacity: !title.trim() || loading ? 0.5 : 1 }]}
                                    onPress={handleSave}
                                    disabled={!title.trim() || loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.saveBtnTextGreen}>שמור אבן דרך</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* History Tab */
                            <View style={styles.historySection}>
                                {milestones.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <View style={[styles.emptyIcon, { backgroundColor: '#FEF3C7' }]}>
                                            <Award size={32} color="#F59E0B" />
                                        </View>
                                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                                            אין אבני דרך עדיין
                                        </Text>
                                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                            לחץ על "הוסף חדש" כדי לתעד את הרגעים המיוחדים
                                        </Text>
                                    </View>
                                ) : (
                                    Object.values(groupedMilestones).map((group, groupIndex) => (
                                        <View key={groupIndex} style={styles.monthGroup}>
                                            <Text style={[styles.monthLabel, { color: theme.textSecondary }]}>
                                                {group.label}
                                            </Text>
                                            {group.items.map((milestone, index) => (
                                                <View
                                                    key={index}
                                                    style={[styles.milestoneCard, {
                                                        backgroundColor: isDarkMode ? '#2C2C2E' : '#fff',
                                                        borderColor: isDarkMode ? '#3C3C3E' : '#E5E7EB'
                                                    }]}
                                                >
                                                    <View style={styles.milestoneHeader}>
                                                        <TouchableOpacity
                                                            style={styles.deleteBtn}
                                                            onPress={() => handleDelete(milestone)}
                                                        >
                                                            <Trash2 size={16} color="#EF4444" />
                                                        </TouchableOpacity>
                                                        <View style={styles.milestoneInfo}>
                                                            <View style={[styles.milestoneBadge, { backgroundColor: '#FEF3C7' }]}>
                                                                <Award size={16} color="#F59E0B" />
                                                            </View>
                                                            <View style={styles.milestoneTexts}>
                                                                <Text style={[styles.milestoneTitle, { color: theme.textPrimary }]}>
                                                                    {milestone.title}
                                                                </Text>
                                                                <Text style={[styles.milestoneDate, { color: theme.textSecondary }]}>
                                                                    {formatDate(milestone.date)} • {formatRelativeDate(milestone.date)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    {milestone.notes ? (
                                                        <Text style={[styles.milestoneNotes, { color: theme.textSecondary }]}>
                                                            {milestone.notes}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            ))}
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Date Picker */}
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) {
                                    setDate(selectedDate);
                                }
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 20,
        maxHeight: '90%',
        minHeight: 500,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    tabContainer: {
        flexDirection: 'row-reverse',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingTop: 16,
    },
    inputSection: {
        paddingBottom: 20,
    },
    iconCircleWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    dateInput: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'right',
    },
    textArea: {
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveBtn: {
        backgroundColor: '#F59E0B',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    historySection: {
        paddingBottom: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    monthGroup: {
        marginBottom: 20,
    },
    monthLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
    },
    milestoneCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    milestoneHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    milestoneInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    milestoneBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    milestoneTexts: {
        flex: 1,
        alignItems: 'flex-end',
    },
    milestoneTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    milestoneDate: {
        fontSize: 12,
    },
    milestoneNotes: {
        fontSize: 14,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        textAlign: 'right',
        lineHeight: 20,
    },
    deleteBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
    },
    // Minimalist styles
    rowMinimal: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    labelMinimal: {
        fontSize: 14,
        fontWeight: '500',
        width: 60,
        textAlign: 'right',
    },
    inputMinimal: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        justifyContent: 'center',
    },
    dateTextMinimal: {
        fontSize: 16,
        textAlign: 'center',
    },
    notesInputMinimal: {
        flex: 1,
        minHeight: 60,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        textAlignVertical: 'top',
    },
    saveBtnGreen: {
        backgroundColor: '#34D399',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#34D399',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnTextGreen: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Info, Plus, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VACCINE_SCHEDULE, CustomVaccine } from '../../types/profile';

interface VaccineTrackerProps {
    vaccines?: { [key: string]: boolean };
    customVaccines?: CustomVaccine[];
    onToggle: (key: string) => void;
    onToggleCustom: (vaccine: CustomVaccine) => void;
    onAddCustom: () => void;
    onDeleteCustom: (vaccine: CustomVaccine) => void;
}

const VaccineTracker = memo(({
    vaccines,
    customVaccines,
    onToggle,
    onToggleCustom,
    onAddCustom,
    onDeleteCustom,
}: VaccineTrackerProps) => {

    const handleToggle = (key: string) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onToggle(key);
    };

    const handleToggleCustom = (vaccine: CustomVaccine) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onToggleCustom(vaccine);
    };

    const openHealthInfo = () => {
        Linking.openURL('https://www.health.gov.il/Subjects/pregnancy/Childbirth/Vaccination_of_infants/Pages/default.aspx');
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>💉 פנקס חיסונים</Text>
                <TouchableOpacity onPress={openHealthInfo}>
                    <Info size={18} color="#6366f1" />
                </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>לפי המלצות משרד הבריאות</Text>

            {VACCINE_SCHEDULE.map((group, idx) => (
                <View key={idx} style={styles.vaccineGroup}>
                    <Text style={styles.ageTitle}>{group.ageTitle}</Text>
                    {group.vaccines.map((v) => {
                        const isDone = vaccines?.[v.key];
                        return (
                            <TouchableOpacity
                                key={v.key}
                                style={[styles.vaccineRow, isDone && styles.vaccineRowDone]}
                                onPress={() => handleToggle(v.key)}
                            >
                                <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                                    {isDone && <Check size={12} color="white" />}
                                </View>
                                <Text style={[styles.vaccineText, isDone && styles.vaccineTextDone]}>
                                    {v.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={onAddCustom}>
                <Plus size={16} color="#6366f1" />
                <Text style={styles.addText}>הוסף חיסון אחר</Text>
            </TouchableOpacity>

            {customVaccines?.map((v, i) => (
                <TouchableOpacity
                    key={i}
                    style={[styles.vaccineRow, v.isDone && styles.vaccineRowDone]}
                    onPress={() => handleToggleCustom(v)}
                    onLongPress={() => onDeleteCustom(v)}
                >
                    <View style={[styles.checkbox, v.isDone && styles.checkboxDone]}>
                        {v.isDone && <Check size={12} color="white" />}
                    </View>
                    <Text style={styles.vaccineText}>{v.name} (אישי)</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
});

VaccineTracker.displayName = 'VaccineTracker';

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    disclaimer: {
        fontSize: 11,
        color: '#64748b',
        textAlign: 'right',
        marginBottom: 20,
    },
    vaccineGroup: {
        marginBottom: 20,
    },
    ageTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6366f1',
        textAlign: 'right',
        marginBottom: 8,
        backgroundColor: '#e0e7ff',
        alignSelf: 'flex-end',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    vaccineRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    vaccineRowDone: {
        opacity: 0.6,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxDone: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    vaccineText: {
        fontSize: 14,
        color: '#334155',
        flex: 1,
        textAlign: 'right',
    },
    vaccineTextDone: {
        textDecorationLine: 'line-through',
        color: '#94a3b8',
    },
    addBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f5f3ff',
        borderRadius: 8,
    },
    addText: {
        color: '#6366f1',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default VaccineTracker;

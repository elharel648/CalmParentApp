import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Weight, Ruler, Activity } from 'lucide-react-native';
import { GrowthStats } from '../../types/profile';

interface GrowthSectionProps {
    stats?: GrowthStats;
    onEditWeight: () => void;
    onEditHeight: () => void;
    onEditHead: () => void;
}

interface GrowthCardProps {
    icon: any;
    label: string;
    value?: string;
    unit: string;
    color: 'blue' | 'emerald' | 'purple';
    onEdit: () => void;
}

const COLORS: Record<string, [string, string]> = {
    blue: ['#3b82f6', '#1d4ed8'],
    emerald: ['#10b981', '#047857'],
    purple: ['#a855f7', '#7e22ce'],
};

const GrowthCard = memo(({ icon: Icon, label, value, unit, color, onEdit }: GrowthCardProps) => {
    return (
        <TouchableOpacity onPress={onEdit} style={styles.growthCard}>
            <View style={styles.growthHeader}>
                <LinearGradient colors={COLORS[color]} style={styles.iconBox}>
                    <Icon size={16} color="white" />
                </LinearGradient>
                <Text style={styles.growthLabel}>{label}</Text>
            </View>
            <View style={styles.growthContent}>
                <View style={styles.valueRow}>
                    <Text style={styles.growthValue}>
                        {value && value !== '0' ? value : '-'}
                    </Text>
                    <Text style={styles.growthUnit}>{unit}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

GrowthCard.displayName = 'GrowthCard';

const GrowthSection = memo(({ stats, onEditWeight, onEditHeight, onEditHead }: GrowthSectionProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionHeader}>מעקב גדילה</Text>
            <View style={styles.row}>
                <View style={styles.halfWidth}>
                    <GrowthCard
                        icon={Weight}
                        label="משקל"
                        value={stats?.weight}
                        unit="ק״ג"
                        color="blue"
                        onEdit={onEditWeight}
                    />
                </View>
                <View style={styles.halfWidth}>
                    <GrowthCard
                        icon={Ruler}
                        label="גובה"
                        value={stats?.height}
                        unit="ס״מ"
                        color="emerald"
                        onEdit={onEditHeight}
                    />
                </View>
            </View>
            <View style={styles.fullWidth}>
                <GrowthCard
                    icon={Activity}
                    label="היקף ראש"
                    value={stats?.headCircumference}
                    unit="ס״מ"
                    color="purple"
                    onEdit={onEditHead}
                />
            </View>
        </View>
    );
});

GrowthSection.displayName = 'GrowthSection';

const styles = StyleSheet.create({
    container: {
        marginBottom: 25,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 12,
        textAlign: 'right',
    },
    row: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    halfWidth: {
        flex: 1,
    },
    fullWidth: {
        marginTop: 10,
    },
    growthCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 1,
    },
    growthHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    growthLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
    },
    growthContent: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    valueRow: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-end',
        gap: 4,
    },
    growthValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
    },
    growthUnit: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 2,
    },
});

export default GrowthSection;

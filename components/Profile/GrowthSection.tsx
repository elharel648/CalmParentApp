import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Scale, Ruler, Activity } from 'lucide-react-native';
import { GrowthStats } from '../../types/profile';

interface GrowthSectionProps {
    stats?: GrowthStats;
    onEditWeight: () => void;
    onEditHeight: () => void;
    onEditHead: () => void;
}

interface MetricPillProps {
    icon: any;
    label: string;
    value?: string;
    unit: string;
    color: string;
    bgColor: string;
    onEdit: () => void;
}

const MetricPill = memo(({ icon: Icon, label, value, unit, color, bgColor, onEdit }: MetricPillProps) => {
    const displayValue = value && value !== '0' ? value : '-';

    return (
        <TouchableOpacity onPress={onEdit} activeOpacity={0.7} style={[styles.pill, { backgroundColor: bgColor }]}>
            <Icon size={16} color={color} strokeWidth={2.5} />
            <Text style={[styles.pillValue, { color }]}>{displayValue}</Text>
            <Text style={styles.pillUnit}>{unit}</Text>
        </TouchableOpacity>
    );
});

MetricPill.displayName = 'MetricPill';

const GrowthSection = memo(({ stats, onEditWeight, onEditHeight, onEditHead }: GrowthSectionProps) => {
    return (
        <View style={styles.container}>
            <MetricPill
                icon={Scale}
                label="משקל"
                value={stats?.weight}
                unit="ק״ג"
                color="#3B82F6"
                bgColor="#EFF6FF"
                onEdit={onEditWeight}
            />
            <MetricPill
                icon={Ruler}
                label="גובה"
                value={stats?.height}
                unit="ס״מ"
                color="#10B981"
                bgColor="#ECFDF5"
                onEdit={onEditHeight}
            />
            <MetricPill
                icon={Activity}
                label="היקף"
                value={stats?.headCircumference}
                unit="ס״מ"
                color="#8B5CF6"
                bgColor="#F5F3FF"
                onEdit={onEditHead}
            />
        </View>
    );
});

GrowthSection.displayName = 'GrowthSection';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    pill: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    pillValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    pillUnit: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF',
    },
});

export default GrowthSection;

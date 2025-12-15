import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Trash2, ChevronDown, ChevronUp, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Milestone } from '../../types/profile';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INITIAL_VISIBLE_COUNT = 3;

interface MilestoneTimelineProps {
    milestones?: Milestone[];
    birthDate?: any;
    onAdd: () => void;
    onDelete: (milestone: Milestone) => void;
}

interface MilestoneRowProps {
    title: string;
    date: string;
    ageAtEvent: string;
    onDelete: () => void;
}

const MilestoneRow = memo(({ title, date, ageAtEvent, onDelete }: MilestoneRowProps) => {
    return (
        <View style={styles.row}>
            <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{title}</Text>
                <View style={styles.rowMeta}>
                    <Text style={styles.rowDate}>{date}</Text>
                    {ageAtEvent ? (
                        <>
                            <Text style={styles.dot}>•</Text>
                            <Text style={styles.rowAge}>{ageAtEvent}</Text>
                        </>
                    ) : null}
                </View>
            </View>
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Trash2 size={14} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );
});

MilestoneRow.displayName = 'MilestoneRow';

const MilestoneTimeline = memo(({ milestones, birthDate, onAdd, onDelete }: MilestoneTimelineProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const calculateAgeAtEvent = (eventDate: Date, birth: any): string => {
        if (!birth) return '';
        const birthObj = new Date(birth.seconds * 1000);
        const months = Math.floor(
            (eventDate.getTime() - birthObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        if (months >= 0) {
            return months === 0 ? 'שבועות ראשונים' : `${months} חודשים`;
        }
        return '';
    };

    const toggleExpand = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    const totalCount = milestones?.length || 0;
    const hasMore = totalCount > INITIAL_VISIBLE_COUNT;
    const visibleMilestones = isExpanded
        ? milestones
        : milestones?.slice(0, INITIAL_VISIBLE_COUNT);
    const hiddenCount = totalCount - INITIAL_VISIBLE_COUNT;

    return (
        <View style={styles.container}>
            {visibleMilestones?.length ? (
                <View style={styles.list}>
                    {visibleMilestones.map((m, i) => {
                        const eventDate = new Date(m.date.seconds * 1000);
                        return (
                            <MilestoneRow
                                key={i}
                                title={m.title}
                                date={eventDate.toLocaleDateString('he-IL')}
                                ageAtEvent={calculateAgeAtEvent(eventDate, birthDate)}
                                onDelete={() => onDelete(m)}
                            />
                        );
                    })}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Star size={24} color="#D1D5DB" />
                    <Text style={styles.emptyText}>עוד לא נרשמו אבני דרך</Text>
                </View>
            )}

            {hasMore && (
                <TouchableOpacity style={styles.expandBtn} onPress={toggleExpand} activeOpacity={0.7}>
                    {isExpanded ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
                    <Text style={styles.expandText}>{isExpanded ? 'הסתר' : `עוד ${hiddenCount}`}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

MilestoneTimeline.displayName = 'MilestoneTimeline';

const styles = StyleSheet.create({
    container: {},
    list: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    rowContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    rowMeta: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    rowDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    dot: {
        fontSize: 12,
        color: '#D1D5DB',
    },
    rowAge: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '500',
    },
    deleteBtn: {
        padding: 8,
    },
    emptyState: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    expandBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        marginTop: 8,
    },
    expandText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
    },
});

export default MilestoneTimeline;

import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, LayoutAnimation, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Plus, Trash2, Smile, Activity, MessageCircle, Gift, Crown, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Milestone, MilestoneConfig } from '../../types/profile';

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

// Helper to get icon config based on milestone title
const getMilestoneConfig = (title: string): MilestoneConfig => {
    const t = title.toLowerCase();
    if (t.includes('שן') || t.includes('tooth')) {
        return { icon: Smile, color: ['#fbbf24', '#d97706'], bg: '#fef3c7' };
    }
    if (t.includes('הליכה') || t.includes('צעד') || t.includes('walk')) {
        return { icon: Activity, color: ['#10b981', '#059669'], bg: '#d1fae5' };
    }
    if (t.includes('מילה') || t.includes('אבא') || t.includes('אמא')) {
        return { icon: MessageCircle, color: ['#3b82f6', '#2563eb'], bg: '#dbeafe' };
    }
    if (t.includes('יום הולדת') || t.includes('שנה')) {
        return { icon: Gift, color: ['#ec4899', '#db2777'], bg: '#fce7f3' };
    }
    if (t.includes('זחילה') || t.includes('התהפך')) {
        return { icon: Crown, color: ['#8b5cf6', '#7c3aed'], bg: '#ede9fe' };
    }
    return { icon: Star, color: ['#6366f1', '#4f46e5'], bg: '#e0e7ff' };
};

interface TimelineItemProps {
    title: string;
    date: string;
    ageAtEvent: string;
    config: MilestoneConfig;
    isLast: boolean;
    onDelete: () => void;
}

const TimelineItem = memo(({ title, date, ageAtEvent, config, isLast, onDelete }: TimelineItemProps) => {
    const Icon = config.icon;

    return (
        <View style={styles.timelineItem}>
            {/* Left side - timeline */}
            <View style={styles.timelineLeft}>
                <LinearGradient colors={config.color} style={styles.iconBubble}>
                    <Icon size={16} color="white" />
                </LinearGradient>
                {!isLast && <View style={[styles.line, { backgroundColor: config.bg }]} />}
            </View>

            {/* Right side - card */}
            <View style={[styles.card, { borderRightColor: config.color[0] }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.milestoneTitle}>{title}</Text>
                    {ageAtEvent ? (
                        <Text style={styles.ageBadge}>{ageAtEvent}</Text>
                    ) : null}
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>{date}</Text>
                    <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
                        <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

TimelineItem.displayName = 'TimelineItem';

const MilestoneTimeline = memo(({ milestones, birthDate, onAdd, onDelete }: MilestoneTimelineProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const calculateAgeAtEvent = (eventDate: Date, birth: any): string => {
        if (!birth) return '';
        const birthObj = new Date(birth.seconds * 1000);
        const months = Math.floor(
            (eventDate.getTime() - birthObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        if (months >= 0) {
            return months === 0 ? 'שבועות ראשונים' : `גיל ${months} חודשים`;
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
            <View style={styles.headerRow}>
                <Text style={styles.sectionHeader}>⭐ אבני דרך</Text>
                <TouchableOpacity onPress={onAdd}>
                    <Plus size={24} color="#6366f1" />
                </TouchableOpacity>
            </View>

            <View style={styles.timelineContainer}>
                {visibleMilestones?.length ? (
                    visibleMilestones.map((m, i) => {
                        const eventDate = new Date(m.date.seconds * 1000);
                        const config = getMilestoneConfig(m.title);
                        const isActuallyLast = isExpanded
                            ? i === milestones!.length - 1
                            : i === visibleMilestones.length - 1;

                        return (
                            <TimelineItem
                                key={i}
                                title={m.title}
                                date={eventDate.toLocaleDateString('he-IL')}
                                ageAtEvent={calculateAgeAtEvent(eventDate, birthDate)}
                                config={config}
                                isLast={isActuallyLast && !hasMore}
                                onDelete={() => onDelete(m)}
                            />
                        );
                    })
                ) : (
                    <Text style={styles.emptyText}>הוסיפו את הרגע המיוחד הראשון!</Text>
                )}

                {/* Expand/Collapse Button */}
                {hasMore && (
                    <TouchableOpacity
                        style={styles.expandBtn}
                        onPress={toggleExpand}
                        activeOpacity={0.7}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={18} color="#6366f1" />
                                <Text style={styles.expandText}>הסתר</Text>
                            </>
                        ) : (
                            <>
                                <ChevronDown size={18} color="#6366f1" />
                                <Text style={styles.expandText}>הצג עוד {hiddenCount} רגעים</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

MilestoneTimeline.displayName = 'MilestoneTimeline';

const styles = StyleSheet.create({
    container: {
        marginBottom: 25,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    timelineContainer: {
        paddingRight: 10,
    },
    timelineItem: {
        flexDirection: 'row-reverse',
        minHeight: 80,
        marginBottom: 5,
    },
    timelineLeft: {
        width: 40,
        alignItems: 'center',
        marginRight: 5,
    },
    iconBubble: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    line: {
        width: 2,
        flex: 1,
        marginTop: -5,
        marginBottom: -5,
        borderRadius: 2,
    },
    card: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        marginRight: 10,
        borderRightWidth: 4,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    milestoneTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    ageBadge: {
        fontSize: 11,
        color: '#6366f1',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    deleteBtn: {
        padding: 5,
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: 10,
    },
    expandBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#f5f3ff',
        borderRadius: 12,
        marginTop: 5,
    },
    expandText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
});

export default MilestoneTimeline;

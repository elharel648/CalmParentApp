import React, { memo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Dimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, GripVertical, Eye, EyeOff, RotateCcw, Utensils, Moon, Droplets, Music, Heart, Pill, Plus, HeartPulse, TrendingUp, Award, Sparkles, LayoutGrid, Lightbulb } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom Tooth Icon
const TeethIcon = ({ size, color }: { size: number; color: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7.5 22C6.5 22 5.5 21 5.5 19C5.5 15.5 5 12 5 10C5 5.5 8 2 12 2C16 2 19 5.5 19 10C19 12 18.5 15.5 18.5 19C18.5 21 17.5 22 16.5 22C15.5 22 14.5 20.5 14.5 20.5L12 18L9.5 20.5C9.5 20.5 8.5 22 7.5 22Z" />
    </Svg>
);

// Icons map
const ICONS: Record<QuickActionKey, any> = {
    food: Utensils,
    sleep: Moon,
    diaper: Droplets,
    supplements: Pill,
    whiteNoise: Music,
    sos: Heart,
    health: HeartPulse,
    growth: TrendingUp,
    milestones: Award,
    magicMoments: Sparkles,
    tools: LayoutGrid,
    teeth: TeethIcon,
    nightLight: Lightbulb,
    custom: Plus,
};

// Labels and colors
const ACTION_DATA: Record<QuickActionKey, { label: string; color: string }> = {
    food: { label: 'אוכל', color: '#F59E0B' },
    sleep: { label: 'שינה', color: '#6366F1' },
    diaper: { label: 'החתלה', color: '#10B981' },
    supplements: { label: 'תוספים', color: '#0EA5E9' },
    whiteNoise: { label: 'רעש לבן', color: '#8B5CF6' },
    sos: { label: 'SOS', color: '#EF4444' },
    health: { label: 'בריאות', color: '#14B8A6' },
    growth: { label: 'מעקב גדילה', color: '#10B981' },
    milestones: { label: 'אבני דרך', color: '#F59E0B' },
    magicMoments: { label: 'רגעים קסומים', color: '#A78BFA' },
    tools: { label: 'כלים', color: '#8B5CF6' },
    teeth: { label: 'שיניים', color: '#EC4899' },
    nightLight: { label: 'פנס לילה', color: '#F59E0B' },
    custom: { label: 'הוספה', color: '#6B7280' },
};

interface QuickActionsEditModalProps {
    visible: boolean;
    onClose: () => void;
}

interface DraggableItem {
    key: QuickActionKey;
    isHidden: boolean;
}

const QuickActionsEditModal: React.FC<QuickActionsEditModalProps> = memo(({ visible, onClose }) => {
    const { actionOrder, hiddenActions, toggleActionVisibility, resetToDefault, isProtected, setActionOrder } = useQuickActions();
    const [localOrder, setLocalOrder] = useState<DraggableItem[]>([]);

    // Sync local state with context
    useEffect(() => {
        if (visible) {
            setLocalOrder(actionOrder.map(key => ({
                key,
                isHidden: hiddenActions.includes(key),
            })));
        }
    }, [visible, actionOrder, hiddenActions]);

    const handleDragEnd = useCallback(({ data }: { data: DraggableItem[] }) => {
        setLocalOrder(data);
        // Save new order to context immediately
        setActionOrder(data.map(item => item.key));
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [setActionOrder]);

    const handleToggleVisibility = useCallback((key: QuickActionKey) => {
        if (isProtected(key)) return;
        toggleActionVisibility(key);
        setLocalOrder(prev => prev.map(item =>
            item.key === key ? { ...item, isHidden: !item.isHidden } : item
        ));
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [toggleActionVisibility, isProtected]);

    const handleReset = useCallback(() => {
        resetToDefault();
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [resetToDefault]);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<DraggableItem>) => {
        const Icon = ICONS[item.key];
        const data = ACTION_DATA[item.key];
        const isItemProtected = isProtected(item.key);

        return (
            <ScaleDecorator>
                <TouchableOpacity
                    style={[
                        styles.itemContainer,
                        isActive && styles.itemActive,
                        item.isHidden && styles.itemHidden,
                    ]}
                    onLongPress={drag}
                    delayLongPress={100}
                    activeOpacity={0.7}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle}>
                        <GripVertical size={20} color={isActive ? '#6366F1' : '#9CA3AF'} />
                    </View>

                    {/* Icon */}
                    <View style={[styles.iconCircle, { backgroundColor: data.color + '20' }]}>
                        <Icon size={20} color={data.color} />
                    </View>

                    {/* Label */}
                    <Text style={[styles.itemLabel, item.isHidden && styles.itemLabelHidden]}>
                        {data.label}
                    </Text>

                    {/* Visibility Toggle */}
                    {!isItemProtected && (
                        <TouchableOpacity
                            style={[styles.visibilityBtn, item.isHidden && styles.visibilityBtnHidden]}
                            onPress={() => handleToggleVisibility(item.key)}
                        >
                            {item.isHidden ? (
                                <EyeOff size={18} color="#EF4444" />
                            ) : (
                                <Eye size={18} color="#10B981" />
                            )}
                        </TouchableOpacity>
                    )}

                    {isItemProtected && (
                        <View style={styles.protectedBadge}>
                            <Text style={styles.protectedText}>חובה</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }, [isProtected, handleToggleVisibility]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={22} color="#374151" />
                        </TouchableOpacity>
                        <Text style={styles.title}>עריכת פעולות מהירות</Text>
                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                            <RotateCcw size={18} color="#6366F1" />
                        </TouchableOpacity>
                    </View>

                    {/* Instructions */}
                    <View style={styles.instructionsRow}>
                        <Text style={styles.instructionsText}>כדי להסתיר </Text>
                        <Eye size={14} color="#10B981" style={{ marginHorizontal: 4 }} />
                        <Text style={styles.instructionsText}> לחץ על</Text>
                        <Text style={styles.instructionsText}>  גרור כדי לשנות סדר</Text>
                    </View>

                    {/* Draggable List */}
                    <GestureHandlerRootView style={styles.listContainer}>
                        <DraggableFlatList
                            data={localOrder}
                            keyExtractor={(item) => item.key}
                            renderItem={renderItem}
                            onDragEnd={handleDragEnd}
                            containerStyle={styles.flatList}
                        />
                    </GestureHandlerRootView>

                    {/* Save Button */}
                    <TouchableOpacity style={styles.saveBtn} onPress={onClose}>
                        <Text style={styles.saveBtnText}>סיום</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

QuickActionsEditModal.displayName = 'QuickActionsEditModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: SCREEN_HEIGHT * 0.65,
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    instructionsText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    listContainer: {
        flex: 1,
        minHeight: SCREEN_HEIGHT * 0.4,
        paddingHorizontal: 16,
    },
    flatList: {
        paddingVertical: 8,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    itemActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    itemHidden: {
        opacity: 0.5,
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
    },
    dragHandle: {
        padding: 4,
        marginRight: 8,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
        textAlign: 'right',
    },
    itemLabelHidden: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    visibilityBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    visibilityBtnHidden: {
        backgroundColor: '#FEE2E2',
    },
    protectedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#E0E7FF',
        borderRadius: 8,
        marginLeft: 8,
    },
    protectedText: {
        fontSize: 11,
        color: '#4338CA',
        fontWeight: '600',
    },
    saveBtn: {
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default QuickActionsEditModal;

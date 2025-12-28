import React, { memo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Dimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, GripVertical, RotateCcw, Utensils, Moon, Droplets, Pill } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Stats keys
export type StatKey = 'food' | 'sleep' | 'diapers' | 'supplements';

export const DEFAULT_STATS_ORDER: StatKey[] = ['food', 'sleep', 'diapers', 'supplements'];
export const STATS_ORDER_KEY = '@stats_order';

const ICONS: Record<StatKey, any> = {
    food: Utensils,
    sleep: Moon,
    diapers: Droplets,
    supplements: Pill,
};

const STAT_LABELS: Record<StatKey, { label: string; color: string }> = {
    food: { label: 'האכלות', color: '#F59E0B' },
    sleep: { label: 'שינה', color: '#6366F1' },
    diapers: { label: 'חיתולים', color: '#10B981' },
    supplements: { label: 'תוספים', color: '#EC4899' },
};

interface StatsEditModalProps {
    visible: boolean;
    onClose: () => void;
    currentOrder: StatKey[];
    onOrderChange: (newOrder: StatKey[]) => void;
}

interface DraggableItem {
    key: StatKey;
}

const StatsEditModal: React.FC<StatsEditModalProps> = memo(({ visible, onClose, currentOrder, onOrderChange }) => {
    const { theme } = useTheme();
    const [localOrder, setLocalOrder] = useState<DraggableItem[]>([]);

    useEffect(() => {
        if (visible) {
            setLocalOrder(currentOrder.map(key => ({ key })));
        }
    }, [visible, currentOrder]);

    const handleDragEnd = useCallback(async ({ data }: { data: DraggableItem[] }) => {
        setLocalOrder(data);
        const newOrder = data.map(item => item.key);
        onOrderChange(newOrder);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        try {
            await AsyncStorage.setItem(STATS_ORDER_KEY, JSON.stringify(newOrder));
        } catch (e) {
            console.error('Failed to save stats order', e);
        }
    }, [onOrderChange]);

    const handleReset = useCallback(async () => {
        const defaultItems = DEFAULT_STATS_ORDER.map(key => ({ key }));
        setLocalOrder(defaultItems);
        onOrderChange(DEFAULT_STATS_ORDER);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            await AsyncStorage.setItem(STATS_ORDER_KEY, JSON.stringify(DEFAULT_STATS_ORDER));
        } catch (e) {
            console.error('Failed to reset stats order', e);
        }
    }, [onOrderChange]);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<DraggableItem>) => {
        const Icon = ICONS[item.key];
        const data = STAT_LABELS[item.key];

        return (
            <ScaleDecorator>
                <TouchableOpacity
                    style={[
                        styles.itemContainer,
                        { borderColor: theme.border, backgroundColor: theme.cardSecondary },
                        isActive && styles.itemActive,
                    ]}
                    onLongPress={drag}
                    delayLongPress={100}
                    activeOpacity={0.7}
                >
                    <View style={styles.dragHandle}>
                        <GripVertical size={20} color={isActive ? '#6366F1' : '#9CA3AF'} />
                    </View>

                    <View style={[styles.iconCircle, { backgroundColor: data.color + '20' }]}>
                        <Icon size={20} color={data.color} />
                    </View>

                    <Text style={[styles.itemLabel, { color: theme.textPrimary }]}>
                        {data.label}
                    </Text>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }, [theme]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                    <View style={[styles.header, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]} onPress={onClose}>
                            <X size={22} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>סדר כרטיסיות</Text>
                        <TouchableOpacity style={[styles.resetBtn, { backgroundColor: theme.cardSecondary }]} onPress={handleReset}>
                            <RotateCcw size={18} color="#6366F1" />
                        </TouchableOpacity>
                    </View>

                    <GestureHandlerRootView style={styles.listContainer}>
                        <DraggableFlatList
                            data={localOrder}
                            keyExtractor={(item) => item.key}
                            renderItem={renderItem}
                            onDragEnd={handleDragEnd}
                            containerStyle={styles.flatList}
                        />
                    </GestureHandlerRootView>

                    <TouchableOpacity style={styles.saveBtn} onPress={onClose}>
                        <Text style={styles.saveBtnText}>סיום</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

StatsEditModal.displayName = 'StatsEditModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: SCREEN_HEIGHT * 0.5,
        maxHeight: SCREEN_HEIGHT * 0.7,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    flatList: {
        paddingVertical: 8,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
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
        textAlign: 'right',
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

export default StatsEditModal;

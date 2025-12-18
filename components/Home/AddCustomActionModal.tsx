import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { X, Sparkles, Baby, Bath, Stethoscope, Pill, Thermometer, Camera, Book, Music, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

interface AddCustomActionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (action: CustomAction) => void;
}

export interface CustomAction {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: string;
}

const PRESET_ICONS = [
    { key: 'sparkles', icon: Sparkles, color: '#F59E0B' },
    { key: 'baby', icon: Baby, color: '#EC4899' },
    { key: 'bath', icon: Bath, color: '#06B6D4' },
    { key: 'stethoscope', icon: Stethoscope, color: '#10B981' },
    { key: 'pill', icon: Pill, color: '#8B5CF6' },
    { key: 'thermometer', icon: Thermometer, color: '#EF4444' },
    { key: 'camera', icon: Camera, color: '#6366F1' },
    { key: 'book', icon: Book, color: '#14B8A6' },
    { key: 'music', icon: Music, color: '#A855F7' },
    { key: 'star', icon: Star, color: '#FBBF24' },
];

const AddCustomActionModal = memo<AddCustomActionModalProps>(({ visible, onClose, onAdd }) => {
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

    const handleAdd = () => {
        if (!name.trim() || !selectedIcon) return;

        const iconConfig = PRESET_ICONS.find(i => i.key === selectedIcon);

        const newAction: CustomAction = {
            id: Date.now().toString(),
            name: name.trim(),
            icon: selectedIcon,
            color: iconConfig?.color || '#6B7280',
            createdAt: new Date().toISOString(),
        };

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        onAdd(newAction);
        setName('');
        setSelectedIcon(null);
        onClose();
    };

    const handleClose = () => {
        setName('');
        setSelectedIcon(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>הוספת פעולה</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    {/* Name Input */}
                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>שם הפעולה</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.textPrimary }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="למשל: אמבטיה, משחק..."
                            placeholderTextColor={theme.textSecondary}
                            textAlign="right"
                        />
                    </View>

                    {/* Icon Selection */}
                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>בחר אייקון</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.iconsRow}>
                                {PRESET_ICONS.map(({ key, icon: Icon, color }) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.iconOption,
                                            { backgroundColor: color + '20' },
                                            selectedIcon === key && { borderColor: color, borderWidth: 2 }
                                        ]}
                                        onPress={() => {
                                            setSelectedIcon(key);
                                            if (Platform.OS !== 'web') {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}
                                    >
                                        <Icon size={20} color={color} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Add Button */}
                    <TouchableOpacity
                        style={[
                            styles.addButton,
                            (!name.trim() || !selectedIcon) && styles.addButtonDisabled
                        ]}
                        onPress={handleAdd}
                        disabled={!name.trim() || !selectedIcon}
                    >
                        <Text style={styles.addButtonText}>הוסף פעולה</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

AddCustomActionModal.displayName = 'AddCustomActionModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    inputSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'right',
    },
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
    },
    iconsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    addButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default AddCustomActionModal;

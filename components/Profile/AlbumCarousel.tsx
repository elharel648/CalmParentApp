import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal, Platform } from 'react-native';
import { Plus, Camera, X, Check, Edit2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface AlbumPhoto {
    url: string;
    note?: string;
}

interface AlbumCarouselProps {
    album?: { [month: number]: string };
    albumNotes?: { [month: number]: string };
    onMonthPress: (month: number) => void;
    onAddCustomPhoto?: (month: number) => void;
    onNoteUpdate?: (month: number, note: string) => void;
}

const AlbumCarousel = memo(({ album, albumNotes, onMonthPress, onAddCustomPhoto, onNoteUpdate }: AlbumCarouselProps) => {
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);

    const getPhotoData = (month: number): { url?: string; note?: string } => {
        const url = album?.[month];
        const note = albumNotes?.[month];
        return { url, note };
    };

    const handleEditNote = (month: number) => {
        const { note } = getPhotoData(month);
        setNoteText(note || '');
        setEditingMonth(month);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSaveNote = () => {
        if (editingMonth && onNoteUpdate) {
            onNoteUpdate(editingMonth, noteText);
        }
        setEditingMonth(null);
        setNoteText('');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Get all months that should be shown (1-12 + any with photos above 12)
    const getVisibleMonths = (): number[] => {
        const baseMonths = Array.from({ length: 12 }, (_, i) => i + 1);
        const extraMonths: number[] = [];

        // Check for months 13-36 that have photos
        if (album) {
            for (let m = 13; m <= 36; m++) {
                if (album[m]) extraMonths.push(m);
            }
        }

        return [...baseMonths, ...extraMonths];
    };

    const visibleMonths = getVisibleMonths();

    return (
        <>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {visibleMonths.map((month) => {
                    const { url, note } = getPhotoData(month);
                    const hasImage = !!url;

                    return (
                        <View key={month} style={styles.monthItem}>
                            <TouchableOpacity
                                style={styles.monthTouchable}
                                onPress={() => onMonthPress(month)}
                                activeOpacity={0.8}
                            >
                                {hasImage ? (
                                    <Image source={{ uri: url }} style={styles.monthImage} />
                                ) : (
                                    <View style={styles.emptyMonth}>
                                        <Plus size={18} color="#D1D5DB" strokeWidth={2} />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text style={[styles.monthLabel, hasImage && styles.monthLabelActive]}>
                                {month}
                            </Text>

                            {/* Note display - shows note text or edit button */}
                            {hasImage && (
                                <TouchableOpacity
                                    style={[styles.noteBtn, note && styles.noteBtnWithNote]}
                                    onPress={() => handleEditNote(month)}
                                >
                                    {note ? (
                                        <Text style={styles.noteText} numberOfLines={1}>
                                            {note.length > 8 ? note.substring(0, 8) + '...' : note}
                                        </Text>
                                    ) : (
                                        <Edit2 size={10} color="#9CA3AF" />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}

                {/* Add custom photo button at the end */}
                {onAddCustomPhoto && (
                    <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMonthPickerOpen(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.addCustomCircle}>
                            <Plus size={20} color="#6366F1" strokeWidth={2.5} />
                        </View>
                        <Text style={styles.addCustomLabel}>הוסף</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Month Picker Modal (13-36) */}
            <Modal
                visible={monthPickerOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setMonthPickerOpen(false)}
            >
                <View style={styles.noteModalOverlay}>
                    <View style={styles.monthPickerContent}>
                        <View style={styles.noteModalHeader}>
                            <TouchableOpacity onPress={() => setMonthPickerOpen(false)}>
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                            <Text style={styles.monthPickerTitle}>בחר חודש</Text>
                            <View style={{ width: 20 }} />
                        </View>
                        <Text style={styles.monthPickerSubtitle}>גלול ובחר חודש (13-36)</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.monthPickerScroll}
                        >
                            {Array.from({ length: 24 }, (_, i) => i + 13).map(month => (
                                <TouchableOpacity
                                    key={month}
                                    style={styles.monthPickerItem}
                                    onPress={() => {
                                        setMonthPickerOpen(false);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onAddCustomPhoto?.(month);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.monthPickerCircle}>
                                        <Text style={styles.monthPickerNumber}>{month}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Note Edit Modal */}
            <Modal
                visible={editingMonth !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setEditingMonth(null)}
            >
                <View style={styles.noteModalOverlay}>
                    <View style={styles.noteModalContent}>
                        <View style={styles.noteModalHeader}>
                            <TouchableOpacity onPress={() => setEditingMonth(null)}>
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                            <Text style={styles.noteModalTitle}>הערה לחודש {editingMonth}</Text>
                            <TouchableOpacity onPress={handleSaveNote}>
                                <Check size={20} color="#10B981" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="הוסף הערה או תיאור לתמונה..."
                            placeholderTextColor="#9CA3AF"
                            value={noteText}
                            onChangeText={setNoteText}
                            multiline
                            maxLength={200}
                            autoFocus
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
});

AlbumCarousel.displayName = 'AlbumCarousel';

const styles = StyleSheet.create({
    scrollContent: {
        gap: 12,
        paddingVertical: 4,
        paddingRight: 8,
    },
    monthItem: {
        alignItems: 'center',
        gap: 4,
    },
    monthTouchable: {
        // wrapper for image/empty
    },
    monthImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3F4F6',
    },
    emptyMonth: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    monthLabelActive: {
        color: '#6366F1',
    },
    noteBtn: {
        padding: 2,
        minWidth: 40,
        alignItems: 'center',
    },
    noteBtnWithNote: {
        backgroundColor: '#EEF2FF',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    noteText: {
        fontSize: 9,
        color: '#6366F1',
        fontWeight: '500',
    },
    addCustomBtn: {
        alignItems: 'center',
        gap: 4,
        marginLeft: 4,
    },
    addCustomCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EEF2FF',
        borderWidth: 2,
        borderColor: '#6366F1',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addCustomLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6366F1',
    },
    noteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    noteModalContent: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
    },
    noteModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    noteModalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    noteInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        minHeight: 80,
        fontSize: 14,
        color: '#1F2937',
        textAlign: 'right',
        textAlignVertical: 'top',
    },
    monthPickerContent: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
    },
    monthPickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    monthPickerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    monthPickerScroll: {
        gap: 10,
        paddingVertical: 8,
    },
    monthPickerItem: {
        alignItems: 'center',
    },
    monthPickerCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EEF2FF',
        borderWidth: 2,
        borderColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthPickerNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6366F1',
    },
});

export default AlbumCarousel;

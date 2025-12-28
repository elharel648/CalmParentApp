import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import { X, CheckCircle, Baby, Heart, Thermometer, Hand, BedDouble, Ear, Sparkles, ListChecks } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ChecklistModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ChecklistModal({ visible, onClose }: ChecklistModalProps) {
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

    // Animations
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setCheckedItems(new Set());

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 200,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(400);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const toggleCheckItem = (index: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setCheckedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const checklistItems = [
        { text: "האם החיתול נקי?", Icon: Baby },
        { text: "האם עברו פחות מ-3 שעות מהאוכל?", Icon: Heart },
        { text: "האם חם/קר לו מדי? (בדיקה בעורף)", Icon: Thermometer },
        { text: "האם יש שערה כרוכה באצבעות?", Icon: Hand },
        { text: "האם הוא פשוט עייף מדי?", Icon: BedDouble },
        { text: "האם כואב לו משהו? (אוזניים/שיניים)", Icon: Ear },
    ];

    const progress = checkedItems.size / checklistItems.length;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={20} color="#6B7280" strokeWidth={2} />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.mainTitle}>צ'קליסט הרגעה</Text>
                            <ListChecks size={20} color="#1F2937" strokeWidth={2} />
                        </View>

                        <View style={{ width: 36 }} />
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Progress - Minimal */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{checkedItems.size}/{checklistItems.length}</Text>
                        </View>

                        {/* Checklist - Ultra Clean */}
                        {checklistItems.map((item, index) => {
                            const isChecked = checkedItems.has(index);
                            const { Icon } = item;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.checkItem, isChecked && styles.checkItemChecked]}
                                    onPress={() => toggleCheckItem(index)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.checkCircle, isChecked && styles.checkCircleChecked]}>
                                        {isChecked && <CheckCircle size={16} color="#fff" />}
                                    </View>
                                    <View style={styles.checkIconWrapper}>
                                        <Icon size={18} color={isChecked ? '#9CA3AF' : '#6B7280'} strokeWidth={1.5} />
                                    </View>
                                    <Text style={[styles.checkText, isChecked && styles.checkTextDone]}>
                                        {item.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        {/* All Checked - Subtle */}
                        {checkedItems.size === checklistItems.length && (
                            <View style={styles.allCheckedCard}>
                                <Sparkles size={24} color="#6B7280" strokeWidth={1.5} />
                                <Text style={styles.allCheckedTitle}>בדקת הכל</Text>
                                <Text style={styles.allCheckedText}>
                                    לפעמים תינוקות פשוט צריכים לבכות.{'\n'}נשום עמוק, אתה הורה מדהים.
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: '60%',
    },

    // Header - Minimal
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
        letterSpacing: -0.3,
    },

    // Content
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 50,
    },

    // Progress - Minimal
    progressContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1F2937',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#9CA3AF',
    },

    // Checklist - Ultra Clean
    checkItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    checkItemChecked: {
        opacity: 0.5,
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleChecked: {
        backgroundColor: '#1F2937',
        borderColor: '#1F2937',
    },
    checkIconWrapper: {
        width: 28,
        alignItems: 'center',
    },
    checkText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        textAlign: 'right',
    },
    checkTextDone: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },

    // All Checked - Subtle
    allCheckedCard: {
        backgroundColor: '#F9FAFB',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    allCheckedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 12,
    },
    allCheckedText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
    },
});

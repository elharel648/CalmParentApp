import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Modal, Pressable } from 'react-native';
import { Plus, ChevronDown, Check, X } from 'lucide-react-native';
import { useActiveChild, ActiveChild } from '../../context/ActiveChildContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ChildPickerProps {
    onChildSelect?: (child: ActiveChild) => void;
    onAddChild?: () => void;
    onJoinWithCode?: () => void; // For joining with family code
    compact?: boolean; // New prop for header-style dropdown
}

const ChildPicker: React.FC<ChildPickerProps> = ({ onChildSelect, onAddChild, onJoinWithCode, compact = false }) => {
    const { theme } = useTheme();
    const { allChildren, activeChild, setActiveChild } = useActiveChild();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Don't show if no children at all
    if (allChildren.length === 0) {
        return null;
    }

    const handleSelect = (child: ActiveChild) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveChild(child);
        onChildSelect?.(child);
        setDropdownOpen(false);
    };

    const handleAddChild = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setDropdownOpen(false);
        onAddChild?.();
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2);
    };

    // Compact mode - Single avatar with dropdown
    if (compact) {
        return (
            <>
                {/* Active Child Avatar - Clickable to open dropdown */}
                <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDropdownOpen(true);
                    }}
                    activeOpacity={0.8}
                >
                    {/* Avatar */}
                    <View style={[styles.triggerAvatar, { borderColor: theme.primary }]}>
                        {activeChild?.photoUrl ? (
                            <Image source={{ uri: activeChild.photoUrl }} style={styles.triggerAvatarImage} />
                        ) : (
                            <View style={[styles.triggerAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                                <Text style={styles.triggerInitials}>
                                    {activeChild ? getInitials(activeChild.childName) : '?'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Name + Chevron */}
                    <View style={styles.triggerTextSection}>
                        <Text style={[styles.triggerName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {activeChild?.childName || 'בחר ילד'}
                        </Text>
                        <ChevronDown size={14} color={theme.textSecondary} />
                    </View>

                    {/* Children count badge */}
                    {allChildren.length > 1 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{allChildren.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Dropdown Modal - Premium Design */}
                <Modal
                    visible={dropdownOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setDropdownOpen(false)}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setDropdownOpen(false)}
                    >
                        <Pressable
                            style={[styles.dropdownMenu, { backgroundColor: theme.card }]}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {/* Header with close button */}
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setDropdownOpen(false)}
                                    activeOpacity={0.7}
                                >
                                    <X size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                                <Text style={[styles.dropdownTitle, { color: theme.textPrimary }]}>
                                    החלפת ילד
                                </Text>
                                <View style={styles.closeButton} />
                            </View>

                            {/* Divider */}
                            <View style={styles.divider} />

                            <ScrollView style={styles.childrenList} showsVerticalScrollIndicator={false}>
                                {allChildren.map((child) => {
                                    const isActive = activeChild?.childId === child.childId;
                                    const isGuest = child.role === 'guest';

                                    return (
                                        <TouchableOpacity
                                            key={child.childId}
                                            style={[
                                                styles.childRow,
                                                isActive && styles.childRowActive
                                            ]}
                                            onPress={() => handleSelect(child)}
                                            activeOpacity={0.7}
                                        >
                                            {/* Avatar with gradient border for active */}
                                            <View style={[
                                                styles.rowAvatarWrapper,
                                                isActive && styles.rowAvatarWrapperActive
                                            ]}>
                                                {child.photoUrl ? (
                                                    <Image source={{ uri: child.photoUrl }} style={styles.rowAvatar} />
                                                ) : (
                                                    <View style={[
                                                        styles.rowAvatarPlaceholder,
                                                        { backgroundColor: isActive ? theme.primary : '#E5E7EB' }
                                                    ]}>
                                                        <Text style={[
                                                            styles.rowInitials,
                                                            { color: isActive ? '#fff' : theme.textPrimary }
                                                        ]}>
                                                            {getInitials(child.childName)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Name + Badge */}
                                            <View style={styles.rowTextSection}>
                                                <Text style={[
                                                    styles.rowName,
                                                    { color: theme.textPrimary },
                                                    isActive && styles.rowNameActive
                                                ]}>
                                                    {child.childName}
                                                </Text>
                                                {isGuest && (
                                                    <View style={styles.guestTag}>
                                                        <Text style={styles.guestTagText}>אורח</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Checkmark for active */}
                                            {isActive && (
                                                <View style={styles.checkCircle}>
                                                    <Check size={14} color="#fff" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Divider */}
                            <View style={styles.divider} />

                            {/* Add Child Options */}
                            {onAddChild && (
                                <View style={styles.addOptionsSection}>
                                    <Text style={styles.addSectionTitle}>הוספת ילד</Text>

                                    {/* Register new child */}
                                    <TouchableOpacity
                                        style={styles.addOptionRow}
                                        onPress={handleAddChild}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.addOptionIcon, { backgroundColor: '#E0E7FF' }]}>
                                            <Plus size={18} color="#6366F1" />
                                        </View>
                                        <View style={styles.addOptionText}>
                                            <Text style={styles.addOptionTitle}>רישום ילד חדש</Text>
                                            <Text style={styles.addOptionSubtitle}>צור פרופיל חדש לילד</Text>
                                        </View>
                                        <ChevronDown size={16} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
                                    </TouchableOpacity>

                                    {/* Join with code */}
                                    <TouchableOpacity
                                        style={styles.addOptionRow}
                                        onPress={() => {
                                            setDropdownOpen(false);
                                            onJoinWithCode?.();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.addOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                                            <Text style={{ fontSize: 16 }}>🔗</Text>
                                        </View>
                                        <View style={styles.addOptionText}>
                                            <Text style={styles.addOptionTitle}>הצטרפות עם קוד</Text>
                                            <Text style={styles.addOptionSubtitle}>קיבלת קוד מהשותף?</Text>
                                        </View>
                                        <ChevronDown size={16} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Pressable>
                    </Pressable>
                </Modal>
            </>
        );
    }

    // Full mode - squares with names (original design)
    return (
        <View style={styles.container}>
            <View style={styles.scrollContent}>
                {allChildren.map((child) => {
                    const isActive = activeChild?.childId === child.childId;
                    const isGuest = child.role === 'guest';

                    return (
                        <TouchableOpacity
                            key={child.childId}
                            style={[
                                styles.childCircle,
                                {
                                    backgroundColor: isActive ? theme.primary : theme.card,
                                    borderColor: isActive ? theme.primary : theme.border,
                                },
                            ]}
                            onPress={() => handleSelect(child)}
                            activeOpacity={0.8}
                        >
                            {child.photoUrl ? (
                                <Image source={{ uri: child.photoUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[
                                    styles.avatarPlaceholder,
                                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : theme.background }
                                ]}>
                                    <Text style={[
                                        styles.initials,
                                        { color: isActive ? '#fff' : theme.textPrimary }
                                    ]}>
                                        {getInitials(child.childName)}
                                    </Text>
                                </View>
                            )}

                            {isGuest && (
                                <View style={styles.guestBadge}>
                                    <Text style={styles.guestBadgeText}>אורח</Text>
                                </View>
                            )}

                            <Text
                                style={[
                                    styles.childName,
                                    { color: isActive ? '#fff' : theme.textPrimary }
                                ]}
                                numberOfLines={1}
                            >
                                {child.childName}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                {/* Add Child Button */}
                {onAddChild && (
                    <TouchableOpacity
                        style={[styles.addChildCircle, { backgroundColor: theme.background, borderColor: theme.border }]}
                        onPress={handleAddChild}
                        activeOpacity={0.7}
                    >
                        <View style={styles.addIconContainer}>
                            <Plus size={24} color="#9CA3AF" />
                        </View>
                        <Text style={[styles.childName, { color: theme.textSecondary }]}>
                            הוסף
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Compact styles (for header)
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    compactCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    compactAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    compactAvatarPlaceholder: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactInitials: {
        fontSize: 14,
        fontWeight: '700',
    },
    activeDot: {
        position: 'absolute',
        bottom: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#fff',
    },
    compactGuestBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactGuestText: {
        fontSize: 10,
    },
    compactAddButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
    },

    // Full mode styles (original)
    container: {
        paddingVertical: 12,
    },
    scrollContent: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    childCircle: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        minWidth: 80,
    },
    addChildCircle: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        minWidth: 80,
    },
    addIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        fontSize: 18,
        fontWeight: '700',
    },
    guestBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    guestBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
    },
    childName: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        maxWidth: 70,
    },

    // Dropdown styles
    dropdownTrigger: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    triggerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    triggerAvatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    triggerAvatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    triggerInitials: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    triggerTextSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    triggerName: {
        fontSize: 14,
        fontWeight: '600',
        maxWidth: 80,
    },
    countBadge: {
        backgroundColor: '#6366F1',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    countText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dropdownMenu: {
        width: '90%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    dropdownTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
    },
    childrenList: {
        maxHeight: 300,
    },
    childRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    rowAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    rowAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowInitials: {
        fontSize: 16,
        fontWeight: '700',
    },
    rowTextSection: {
        flex: 1,
        marginHorizontal: 12,
    },
    rowName: {
        fontSize: 16,
        fontWeight: '600',
    },
    guestTag: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    guestTagText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },

    // Premium modal styles
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    childRowActive: {
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    rowAvatarWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        padding: 2,
    },
    rowAvatarWrapperActive: {
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    rowNameActive: {
        fontWeight: '700',
        color: '#4F46E5',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addOptionsSection: {
        paddingTop: 8,
    },
    addSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 12,
        textAlign: 'right',
    },
    addOptionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 8,
    },
    addOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addOptionText: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: 'flex-end',
    },
    addOptionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    addOptionSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },

    // Legacy styles (kept for full mode)
    addChildRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        marginTop: 8,
    },
    addIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#6366F1',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addChildText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6366F1',
        marginRight: 12,
    },
});

export default ChildPicker;

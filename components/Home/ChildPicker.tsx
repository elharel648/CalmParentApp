import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useActiveChild, ActiveChild } from '../../context/ActiveChildContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ChildPickerProps {
    onChildSelect?: (child: ActiveChild) => void;
    onAddChild?: () => void;
}

const ChildPicker: React.FC<ChildPickerProps> = ({ onChildSelect, onAddChild }) => {
    const { theme } = useTheme();
    const { allChildren, activeChild, setActiveChild } = useActiveChild();

    // Don't show if no children at all
    if (allChildren.length === 0) {
        return null;
    }

    const handleSelect = (child: ActiveChild) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveChild(child);
        onChildSelect?.(child);
    };

    const handleAddChild = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAddChild?.();
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
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
                            {/* Avatar */}
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

                            {/* Guest Badge */}
                            {isGuest && (
                                <View style={styles.guestBadge}>
                                    <Text style={styles.guestBadgeText}>אורח</Text>
                                </View>
                            )}

                            {/* Name */}
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
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
    },
    scrollContent: {
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
});

export default ChildPicker;

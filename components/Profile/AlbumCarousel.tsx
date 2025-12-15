import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Plus } from 'lucide-react-native';

interface AlbumCarouselProps {
    album?: { [month: number]: string };
    onMonthPress: (month: number) => void;
}

const AlbumCarousel = memo(({ album, onMonthPress }: AlbumCarouselProps) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {Array.from({ length: 12 }).map((_, i) => {
                const month = i + 1;
                const img = album?.[month];
                const hasImage = !!img;

                return (
                    <TouchableOpacity
                        key={month}
                        style={styles.monthItem}
                        onPress={() => onMonthPress(month)}
                        activeOpacity={0.8}
                    >
                        {hasImage ? (
                            <Image source={{ uri: img }} style={styles.monthImage} />
                        ) : (
                            <View style={styles.emptyMonth}>
                                <Plus size={18} color="#D1D5DB" strokeWidth={2} />
                            </View>
                        )}
                        <Text style={[styles.monthLabel, hasImage && styles.monthLabelActive]}>
                            {month}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
});

AlbumCarousel.displayName = 'AlbumCarousel';

const styles = StyleSheet.create({
    scrollContent: {
        gap: 12,
        paddingVertical: 4,
    },
    monthItem: {
        alignItems: 'center',
        gap: 6,
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
});

export default AlbumCarousel;

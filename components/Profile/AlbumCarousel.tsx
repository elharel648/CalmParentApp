import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Plus } from 'lucide-react-native';

interface AlbumCarouselProps {
    album?: { [month: number]: string };
    onMonthPress: (month: number) => void;
}

const AlbumCarousel = memo(({ album, onMonthPress }: AlbumCarouselProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionHeader}>רגעים קסומים 📸</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {Array.from({ length: 12 }).map((_, i) => {
                    const month = i + 1;
                    const img = album?.[month];

                    return (
                        <View key={month} style={styles.monthContainer}>
                            <TouchableOpacity
                                style={styles.storyCircle}
                                onPress={() => onMonthPress(month)}
                                accessibilityLabel={`חודש ${month}`}
                            >
                                {img ? (
                                    <Image source={{ uri: img }} style={styles.storyImage} />
                                ) : (
                                    <View style={styles.emptyStory}>
                                        <Plus size={20} color="#cbd5e1" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.storyLabel}>חודש {month}</Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
});

AlbumCarousel.displayName = 'AlbumCarousel';

const styles = StyleSheet.create({
    container: {
        marginBottom: 25,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 12,
        textAlign: 'right',
    },
    scrollContent: {
        gap: 15,
        paddingRight: 20,
    },
    monthContainer: {
        alignItems: 'center',
        gap: 6,
    },
    storyCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#6366f1',
        padding: 3,
    },
    storyImage: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    emptyStory: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500',
    },
});

export default AlbumCarousel;

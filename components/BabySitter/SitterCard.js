import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { formatPrice, formatDistance, formatRating } from '../../utils/babySitterHelpers';

/**
 * קומפוננטת כרטיס בייביסיטר
 * ממו-איזד לביצועים משופרים
 */
const SitterCard = memo(({ sitter, onPress, onPlayVideo }) => {
    const mutualFriends = sitter.mutualFriends || [];
    const hasMutualFriends = mutualFriends.length > 0;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress(sitter)}
            accessible={true}
            accessibilityLabel={`בייביסיטר ${sitter.name}, גיל ${sitter.age}, דירוג ${sitter.rating} כוכבים`}
            accessibilityRole="button"
        >
            <View style={styles.card}>
                {/* תמונה עגולה עם כפתור וידאו */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: sitter.image }}
                        style={styles.cardImage}
                        accessible={true}
                        accessibilityLabel={`תמונה של ${sitter.name}`}
                    />

                    {/* כפתור Play לוידאו */}
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            onPlayVideo(sitter);
                        }}
                        accessible={true}
                        accessibilityLabel="הפעל וידאו היכרות"
                        accessibilityRole="button"
                    >
                        <Ionicons name="play" size={10} color="#fff" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>

                    {/* תג Super Sitter */}
                    {sitter.isSuperSitter && (
                        <View style={styles.superSitterBadge}>
                            <Ionicons name="trophy" size={10} color="#fff" />
                            <Text style={styles.superSitterText}>SUPER</Text>
                        </View>
                    )}
                </View>

                {/* תוכן הכרטיס */}
                <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                        <Text style={styles.sitterName}>{sitter.name}, {sitter.age}</Text>
                        <View style={styles.ratingBox}>
                            <Ionicons name="star" size={12} color="#FFC107" />
                            <Text style={styles.ratingText}>{formatRating(sitter.rating)}</Text>
                        </View>
                    </View>

                    <Text style={styles.bioText} numberOfLines={1}>
                        {sitter.bio}
                    </Text>

                    {/* 🔥 חברים משותפים - אם יש */}
                    {hasMutualFriends && (
                        <View style={styles.mutualFriendsRow}>
                            <View style={styles.mutualAvatars}>
                                {mutualFriends.slice(0, 3).map((friend, index) => (
                                    <Image
                                        key={friend.id}
                                        source={{ uri: friend.picture?.data?.url || 'https://i.pravatar.cc/50' }}
                                        style={[
                                            styles.mutualAvatar,
                                            { marginRight: index > 0 ? -8 : 0 }
                                        ]}
                                    />
                                ))}
                            </View>
                            <Text style={styles.mutualText}>
                                {mutualFriends.length} חברים משותפים
                            </Text>
                            <Ionicons name="logo-facebook" size={12} color="#1877F2" />
                        </View>
                    )}

                    <View style={styles.cardBottom}>
                        <Text style={styles.priceText}>
                            {formatPrice(sitter.price)}
                            <Text style={styles.perHour}> / שעה</Text>
                        </Text>
                        <View style={styles.distanceBadge}>
                            <Ionicons name="location-sharp" size={12} color="#94a3b8" />
                            <Text style={styles.distanceText}>{formatDistance(sitter.distance)}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

SitterCard.propTypes = {
    sitter: PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        age: PropTypes.number.isRequired,
        price: PropTypes.number.isRequired,
        distance: PropTypes.number.isRequired,
        rating: PropTypes.number.isRequired,
        image: PropTypes.string.isRequired,
        bio: PropTypes.string,
        isSuperSitter: PropTypes.bool,
    }).isRequired,
    onPress: PropTypes.func.isRequired,
    onPlayVideo: PropTypes.func.isRequired,
};

SitterCard.displayName = 'SitterCard';

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row-reverse',
        marginBottom: 16,
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f8f8f8',
    },
    imageContainer: {
        position: 'relative',
    },
    cardImage: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        backgroundColor: '#eee',
    },
    playButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    superSitterBadge: {
        position: 'absolute',
        top: -5,
        left: -5,
        backgroundColor: '#FFC107',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    superSitterText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#fff',
    },
    cardContent: {
        flex: 1,
        height: 75,
        marginRight: 15,
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    cardTop: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sitterName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333',
    },
    bioText: {
        fontSize: 13,
        color: '#888',
        textAlign: 'right',
    },
    cardBottom: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#4f46e5',
    },
    perHour: {
        fontSize: 12,
        fontWeight: '400',
        color: '#999',
    },
    distanceBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
    },
    distanceText: {
        fontSize: 12,
        color: '#64748b',
    },
    // Mutual friends styles
    mutualFriendsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
        marginBottom: 2,
    },
    mutualAvatars: {
        flexDirection: 'row-reverse',
    },
    mutualAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#fff',
        backgroundColor: '#E5E7EB',
    },
    mutualText: {
        fontSize: 11,
        color: '#1877F2',
        fontWeight: '600',
    },
});

export default SitterCard;

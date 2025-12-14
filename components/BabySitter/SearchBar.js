import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { formatShortDate } from '../../utils/babySitterHelpers';

/**
 * קומפוננטת פס חיפוש
 * מציגה את המיקום ותאריך הבחירה
 */
const SearchBar = memo(({
    address,
    isLoadingLocation,
    selectedDate,
    onLocationPress,
    onDatePress
}) => {
    return (
        <View style={styles.searchBarContainer}>
            {/* חיפוש לפי מיקום */}
            <TouchableOpacity
                style={styles.searchRow}
                onPress={onLocationPress}
                accessible={true}
                accessibilityLabel={`מיקום: ${address}`}
                accessibilityRole="button"
            >
                <View style={styles.iconCircle}>
                    <Ionicons name="location" size={18} color="#4f46e5" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.label}>איפה?</Text>
                    {isLoadingLocation ? (
                        <ActivityIndicator size="small" color="#999" />
                    ) : (
                        <Text style={styles.valueText} numberOfLines={1}>
                            {address}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* חיפוש לפי תאריך */}
            <TouchableOpacity
                style={styles.searchRow}
                onPress={onDatePress}
                accessible={true}
                accessibilityLabel={`תאריך: ${formatShortDate(selectedDate)}`}
                accessibilityRole="button"
            >
                <View style={styles.iconCircle}>
                    <Ionicons name="calendar" size={18} color="#4f46e5" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.label}>מתי?</Text>
                    <Text style={styles.valueText}>{formatShortDate(selectedDate)}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
});

SearchBar.propTypes = {
    address: PropTypes.string.isRequired,
    isLoadingLocation: PropTypes.bool,
    selectedDate: PropTypes.instanceOf(Date).isRequired,
    onLocationPress: PropTypes.func,
    onDatePress: PropTypes.func.isRequired,
};

SearchBar.defaultProps = {
    isLoadingLocation: false,
    onLocationPress: () => { },
};

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
    searchBarContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 5,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
        marginBottom: 20,
    },
    searchRow: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 10,
        gap: 10,
    },
    iconCircle: {
        width: 36,
        height: 36,
        backgroundColor: '#F3F4F6',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    valueText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
    },
    divider: {
        width: 1,
        height: '60%',
        backgroundColor: '#EEE',
    },
});

export default SearchBar;

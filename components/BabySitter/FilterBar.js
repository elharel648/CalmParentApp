import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';

/**
 * קומפוננטת רצועת פילטרים
 * מאפשרת מיון ופילטור של תוצאות
 */
const FilterBar = memo(({
    resultsCount,
    filters,
    selectedFilter,
    onFilterChange
}) => {
    return (
        <View style={styles.filterRow}>
            <Text style={styles.resultsCount}>{resultsCount} תוצאות</Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
            >
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter.id}
                        style={[
                            styles.filterChip,
                            selectedFilter === filter.value && styles.activeChip,
                        ]}
                        onPress={() => onFilterChange(filter.value)}
                        accessible={true}
                        accessibilityLabel={`סנן לפי ${filter.label}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedFilter === filter.value }}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                selectedFilter === filter.value && styles.activeFilterText,
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
});

FilterBar.propTypes = {
    resultsCount: PropTypes.number.isRequired,
    filters: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            value: PropTypes.string.isRequired,
        })
    ).isRequired,
    selectedFilter: PropTypes.string.isRequired,
    onFilterChange: PropTypes.func.isRequired,
};

FilterBar.displayName = 'FilterBar';

const styles = StyleSheet.create({
    filterRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingRight: 24,
    },
    resultsCount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginLeft: 10,
    },
    filterScroll: {
        flexDirection: 'row-reverse',
        paddingLeft: 20,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        marginLeft: 8,
    },
    activeChip: {
        backgroundColor: '#1e293b',
        borderColor: '#1e293b',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    activeFilterText: {
        color: '#fff',
    },
});

export default FilterBar;

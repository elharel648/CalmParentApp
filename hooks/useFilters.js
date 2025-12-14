import { useState, useMemo } from 'react';

/**
 * Custom Hook לניהול פילטרים ומיון
 * @param {Array} data - המידע למיון
 * @returns {Object} { sortBy, setSortBy, sortedData, availableFilters }
 */
const useFilters = (data = []) => {
    const [sortBy, setSortBy] = useState('recommended');

    // מיון הנתונים בהתאם לפילטר הנבחר
    const sortedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const sorted = [...data];

        switch (sortBy) {
            case 'rating':
                return sorted.sort((a, b) => b.rating - a.rating);

            case 'price':
                return sorted.sort((a, b) => a.price - b.price);

            case 'distance':
                return sorted.sort((a, b) => a.distance - b.distance);

            case 'superSitter':
                return sorted.sort((a, b) => {
                    if (a.isSuperSitter && !b.isSuperSitter) return -1;
                    if (!a.isSuperSitter && b.isSuperSitter) return 1;
                    return 0;
                });

            default: // 'recommended'
                return sorted;
        }
    }, [data, sortBy]);

    // פילטרים זמינים
    const availableFilters = useMemo(() => [
        { id: 'recommended', label: '⭐ מומלץ', value: 'recommended' },
        { id: 'rating', label: '⭐ דירוג', value: 'rating' },
        { id: 'distance', label: '📍 קרוב', value: 'distance' },
        { id: 'price', label: '💰 מחיר', value: 'price' },
        { id: 'superSitter', label: '🏆 Super', value: 'superSitter' },
    ], []);

    return {
        sortBy,
        setSortBy,
        sortedData,
        availableFilters,
    };
};

export default useFilters;

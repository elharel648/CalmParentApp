import { useState, useMemo } from 'react';

export type SortOption = 'recommended' | 'rating' | 'price' | 'distance' | 'superSitter';

interface SitterData {
    id: string;
    name: string;
    rating: number;
    price: number;
    distance: number;
    isSuperSitter: boolean;
    [key: string]: any; // Allow extra fields
}

interface FilterOption {
    id: string;
    label: string;
    value: SortOption;
}

interface UseFiltersReturn {
    sortBy: SortOption;
    setSortBy: (option: SortOption) => void;
    sortedData: SitterData[];
    availableFilters: FilterOption[];
}

/**
 * Custom Hook לניהול פילטרים ומיון
 */
const useFilters = (data: SitterData[] = []): UseFiltersReturn => {
    const [sortBy, setSortBy] = useState<SortOption>('recommended');

    // מיון הנתונים בהתאם לפילטר הנבחר
    const sortedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const sorted = [...data];

        switch (sortBy) {
            case 'rating':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));

            case 'price':
                return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));

            case 'distance':
                return sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));

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
    const availableFilters: FilterOption[] = useMemo(() => [
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

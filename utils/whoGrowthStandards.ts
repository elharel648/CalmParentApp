/**
 * WHO Child Growth Standards - Complete Data
 * Source: World Health Organization, 2006
 * https://www.who.int/tools/child-growth-standards
 * 
 * This file contains percentile data for weight, length, and head circumference
 * for children aged 0-24 months, separated by sex.
 * 
 * DISCLAIMER: This data is for informational purposes only and should not
 * replace professional medical advice. Always consult with a healthcare
 * provider for concerns about your child's growth.
 */

// Percentile values at each month (p3, p15, p50, p85, p97)
export interface PercentileData {
    p3: number;
    p15: number;
    p50: number;
    p85: number;
    p97: number;
}

export interface GrowthData {
    weight: Record<number, PercentileData>; // kg
    length: Record<number, PercentileData>; // cm
    head: Record<number, PercentileData>;   // cm
}

// Boys - Weight for age (kg)
const boysWeight: Record<number, PercentileData> = {
    0: { p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
    1: { p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
    2: { p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
    3: { p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
    4: { p3: 5.6, p15: 6.3, p50: 7.0, p85: 7.9, p97: 8.7 },
    5: { p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
    6: { p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
    7: { p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.2 },
    8: { p3: 6.9, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.5 },
    9: { p3: 7.2, p15: 8.0, p50: 8.9, p85: 9.9, p97: 10.9 },
    10: { p3: 7.4, p15: 8.2, p50: 9.2, p85: 10.2, p97: 11.2 },
    11: { p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.5 },
    12: { p3: 7.8, p15: 8.6, p50: 9.6, p85: 10.8, p97: 11.8 },
    13: { p3: 7.9, p15: 8.8, p50: 9.9, p85: 11.0, p97: 12.1 },
    14: { p3: 8.1, p15: 9.0, p50: 10.1, p85: 11.3, p97: 12.4 },
    15: { p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.7 },
    16: { p3: 8.4, p15: 9.4, p50: 10.5, p85: 11.7, p97: 12.9 },
    17: { p3: 8.6, p15: 9.6, p50: 10.7, p85: 12.0, p97: 13.2 },
    18: { p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.5 },
    19: { p3: 8.9, p15: 10.0, p50: 11.1, p85: 12.5, p97: 13.7 },
    20: { p3: 9.1, p15: 10.1, p50: 11.3, p85: 12.7, p97: 14.0 },
    21: { p3: 9.2, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.3 },
    22: { p3: 9.4, p15: 10.5, p50: 11.8, p85: 13.2, p97: 14.5 },
    23: { p3: 9.5, p15: 10.7, p50: 12.0, p85: 13.4, p97: 14.8 },
    24: { p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.0 },
};

// Boys - Length for age (cm)
const boysLength: Record<number, PercentileData> = {
    0: { p3: 46.3, p15: 48.0, p50: 49.9, p85: 51.8, p97: 53.4 },
    1: { p3: 51.1, p15: 52.8, p50: 54.7, p85: 56.7, p97: 58.4 },
    2: { p3: 54.7, p15: 56.5, p50: 58.4, p85: 60.4, p97: 62.2 },
    3: { p3: 57.6, p15: 59.5, p50: 61.4, p85: 63.4, p97: 65.3 },
    4: { p3: 60.0, p15: 61.9, p50: 63.9, p85: 65.9, p97: 67.8 },
    5: { p3: 62.0, p15: 63.9, p50: 65.9, p85: 68.0, p97: 69.9 },
    6: { p3: 63.6, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.6 },
    7: { p3: 65.1, p15: 67.0, p50: 69.2, p85: 71.3, p97: 73.2 },
    8: { p3: 66.5, p15: 68.4, p50: 70.6, p85: 72.8, p97: 74.7 },
    9: { p3: 67.7, p15: 69.7, p50: 72.0, p85: 74.2, p97: 76.2 },
    10: { p3: 69.0, p15: 71.0, p50: 73.3, p85: 75.6, p97: 77.6 },
    11: { p3: 70.2, p15: 72.2, p50: 74.5, p85: 76.9, p97: 78.9 },
    12: { p3: 71.3, p15: 73.4, p50: 75.7, p85: 78.1, p97: 80.2 },
    13: { p3: 72.4, p15: 74.5, p50: 76.9, p85: 79.3, p97: 81.4 },
    14: { p3: 73.4, p15: 75.6, p50: 78.0, p85: 80.5, p97: 82.6 },
    15: { p3: 74.4, p15: 76.6, p50: 79.1, p85: 81.7, p97: 83.8 },
    16: { p3: 75.4, p15: 77.6, p50: 80.2, p85: 82.8, p97: 85.0 },
    17: { p3: 76.3, p15: 78.6, p50: 81.2, p85: 83.9, p97: 86.1 },
    18: { p3: 77.2, p15: 79.6, p50: 82.3, p85: 85.0, p97: 87.3 },
    19: { p3: 78.1, p15: 80.5, p50: 83.2, p85: 86.0, p97: 88.4 },
    20: { p3: 78.9, p15: 81.4, p50: 84.2, p85: 87.0, p97: 89.4 },
    21: { p3: 79.7, p15: 82.3, p50: 85.1, p85: 88.0, p97: 90.5 },
    22: { p3: 80.5, p15: 83.1, p50: 86.0, p85: 89.0, p97: 91.5 },
    23: { p3: 81.3, p15: 83.9, p50: 86.9, p85: 89.9, p97: 92.5 },
    24: { p3: 81.7, p15: 84.1, p50: 87.1, p85: 90.2, p97: 92.9 },
};

// Boys - Head circumference for age (cm)
const boysHead: Record<number, PercentileData> = {
    0: { p3: 32.4, p15: 33.3, p50: 34.5, p85: 35.7, p97: 36.7 },
    1: { p3: 35.4, p15: 36.3, p50: 37.3, p85: 38.4, p97: 39.3 },
    2: { p3: 37.0, p15: 38.0, p50: 39.1, p85: 40.2, p97: 41.1 },
    3: { p3: 38.3, p15: 39.3, p50: 40.5, p85: 41.7, p97: 42.7 },
    4: { p3: 39.4, p15: 40.4, p50: 41.6, p85: 42.9, p97: 43.9 },
    5: { p3: 40.3, p15: 41.3, p50: 42.6, p85: 43.8, p97: 44.8 },
    6: { p3: 41.0, p15: 42.0, p50: 43.3, p85: 44.6, p97: 45.6 },
    7: { p3: 41.7, p15: 42.7, p50: 44.0, p85: 45.3, p97: 46.3 },
    8: { p3: 42.2, p15: 43.3, p50: 44.5, p85: 45.8, p97: 46.9 },
    9: { p3: 42.7, p15: 43.7, p50: 45.0, p85: 46.3, p97: 47.4 },
    10: { p3: 43.1, p15: 44.2, p50: 45.4, p85: 46.7, p97: 47.8 },
    11: { p3: 43.5, p15: 44.5, p50: 45.8, p85: 47.1, p97: 48.2 },
    12: { p3: 43.8, p15: 44.8, p50: 46.1, p85: 47.4, p97: 48.5 },
    13: { p3: 44.1, p15: 45.1, p50: 46.3, p85: 47.6, p97: 48.8 },
    14: { p3: 44.3, p15: 45.3, p50: 46.6, p85: 47.9, p97: 49.0 },
    15: { p3: 44.5, p15: 45.5, p50: 46.8, p85: 48.1, p97: 49.2 },
    16: { p3: 44.7, p15: 45.7, p50: 47.0, p85: 48.3, p97: 49.4 },
    17: { p3: 44.9, p15: 45.9, p50: 47.2, p85: 48.5, p97: 49.6 },
    18: { p3: 45.0, p15: 46.0, p50: 47.4, p85: 48.7, p97: 49.8 },
    19: { p3: 45.2, p15: 46.2, p50: 47.5, p85: 48.9, p97: 50.0 },
    20: { p3: 45.3, p15: 46.4, p50: 47.7, p85: 49.0, p97: 50.1 },
    21: { p3: 45.5, p15: 46.5, p50: 47.8, p85: 49.2, p97: 50.3 },
    22: { p3: 45.6, p15: 46.6, p50: 48.0, p85: 49.3, p97: 50.4 },
    23: { p3: 45.7, p15: 46.8, p50: 48.1, p85: 49.5, p97: 50.6 },
    24: { p3: 45.8, p15: 46.9, p50: 48.3, p85: 49.6, p97: 50.7 },
};

// Girls - Weight for age (kg)
const girlsWeight: Record<number, PercentileData> = {
    0: { p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
    1: { p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.4 },
    2: { p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.5 },
    3: { p3: 4.5, p15: 5.1, p50: 5.8, p85: 6.6, p97: 7.4 },
    4: { p3: 5.0, p15: 5.6, p50: 6.4, p85: 7.3, p97: 8.1 },
    5: { p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.7 },
    6: { p3: 5.8, p15: 6.4, p50: 7.3, p85: 8.3, p97: 9.2 },
    7: { p3: 6.1, p15: 6.8, p50: 7.6, p85: 8.6, p97: 9.6 },
    8: { p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.0 },
    9: { p3: 6.6, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.4 },
    10: { p3: 6.8, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.7 },
    11: { p3: 7.0, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.0 },
    12: { p3: 7.1, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.3 },
    13: { p3: 7.3, p15: 8.1, p50: 9.2, p85: 10.4, p97: 11.6 },
    14: { p3: 7.5, p15: 8.3, p50: 9.4, p85: 10.6, p97: 11.9 },
    15: { p3: 7.7, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.2 },
    16: { p3: 7.8, p15: 8.7, p50: 9.8, p85: 11.1, p97: 12.4 },
    17: { p3: 8.0, p15: 8.9, p50: 10.0, p85: 11.4, p97: 12.7 },
    18: { p3: 8.2, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.0 },
    19: { p3: 8.3, p15: 9.2, p50: 10.4, p85: 11.8, p97: 13.2 },
    20: { p3: 8.5, p15: 9.4, p50: 10.6, p85: 12.1, p97: 13.5 },
    21: { p3: 8.7, p15: 9.6, p50: 10.9, p85: 12.3, p97: 13.8 },
    22: { p3: 8.8, p15: 9.8, p50: 11.1, p85: 12.5, p97: 14.0 },
    23: { p3: 9.0, p15: 10.0, p50: 11.3, p85: 12.8, p97: 14.3 },
    24: { p3: 9.2, p15: 10.2, p50: 11.5, p85: 13.0, p97: 14.6 },
};

// Girls - Length for age (cm)
const girlsLength: Record<number, PercentileData> = {
    0: { p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.0, p97: 52.7 },
    1: { p3: 50.0, p15: 51.7, p50: 53.7, p85: 55.6, p97: 57.4 },
    2: { p3: 53.2, p15: 55.0, p50: 57.1, p85: 59.1, p97: 61.0 },
    3: { p3: 55.8, p15: 57.7, p50: 59.8, p85: 62.0, p97: 63.8 },
    4: { p3: 58.0, p15: 59.9, p50: 62.1, p85: 64.3, p97: 66.2 },
    5: { p3: 59.9, p15: 61.9, p50: 64.0, p85: 66.2, p97: 68.2 },
    6: { p3: 61.5, p15: 63.5, p50: 65.7, p85: 68.0, p97: 70.0 },
    7: { p3: 62.9, p15: 65.0, p50: 67.3, p85: 69.6, p97: 71.6 },
    8: { p3: 64.3, p15: 66.4, p50: 68.7, p85: 71.1, p97: 73.2 },
    9: { p3: 65.6, p15: 67.7, p50: 70.1, p85: 72.6, p97: 74.7 },
    10: { p3: 66.8, p15: 69.0, p50: 71.5, p85: 74.0, p97: 76.1 },
    11: { p3: 68.0, p15: 70.2, p50: 72.8, p85: 75.3, p97: 77.5 },
    12: { p3: 69.2, p15: 71.4, p50: 74.0, p85: 76.6, p97: 78.9 },
    13: { p3: 70.3, p15: 72.6, p50: 75.2, p85: 77.8, p97: 80.2 },
    14: { p3: 71.3, p15: 73.7, p50: 76.4, p85: 79.1, p97: 81.4 },
    15: { p3: 72.4, p15: 74.8, p50: 77.5, p85: 80.2, p97: 82.7 },
    16: { p3: 73.3, p15: 75.8, p50: 78.6, p85: 81.4, p97: 83.9 },
    17: { p3: 74.3, p15: 76.8, p50: 79.7, p85: 82.5, p97: 85.0 },
    18: { p3: 75.2, p15: 77.8, p50: 80.7, p85: 83.6, p97: 86.1 },
    19: { p3: 76.2, p15: 78.8, p50: 81.7, p85: 84.7, p97: 87.3 },
    20: { p3: 77.0, p15: 79.7, p50: 82.7, p85: 85.7, p97: 88.4 },
    21: { p3: 77.9, p15: 80.6, p50: 83.7, p85: 86.7, p97: 89.4 },
    22: { p3: 78.7, p15: 81.5, p50: 84.6, p85: 87.7, p97: 90.5 },
    23: { p3: 79.6, p15: 82.4, p50: 85.5, p85: 88.7, p97: 91.5 },
    24: { p3: 80.0, p15: 82.5, p50: 86.4, p85: 89.4, p97: 92.2 },
};

// Girls - Head circumference for age (cm)
const girlsHead: Record<number, PercentileData> = {
    0: { p3: 31.7, p15: 32.7, p50: 33.9, p85: 35.1, p97: 36.1 },
    1: { p3: 34.3, p15: 35.4, p50: 36.5, p85: 37.7, p97: 38.8 },
    2: { p3: 35.8, p15: 36.9, p50: 38.3, p85: 39.5, p97: 40.5 },
    3: { p3: 37.1, p15: 38.2, p50: 39.5, p85: 40.8, p97: 41.9 },
    4: { p3: 38.1, p15: 39.2, p50: 40.6, p85: 41.9, p97: 43.0 },
    5: { p3: 38.9, p15: 40.1, p50: 41.5, p85: 42.8, p97: 43.9 },
    6: { p3: 39.6, p15: 40.8, p50: 42.2, p85: 43.5, p97: 44.6 },
    7: { p3: 40.2, p15: 41.4, p50: 42.8, p85: 44.2, p97: 45.3 },
    8: { p3: 40.7, p15: 41.9, p50: 43.4, p85: 44.7, p97: 45.9 },
    9: { p3: 41.2, p15: 42.4, p50: 43.8, p85: 45.2, p97: 46.3 },
    10: { p3: 41.6, p15: 42.8, p50: 44.2, p85: 45.6, p97: 46.8 },
    11: { p3: 41.9, p15: 43.1, p50: 44.6, p85: 46.0, p97: 47.1 },
    12: { p3: 42.2, p15: 43.5, p50: 44.9, p85: 46.3, p97: 47.5 },
    13: { p3: 42.5, p15: 43.7, p50: 45.2, p85: 46.6, p97: 47.8 },
    14: { p3: 42.8, p15: 44.0, p50: 45.4, p85: 46.9, p97: 48.0 },
    15: { p3: 43.0, p15: 44.2, p50: 45.7, p85: 47.1, p97: 48.3 },
    16: { p3: 43.2, p15: 44.4, p50: 45.9, p85: 47.3, p97: 48.5 },
    17: { p3: 43.4, p15: 44.6, p50: 46.1, p85: 47.5, p97: 48.7 },
    18: { p3: 43.6, p15: 44.8, p50: 46.2, p85: 47.7, p97: 48.9 },
    19: { p3: 43.8, p15: 45.0, p50: 46.4, p85: 47.9, p97: 49.1 },
    20: { p3: 43.9, p15: 45.1, p50: 46.6, p85: 48.1, p97: 49.3 },
    21: { p3: 44.1, p15: 45.3, p50: 46.8, p85: 48.2, p97: 49.4 },
    22: { p3: 44.2, p15: 45.4, p50: 46.9, p85: 48.4, p97: 49.6 },
    23: { p3: 44.4, p15: 45.6, p50: 47.1, p85: 48.5, p97: 49.8 },
    24: { p3: 44.5, p15: 45.7, p50: 47.2, p85: 48.7, p97: 49.9 },
};

// Export organized data
export const WHO_GROWTH_DATA = {
    boys: {
        weight: boysWeight,
        length: boysLength,
        head: boysHead,
    },
    girls: {
        weight: girlsWeight,
        length: girlsLength,
        head: girlsHead,
    },
};

/**
 * Calculate percentile for a given value using linear interpolation
 * @param value - The measured value
 * @param ageInMonths - Age in months (will be clamped to 0-24)
 * @param metric - 'weight' | 'length' | 'head'
 * @param gender - 'boy' | 'girl'
 * @returns Percentile value (0-100)
 */
export const calculatePercentile = (
    value: number,
    ageInMonths: number,
    metric: 'weight' | 'length' | 'head',
    gender: 'boy' | 'girl'
): number => {
    if (value <= 0 || isNaN(value)) return 0;

    // Clamp age to valid range
    const age = Math.max(0, Math.min(24, Math.round(ageInMonths)));

    // Get appropriate data
    const genderData = gender === 'girl' ? WHO_GROWTH_DATA.girls : WHO_GROWTH_DATA.boys;
    const metricData = genderData[metric];
    const percentiles = metricData[age];

    if (!percentiles) return 50; // Default to median if age not found

    // Linear interpolation between percentile points
    const points = [
        { p: 3, v: percentiles.p3 },
        { p: 15, v: percentiles.p15 },
        { p: 50, v: percentiles.p50 },
        { p: 85, v: percentiles.p85 },
        { p: 97, v: percentiles.p97 },
    ];

    // If below p3
    if (value <= points[0].v) {
        // Extrapolate below (rough estimate)
        const slope = (points[1].p - points[0].p) / (points[1].v - points[0].v);
        return Math.max(0, points[0].p + slope * (value - points[0].v));
    }

    // If above p97
    if (value >= points[4].v) {
        // Extrapolate above (rough estimate)
        const slope = (points[4].p - points[3].p) / (points[4].v - points[3].v);
        return Math.min(100, points[4].p + slope * (value - points[4].v));
    }

    // Find the two points to interpolate between
    for (let i = 0; i < points.length - 1; i++) {
        if (value >= points[i].v && value <= points[i + 1].v) {
            const { p: p1, v: v1 } = points[i];
            const { p: p2, v: v2 } = points[i + 1];
            // Linear interpolation
            return p1 + ((value - v1) / (v2 - v1)) * (p2 - p1);
        }
    }

    return 50; // Fallback to median
};

/**
 * Get percentile status and color
 */
export const getPercentileStatus = (percentile: number): {
    color: string;
    bgColor: string;
    status: string;
    statusHe: string;
} => {
    if (percentile < 3) {
        return { color: '#EF4444', bgColor: '#FEE2E2', status: 'Very Low', statusHe: 'נמוך מאוד' };
    }
    if (percentile < 15) {
        return { color: '#F59E0B', bgColor: '#FEF3C7', status: 'Low', statusHe: 'נמוך' };
    }
    if (percentile <= 85) {
        return { color: '#10B981', bgColor: '#D1FAE5', status: 'Normal', statusHe: 'תקין' };
    }
    if (percentile <= 97) {
        return { color: '#F59E0B', bgColor: '#FEF3C7', status: 'High', statusHe: 'גבוה' };
    }
    return { color: '#EF4444', bgColor: '#FEE2E2', status: 'Very High', statusHe: 'גבוה מאוד' };
};

/**
 * פונקציות עזר לתכונת חיפוש בייביסיטרים
 */

/**
 * פורמט תאריך לעברית
 * @param {Date} date 
 * @returns {string}
 */
export const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

/**
 * פורמט תאריך קצר
 * @param {Date} date 
 * @returns {string}
 */
export const formatShortDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long'
    });
};

/**
 * פורמט מחיר
 * @param {number} price 
 * @returns {string}
 */
export const formatPrice = (price) => {
    return `₪${price}`;
};

/**
 * פורמט מרחק
 * @param {number} distance 
 * @returns {string}
 */
export const formatDistance = (distance) => {
    if (distance < 1) {
        return `${Math.round(distance * 1000)} מ'`;
    }
    return `${distance.toFixed(1)} ק"מ`;
};

/**
 * חישוב מרחק בין שתי נקודות (Haversine formula)
 * @param {Object} coord1 - { latitude, longitude }
 * @param {Object} coord2 - { latitude, longitude }
 * @returns {number} - מרחק בקילומטרים
 */
export const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return null;

    const R = 6371; // רדיוס כדור הארץ בק"מ
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coord1.latitude)) *
        Math.cos(toRad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // עיגול לספרה אחת אחרי הנקודה
};

/**
 * המרה מדרגות לרדיאנים
 * @param {number} degrees 
 * @returns {number}
 */
const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
};

/**
 * פורמט דירוג
 * @param {number} rating 
 * @returns {string}
 */
export const formatRating = (rating) => {
    return rating.toFixed(1);
};

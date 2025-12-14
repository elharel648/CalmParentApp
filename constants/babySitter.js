/**
 * קבועים ונתוני Mock לתכונת חיפוש בייביסיטרים
 */

// נתוני Mock - בייביסיטרים
export const MOCK_SITTERS = [
    {
        id: 1,
        name: 'נועה כהן',
        age: 24,
        price: 55,
        distance: 0.8,
        rating: 5.0,
        reviews: 52,
        isAvailable: true,
        isSuperSitter: true,
        image: 'https://randomuser.me/api/portraits/women/44.jpg',
        bio: 'סטודנטית לחינוך, מומחית לגיל הרך 🧸',
        coordinate: { latitude: 32.0853, longitude: 34.7818 },
    },
    {
        id: 2,
        name: 'מאיה לוי',
        age: 22,
        price: 50,
        distance: 2.1,
        rating: 4.8,
        reviews: 15,
        isAvailable: true,
        isSuperSitter: false,
        image: 'https://randomuser.me/api/portraits/women/68.jpg',
        bio: 'חיילת משוחררת עם המון סבלנות 🎨',
        coordinate: { latitude: 32.0900, longitude: 34.7700 },
    },
    {
        id: 3,
        name: 'דנה ישראלי',
        age: 28,
        price: 65,
        distance: 3.5,
        rating: 4.9,
        reviews: 120,
        isAvailable: true,
        isSuperSitter: true,
        image: 'https://randomuser.me/api/portraits/women/90.jpg',
        bio: 'גננת מוסמכת ומומלצת בחום 🌟',
        coordinate: { latitude: 32.0700, longitude: 34.7900 },
    },
    {
        id: 4,
        name: 'רוני אברהם',
        age: 20,
        price: 45,
        distance: 4.2,
        rating: 4.5,
        reviews: 8,
        isAvailable: false,
        isSuperSitter: false,
        image: 'https://randomuser.me/api/portraits/women/32.jpg',
        bio: 'תיכוניסטית אחראית ואנרגטית ⚽',
        coordinate: { latitude: 32.0600, longitude: 34.7700 },
    },
];

// ערכי ברירת מחדל למפה
export const DEFAULT_MAP_REGION = {
    latitude: 32.0853,
    longitude: 34.7818,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

// סוגי מיון
export const SORT_TYPES = {
    RECOMMENDED: 'recommended',
    RATING: 'rating',
    PRICE: 'price',
    DISTANCE: 'distance',
    SUPER_SITTER: 'superSitter',
};

// מצבי תצוגה
export const VIEW_MODES = {
    LIST: 'list',
    MAP: 'map',
};

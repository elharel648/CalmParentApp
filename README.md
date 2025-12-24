# CalmParent 👶

> אפליקציית מעקב תינוקות מודרנית ואינטואיטיבית

<p align="center">
  <strong>בנוי עם React Native + Expo + Firebase</strong>
</p>

---

## 🚀 התקנה מהירה

```bash
# Clone the repository
git clone https://github.com/yourusername/calmparent.git
cd calmparent

# Install dependencies
npm install

# Start development server
npx expo start
```

## 📱 הרצה על מכשיר

### iOS
```bash
npx expo run:ios
# או
npx expo start --ios
```

### Android
```bash
npx expo run:android
# או
npx expo start --android
```

---

## 🏗️ מבנה הפרויקט

```
APP/
├── App.tsx                 # Entry point + Navigation
├── components/             # Reusable UI components
│   ├── Home/              # Home screen components
│   ├── Reports/           # Charts and analytics
│   ├── Family/            # Family management
│   └── ...
├── pages/                  # Screen components
│   ├── HomeScreen.tsx
│   ├── ReportsScreen.tsx
│   ├── SettingsScreen.tsx
│   └── ...
├── services/               # Firebase & API services
│   ├── firebaseConfig.ts
│   ├── firebaseService.ts
│   ├── familyService.ts
│   └── notificationService.ts
├── context/                # React Context providers
│   ├── ActiveChildContext.tsx
│   ├── SleepTimerContext.tsx
│   ├── FoodTimerContext.tsx
│   └── ThemeContext.tsx
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── firestore.rules        # Firebase security rules
└── firestore.indexes.json # Database indexes
```

---

## 🔧 טכנולוגיות

| קטגוריה | טכנולוגיה |
|---------|-----------|
| **Framework** | React Native 0.76 + Expo 52 |
| **Navigation** | React Navigation 7 |
| **Backend** | Firebase (Auth, Firestore) |
| **Charts** | @shopify/react-native-skia |
| **Animations** | react-native-reanimated |
| **State** | React Context API |
| **Styling** | StyleSheet + Linear Gradients |

---

## 📊 מסד נתונים (Firestore)

### Collections Structure

#### `users/{userId}`
```javascript
{
  email: string,
  displayName: string,
  familyId?: string,
  guestAccess?: { [familyId]: { expiresAt: Timestamp } },
  settings: { biometric: boolean, theme: string }
}
```

#### `babies/{babyId}`
```javascript
{
  name: string,
  birthDate: Timestamp,
  gender: 'boy' | 'girl' | 'other',
  parentId: string,
  familyId?: string,
  photoUrl?: string,
  stats: { weight, height, headCircumference },
  milestones: Array<{ title, date }>,
  vaccines: { [vaccineId]: boolean }
}
```

#### `events/{eventId}`
```javascript
{
  type: 'food' | 'sleep' | 'diaper' | 'supplement',
  subType?: string,
  timestamp: Timestamp,
  childId: string,
  userId: string,
  amount?: number,  // For food (ml)
  duration?: number, // For sleep (seconds)
  note?: string
}
```

#### `families/{familyId}`
```javascript
{
  createdBy: string,
  babyId: string,
  babyName: string,
  inviteCode: string,
  members: {
    [userId]: {
      role: 'admin' | 'member' | 'guest',
      name: string,
      email: string,
      joinedAt: Timestamp,
      accessLevel: 'full' | 'actions_only' | 'view_only'
    }
  }
}
```

---

## 🔐 אבטחה

### Firestore Security Rules
- ✅ משתמשים יכולים לקרוא/לכתוב רק את המידע שלהם
- ✅ גישה לתינוקות מוגבלת להורים ובני משפחה
- ✅ אירועים מוגבלים לפי `childId`
- ✅ משפחות נגישות רק לחברים

### Authentication
- Firebase Auth עם persistence
- Apple Sign In + Google Sign In
- Biometric Lock (Face ID / Touch ID)

---

## 🎨 עיצוב

### Design System
- **Style**: Ultra-Minimalist "Apple HIG"
- **Effects**: Liquid Glass (Glassmorphism)
- **Animations**: Spring-based (react-native-reanimated)
- **Icons**: Lucide React Native
- **Colors**: Purple/Indigo primary (#6366F1)

### Theme Support
- Light mode with subtle gradients
- RTL (Hebrew) support

---

## 📦 Scripts

```bash
# Development
npm start              # Start Expo server
npm run ios           # Run on iOS
npm run android       # Run on Android

# Build
eas build --profile production
eas build --profile preview

# Deploy
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 🧪 Testing

```bash
# Type checking
npx tsc --noEmit

# Lint (if configured)
npm run lint
```

---

## 📝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Create a Pull Request

---

## 📄 License

Private - All Rights Reserved

---

## 👨‍💻 Author

**Harel** - CalmParent App

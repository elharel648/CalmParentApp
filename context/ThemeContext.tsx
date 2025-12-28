import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- צבעים ---
export const COLORS = {
    light: {
        background: '#FAF5FF',
        card: '#FFFFFF',
        cardSecondary: '#F5F3FF',
        textPrimary: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        divider: '#EDE9FE',
        border: '#EDE9FE',
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        primary: '#8B5CF6',
        primaryLight: '#EDE9FE',
        accent: '#A78BFA',
        // Specific UI elements
        headerGradient: ['#A78BFA', '#C4B5FD'] as [string, string],
        tabBar: '#FFFFFF',
        tabBarBorder: '#EDE9FE',
        inputBackground: '#F5F3FF',
        modalOverlay: 'rgba(0,0,0,0.5)',
        shadow: '#000000',
    },
    dark: {
        background: '#1a1625',
        card: '#231d2e',
        cardSecondary: '#2d2639',
        textPrimary: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        divider: '#3d3548',
        border: '#3d3548',
        danger: '#FF453A',
        success: '#30D158',
        warning: '#FFD60A',
        primary: '#A78BFA',
        primaryLight: '#312E81',
        accent: '#C4B5FD',
        // Specific UI elements
        headerGradient: ['#231d2e', '#2d2639'] as [string, string],
        tabBar: '#231d2e',
        tabBarBorder: '#3d3548',
        inputBackground: '#2d2639',
        modalOverlay: 'rgba(0,0,0,0.7)',
        shadow: '#000000',
    }
};

export type Theme = typeof COLORS.light;
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    isDarkMode: boolean;
    theme: Theme;
    toggleTheme: () => void;
    setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Load theme preference from Firebase on mount
    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const settings = userSnap.data().settings;
                    if (settings?.isDarkMode !== undefined) {
                        setIsDarkMode(settings.isDarkMode);
                    }
                }
            }
        } catch (error) {
            if (__DEV__) console.log('Error loading theme preference:', error);
        }
    };

    const saveThemePreference = async (value: boolean) => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { settings: { isDarkMode: value } }, { merge: true });
            }
        } catch (error) {
            if (__DEV__) console.log('Error saving theme preference:', error);
        }
    };

    const toggleTheme = () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        saveThemePreference(newValue);
    };

    const setDarkMode = (value: boolean) => {
        setIsDarkMode(value);
        saveThemePreference(value);
    };

    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    return (
        <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme, setDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- צבעים ---
export const COLORS = {
    light: {
        background: '#F2F2F7',
        card: '#FFFFFF',
        cardSecondary: '#F9FAFB',
        textPrimary: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        divider: '#E5E7EB',
        border: '#E5E7EB',
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        primary: '#6366F1',
        primaryLight: '#EEF2FF',
        accent: '#8B5CF6',
        // Specific UI elements
        headerGradient: ['#6366F1', '#8B5CF6'] as [string, string],
        tabBar: '#FFFFFF',
        tabBarBorder: '#E5E7EB',
        inputBackground: '#F3F4F6',
        modalOverlay: 'rgba(0,0,0,0.5)',
        shadow: '#000000',
    },
    dark: {
        background: '#000000',
        card: '#1C1C1E',
        cardSecondary: '#2C2C2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        divider: '#38383A',
        border: '#38383A',
        danger: '#FF453A',
        success: '#30D158',
        warning: '#FFD60A',
        primary: '#818CF8',
        primaryLight: '#312E81',
        accent: '#A78BFA',
        // Specific UI elements
        headerGradient: ['#1C1C1E', '#2C2C2E'] as [string, string],
        tabBar: '#1C1C1E',
        tabBarBorder: '#38383A',
        inputBackground: '#2C2C2E',
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
            console.log('Error loading theme preference:', error);
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
            console.log('Error saving theme preference:', error);
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

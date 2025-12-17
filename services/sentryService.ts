// services/sentryService.ts
// Sentry Crash Reporting Service
// 
// SETUP INSTRUCTIONS:
// 1. Create a free account at https://sentry.io
// 2. Create a new React Native project
// 3. Get your DSN from Project Settings -> Client Keys
// 4. Replace the DSN below with your actual DSN

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = 'YOUR_SENTRY_DSN_HERE'; // Replace with your actual DSN

/**
 * Initialize Sentry crash reporting
 * Call this in App.tsx before any other code
 */
export function initSentry() {
    // Only initialize in production/staging
    if (__DEV__) {
        console.log('📊 Sentry: Skipped initialization in DEV mode');
        return;
    }

    if (SENTRY_DSN === 'YOUR_SENTRY_DSN_HERE') {
        console.warn('📊 Sentry: DSN not configured. Please set your DSN in sentryService.ts');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        // Enable performance monitoring
        tracesSampleRate: 0.2,
        // Enable native crash handling
        enableNativeNagger: true,
        // Attach screenshots on crash
        attachScreenshot: true,
        // Debug mode for development
        debug: false,
        // Environment tag
        environment: __DEV__ ? 'development' : 'production',
    });

    console.log('📊 Sentry: Initialized successfully');
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
    if (__DEV__) {
        console.error('📊 Sentry would capture:', error);
        return;
    }

    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (__DEV__) {
        console.log(`📊 Sentry would log (${level}):`, message);
        return;
    }

    Sentry.captureMessage(message, level);
}

/**
 * Set user info for crash reports
 */
export function setUser(userId: string, email?: string) {
    Sentry.setUser({
        id: userId,
        email: email,
    });
}

/**
 * Clear user info on logout
 */
export function clearUser() {
    Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string) {
    Sentry.addBreadcrumb({
        message,
        category: category || 'app',
        level: 'info',
    });
}

export default {
    initSentry,
    captureException,
    captureMessage,
    setUser,
    clearUser,
    addBreadcrumb,
};

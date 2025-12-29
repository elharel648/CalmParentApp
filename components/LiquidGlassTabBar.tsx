import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface LiquidGlassTabBarProps {
    isDarkMode?: boolean;
}

/**
 * Liquid Glass Tab Bar Background
 * Full Apple-style glass effect with high blur intensity
 */
export default function LiquidGlassTabBar({ isDarkMode = false }: LiquidGlassTabBarProps) {
    return (
        <View style={styles.container}>
            {/* Main Blur Layer - High intensity for real glass effect */}
            <BlurView
                intensity={80}
                tint="light"
                style={StyleSheet.absoluteFill}
            />

            {/* White overlay for frosted glass effect */}
            <View style={styles.overlay} />

            {/* Top border - subtle separation line */}
            <View style={styles.topBorder} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    topBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 0.5,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
});
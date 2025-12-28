import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { X, Sun, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface NightLightModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function NightLightModal({ visible, onClose }: NightLightModalProps) {


    const [colorTemp, setColorTemp] = useState<'warm' | 'white' | 'red'>('warm');
    const [brightness, setBrightness] = useState(0.3);
    const [controlsVisible, setControlsVisible] = useState(true);

    const controlsOpacity = useSharedValue(1);

    useEffect(() => {
        controlsOpacity.value = withTiming(controlsVisible ? 1 : 0, { duration: 300 });
    }, [controlsVisible]);

    const animatedControlsStyle = useAnimatedStyle(() => ({
        opacity: controlsOpacity.value,
    }));

    const getBackgroundColor = () => {
        const opacity = Math.max(0.1, brightness); // Minimum visibility
        switch (colorTemp) {
            case 'warm': return `rgba(255, 149, 0, ${opacity})`; // Orange/Warm
            case 'white': return `rgba(255, 255, 255, ${opacity})`; // White
            case 'red': return `rgba(255, 0, 0, ${opacity})`; // Red (Sleep friendly)
        }
    };

    const getTextColor = () => {
        return brightness > 0.6 ? '#000' : '#fff'; // Contrast text
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent={false}>
            <TouchableOpacity
                style={[styles.container, { backgroundColor: getBackgroundColor() }]}
                activeOpacity={1}
                onPress={() => setControlsVisible(!controlsVisible)}
            >
                {/* Close Button - Always visible but follows controls visibility logic roughly or fixed? 
                    Better to hide it with controls for full immersion */}
                <Animated.View style={[styles.controlsOverlay, animatedControlsStyle]} pointerEvents={controlsVisible ? 'auto' : 'none'}>
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                    >
                        <X size={28} color={getTextColor()} />
                    </TouchableOpacity>

                    <View style={styles.centerControls}>
                        <Text style={[styles.title, { color: getTextColor() }]}>פנס לילה</Text>
                        <Text style={[styles.subtitle, { color: getTextColor() }]}>לחץ על המסך להסתרת הפקדים</Text>

                        {/* Color Selection */}
                        <View style={styles.colorRow}>
                            <TouchableOpacity
                                style={[styles.colorBtn, colorTemp === 'warm' && styles.colorBtnActive, { backgroundColor: '#FFDCA8' }]}
                                onPress={() => setColorTemp('warm')}
                            >
                                {colorTemp === 'warm' && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.colorBtn, colorTemp === 'white' && styles.colorBtnActive, { backgroundColor: '#FFFFFF' }]}
                                onPress={() => setColorTemp('white')}
                            >
                                {colorTemp === 'white' && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.colorBtn, colorTemp === 'red' && styles.colorBtnActive, { backgroundColor: '#FFD1D1' }]}
                                onPress={() => setColorTemp('red')}
                            >
                                {colorTemp === 'red' && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                        </View>

                        {/* Brightness Slider Mock (using buttons for simplicity if Slider not avail, but we can try simple implementation) */}
                        <View style={styles.brightnessRow}>
                            <TouchableOpacity onPress={() => setBrightness(Math.max(0.1, brightness - 0.1))}>
                                <Moon size={24} color={getTextColor()} />
                            </TouchableOpacity>

                            <View style={styles.brightnessBar}>
                                <View style={[styles.brightnessFill, { width: `${brightness * 100}%`, backgroundColor: getTextColor() }]} />
                            </View>

                            <TouchableOpacity onPress={() => setBrightness(Math.min(1, brightness + 0.1))}>
                                <Sun size={24} color={getTextColor()} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    closeBtn: {
        position: 'absolute',
        top: 60,
        right: 30,
        padding: 10,
    },
    centerControls: {
        alignItems: 'center',
        width: '100%',
        gap: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '300',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 20,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 20,
    },
    colorBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    colorBtnActive: {
        transform: [{ scale: 1.1 }],
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    brightnessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 20,
    },
    brightnessBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    brightnessFill: {
        height: '100%',
    },
});

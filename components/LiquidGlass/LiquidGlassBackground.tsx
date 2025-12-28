import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { Canvas, Circle, Group, BlurMask, LinearGradient, vec } from '@shopify/react-native-skia';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolate,
    useDerivedValue,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Lavender/Purple colors - matching app theme
const BLOB_COLORS = {
    blob1: ['#DDD6FE', '#C4B5FD'], // Soft lavender
    blob2: ['#E9D5FF', '#D8B4FE'], // Light purple
    blob3: ['#EDE9FE', '#DDD6FE'], // Pale lavender
    blob4: ['#F3E8FF', '#E9D5FF'], // Very light purple
};

interface LiquidGlassBackgroundProps {
    scrollY?: Animated.SharedValue<number>;
    touchX?: Animated.SharedValue<number>;
    touchY?: Animated.SharedValue<number>;
}

/**
 * Premium Liquid Glass Background
 * Animated organic blobs with soft pastel colors
 * Uses Skia for high-performance GPU rendering
 */
const LiquidGlassBackground: React.FC<LiquidGlassBackgroundProps> = ({
    scrollY,
    touchX,
    touchY,
}) => {
    // Animation values for organic blob movement
    const time = useSharedValue(0);
    const blob1X = useSharedValue(width * 0.3);
    const blob1Y = useSharedValue(height * 0.2);
    const blob2X = useSharedValue(width * 0.7);
    const blob2Y = useSharedValue(height * 0.4);
    const blob3X = useSharedValue(width * 0.4);
    const blob3Y = useSharedValue(height * 0.6);
    const blob4X = useSharedValue(width * 0.6);
    const blob4Y = useSharedValue(height * 0.15);

    // Scale animation for breathing effect
    const blob1Scale = useSharedValue(1);
    const blob2Scale = useSharedValue(1);
    const blob3Scale = useSharedValue(1);
    const blob4Scale = useSharedValue(1);

    useEffect(() => {
        // Organic floating animation for each blob
        blob1X.value = withRepeat(
            withSequence(
                withTiming(width * 0.4, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
                withTiming(width * 0.25, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
                withTiming(width * 0.35, { duration: 6000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        blob1Y.value = withRepeat(
            withSequence(
                withTiming(height * 0.25, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
                withTiming(height * 0.15, { duration: 7000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );

        blob2X.value = withRepeat(
            withSequence(
                withTiming(width * 0.6, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
                withTiming(width * 0.75, { duration: 8000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        blob2Y.value = withRepeat(
            withSequence(
                withTiming(height * 0.35, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
                withTiming(height * 0.45, { duration: 9000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );

        blob3X.value = withRepeat(
            withSequence(
                withTiming(width * 0.5, { duration: 11000, easing: Easing.inOut(Easing.sin) }),
                withTiming(width * 0.3, { duration: 9000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        blob3Y.value = withRepeat(
            withSequence(
                withTiming(height * 0.55, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
                withTiming(height * 0.65, { duration: 10000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );

        blob4X.value = withRepeat(
            withSequence(
                withTiming(width * 0.7, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
                withTiming(width * 0.55, { duration: 8000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        blob4Y.value = withRepeat(
            withSequence(
                withTiming(height * 0.1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
                withTiming(height * 0.2, { duration: 7000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );

        // Breathing/pulsing effect
        blob1Scale.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.95, { duration: 4000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        blob2Scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.9, { duration: 5000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        blob3Scale.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.85, { duration: 6000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        blob4Scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.95, { duration: 3500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    // Scroll-reactive offset
    const scrollOffset = useDerivedValue(() => {
        return scrollY ? scrollY.value * 0.1 : 0;
    });

    return (
        <View style={styles.container}>
            {/* Base gradient */}
            <View style={styles.baseGradient} />

            {/* Skia Canvas with animated blobs */}
            <Canvas style={styles.canvas}>
                <Group>
                    {/* Blob 1 - Large muted teal */}
                    <Circle
                        cx={blob1X}
                        cy={blob1Y}
                        r={width * 0.35}
                        opacity={0.4}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.7, height * 0.4)}
                            colors={BLOB_COLORS.blob1}
                        />
                        <BlurMask blur={60} style="normal" />
                    </Circle>

                    {/* Blob 2 - Medium soft blue */}
                    <Circle
                        cx={blob2X}
                        cy={blob2Y}
                        r={width * 0.3}
                        opacity={0.35}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.6, height * 0.5)}
                            colors={BLOB_COLORS.blob2}
                        />
                        <BlurMask blur={50} style="normal" />
                    </Circle>

                    {/* Blob 3 - Large light teal */}
                    <Circle
                        cx={blob3X}
                        cy={blob3Y}
                        r={width * 0.4}
                        opacity={0.3}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.8, height * 0.7)}
                            colors={BLOB_COLORS.blob3}
                        />
                        <BlurMask blur={70} style="normal" />
                    </Circle>

                    {/* Blob 4 - Small pale blue accent */}
                    <Circle
                        cx={blob4X}
                        cy={blob4Y}
                        r={width * 0.2}
                        opacity={0.45}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.4, height * 0.3)}
                            colors={BLOB_COLORS.blob4}
                        />
                        <BlurMask blur={40} style="normal" />
                    </Circle>
                </Group>
            </Canvas>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FAF5FF',
    },
    baseGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F5F3FF',
    },
    canvas: {
        flex: 1,
    },
});

export default LiquidGlassBackground;

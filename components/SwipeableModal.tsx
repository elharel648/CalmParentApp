// SwipeableModal.tsx - Swipe down to dismiss modal wrapper
import React, { useRef, useCallback } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

interface SwipeableModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    backgroundColor?: string;
}

export const SwipeableModal: React.FC<SwipeableModalProps> = ({
    visible,
    onClose,
    children,
    backgroundColor = '#fff',
}) => {
    const translateY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to vertical swipes down
                return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward movement
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > DISMISS_THRESHOLD) {
                    // Dismiss modal
                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        onClose();
                        translateY.setValue(0);
                    });
                } else {
                    // Snap back
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 10,
                    }).start();
                }
            },
        })
    ).current;

    const handleClose = useCallback(() => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onClose();
            translateY.setValue(0);
        });
    }, [onClose, translateY]);

    const opacity = translateY.interpolate({
        inputRange: [0, SCREEN_HEIGHT / 2],
        outputRange: [1, 0.5],
        extrapolate: 'clamp',
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.content,
                                { backgroundColor, transform: [{ translateY }], opacity },
                            ]}
                            {...panResponder.panHandlers}
                        >
                            {/* Drag Handle */}
                            <View style={styles.dragHandleContainer}>
                                <View style={styles.dragHandle} />
                            </View>

                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={styles.keyboardView}
                            >
                                {children}
                            </KeyboardAvoidingView>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.9,
        minHeight: 200,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
    },
    keyboardView: {
        flex: 1,
    },
});

export default SwipeableModal;

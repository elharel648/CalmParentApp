import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatsOverlayProps {
    weight?: string;
    height?: string;
}

const StatsOverlay = memo(({ weight, height }: StatsOverlayProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.statItem}>
                <Text style={styles.statVal}>{weight || '-'} ק״ג</Text>
                <Text style={styles.statLabel}>משקל</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.statItem}>
                <Text style={styles.statVal}>{height || '-'} ס״מ</Text>
                <Text style={styles.statLabel}>גובה</Text>
            </View>
        </View>
    );
});

StatsOverlay.displayName = 'StatsOverlay';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: -30,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 15,
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    statItem: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
    },
    verticalLine: {
        width: 1,
        height: 30,
        backgroundColor: '#e2e8f0',
    },
});

export default StatsOverlay;

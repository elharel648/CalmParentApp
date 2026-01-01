import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

interface Breadcrumb {
    label: string;
    route?: string;
}

interface BreadcrumbsProps {
    items: Breadcrumb[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    const { theme } = useTheme();
    const navigation = useNavigation();

    if (items.length <= 1) return null;

    return (
        <View style={styles.container}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <View key={index} style={styles.itemContainer}>
                        {index > 0 && (
                            <ChevronLeft size={14} color={theme.textSecondary} style={styles.separator} />
                        )}
                        {isLast ? (
                            <Text style={[styles.currentItem, { color: theme.textPrimary }]}>
                                {item.label}
                            </Text>
                        ) : (
                            <TouchableOpacity
                                onPress={() => {
                                    if (item.route) {
                                        navigation.navigate(item.route as any);
                                    } else {
                                        navigation.goBack();
                                    }
                                }}
                            >
                                <Text style={[styles.item, { color: theme.textSecondary }]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 4,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    separator: {
        marginHorizontal: 4,
    },
    item: {
        fontSize: 14,
        fontWeight: '500',
    },
    currentItem: {
        fontSize: 14,
        fontWeight: '700',
    },
});


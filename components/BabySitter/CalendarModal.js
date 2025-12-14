import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * קומפוננטת מודל לבחירת תאריך
 * משתמשת ב-react-native-calendars
 */
const CalendarModal = memo(({
    visible,
    selectedDate,
    onConfirm,
    onClose
}) => {
    const [tempDate, setTempDate] = useState(
        selectedDate.toISOString().split('T')[0]
    );

    const handleConfirm = () => {
        const newDate = new Date(tempDate);
        onConfirm(newDate);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>בחירת תאריך</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeBtn}
                            accessible={true}
                            accessibilityLabel="סגור"
                            accessibilityRole="button"
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Calendar */}
                    <Calendar
                        current={tempDate}
                        onDayPress={(day) => setTempDate(day.dateString)}
                        markedDates={{
                            [tempDate]: {
                                selected: true,
                                selectedColor: '#4f46e5',
                            },
                        }}
                        theme={{
                            selectedDayBackgroundColor: '#4f46e5',
                            todayTextColor: '#4f46e5',
                            arrowColor: '#4f46e5',
                            monthTextColor: '#333',
                            textMonthFontWeight: 'bold',
                            textDayFontSize: 16,
                            textMonthFontSize: 18,
                        }}
                        style={styles.calendar}
                        minDate={new Date().toISOString().split('T')[0]}
                    />

                    {/* כפתור אישור */}
                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleConfirm}
                        accessible={true}
                        accessibilityLabel="אשר תאריך"
                        accessibilityRole="button"
                    >
                        <Text style={styles.confirmText}>אישור</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

CalendarModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    selectedDate: PropTypes.instanceOf(Date).isRequired,
    onConfirm: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

CalendarModal.displayName = 'CalendarModal';

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 25,
        minHeight: 500,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 5,
    },
    calendar: {
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    confirmBtn: {
        backgroundColor: '#1A1A1A',
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CalendarModal;

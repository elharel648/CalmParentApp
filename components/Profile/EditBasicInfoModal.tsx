import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Platform,
    Alert,
    Image,
} from 'react-native';
import { X, Check, Calendar, Camera, User } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

interface EditBasicInfoModalProps {
    visible: boolean;
    initialData: {
        name: string;
        gender: 'boy' | 'girl' | 'other';
        birthDate: Date;
        photoUrl?: string;
    };
    onSave: (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date; photoUrl?: string }) => void;
    onClose: () => void;
}

const GENDER_OPTIONS = [
    { value: 'boy', label: 'בן' },
    { value: 'girl', label: 'בת' },
    { value: 'other', label: 'אחר' },
] as const;

export default function EditBasicInfoModal({
    visible,
    initialData,
    onSave,
    onClose,
}: EditBasicInfoModalProps) {
    const [name, setName] = useState(initialData.name);
    const [gender, setGender] = useState<'boy' | 'girl' | 'other'>(initialData.gender);
    const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialData.photoUrl);
    const [birthDate, setBirthDate] = useState(() => {
        // Ensure valid initial date
        const date = initialData.birthDate;
        if (!date) return new Date();
        if (date instanceof Date && !isNaN(date.getTime())) return date;
        if ((date as any)?.seconds) return new Date((date as any).seconds * 1000);
        const parsed = new Date(date as any);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Helper to ensure valid date
    const ensureValidDate = (date: any): Date => {
        if (!date) return new Date();
        if (date instanceof Date && !isNaN(date.getTime())) return date;
        // Try to parse if it's a string or has seconds (Firestore Timestamp)
        if (date?.seconds) return new Date(date.seconds * 1000);
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    useEffect(() => {
        if (visible) {
            setName(initialData.name);
            setGender(initialData.gender);
            setPhotoUrl(initialData.photoUrl);
            setBirthDate(ensureValidDate(initialData.birthDate));
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('שגיאה', 'יש להזין שם');
            return;
        }
        onSave({ name: name.trim(), gender, birthDate, photoUrl });
        onClose();
    };

    const handlePickPhoto = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('שגיאה', 'נדרשת הרשאה לגלריה');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0].uri) {
            setPhotoUrl(result.assets[0].uri);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setBirthDate(selectedDate);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text style={styles.title}>עריכת פרטי ילד</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Photo */}
                        <View style={styles.photoSection}>
                            <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto}>
                                {photoUrl ? (
                                    <Image source={{ uri: photoUrl }} style={styles.photo} />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <User size={40} color="#9CA3AF" />
                                    </View>
                                )}
                                <View style={styles.cameraBadge}>
                                    <Camera size={14} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.photoHint}>לחץ לשינוי תמונה</Text>
                        </View>

                        {/* Name */}
                        <View style={styles.field}>
                            <Text style={styles.label}>שם הילד</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="הזן שם"
                                textAlign="right"
                            />
                        </View>

                        {/* Gender */}
                        <View style={styles.field}>
                            <Text style={styles.label}>מין</Text>
                            <View style={styles.genderRow}>
                                {GENDER_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.genderBtn,
                                            gender === option.value && styles.genderBtnActive,
                                        ]}
                                        onPress={() => setGender(option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.genderText,
                                                gender === option.value && styles.genderTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Birth Date */}
                        <View style={styles.field}>
                            <Text style={styles.label}>תאריך לידה</Text>
                            <TouchableOpacity
                                style={styles.dateBtn}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.dateText}>
                                    {birthDate.toLocaleDateString('he-IL')}
                                </Text>
                                <Calendar size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={birthDate}
                                mode="date"
                                display="default"
                                maximumDate={new Date()}
                                onChange={handleDateChange}
                            />
                        )}
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <Check size={20} color="#fff" />
                        <Text style={styles.saveBtnText}>שמור שינויים</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    closeBtn: {
        padding: 8,
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'right',
    },
    content: {
        padding: 20,
    },
    field: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        textAlign: 'right',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#111827',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    genderRow: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    genderBtn: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    genderBtnActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1',
    },
    genderText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    genderTextActive: {
        color: '#6366F1',
    },
    dateBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dateText: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    photoSection: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        paddingTop: 8,
    },
    photoContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    photo: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    photoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    photoHint: {
        marginTop: 12,
        fontSize: 13,
        color: '#6B7280',
    },
});
